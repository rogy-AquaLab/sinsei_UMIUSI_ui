import { type HttpBindings, upgradeWebSocket } from '@hono/node-server'
import {
  parseTerminalClientMessage,
  terminalTicketRequestSchema,
} from '@sinsei-umiusi/terminal-protocol'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { validator } from 'hono/validator'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { WebSocket } from 'ws'
import type { config as gatewayConfig } from './config.js'
import type { TerminalManager } from './terminalManager.js'
import type { TicketStore } from './tickets.js'

type GatewayConfig = Pick<
  typeof gatewayConfig,
  'allowedOrigins' | 'secureCookie' | 'ticketTtlMs' | 'maxTerminals'
>

type GatewayEnvironment = {
  Bindings: HttpBindings
  Variables: {
    clientToken: symbol
  }
}

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500

type TerminalManagerHandle = Pick<TerminalManager, 'handle' | 'closeAll'>

export type GatewayDependencies = {
  config: GatewayConfig
  ticketCookieName: string
  tickets: Pick<TicketStore, 'consume' | 'issue'>
  verifyPassword: (password: string) => Promise<boolean>
  createTerminalManager: (socket: WebSocket) => TerminalManagerHandle
}

const jsonError = (
  context: Context<GatewayEnvironment>,
  status: ErrorStatus,
  message: string,
) => context.json({ message }, status)

export const createGatewayApp = ({
  config,
  ticketCookieName,
  tickets,
  verifyPassword,
  createTerminalManager,
}: GatewayDependencies) => {
  const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 })
  const app = new Hono<GatewayEnvironment>()
  let activeClientToken: symbol | null = null

  const getClientAddress = (context: Context<GatewayEnvironment>) => {
    return context.env.incoming.socket.remoteAddress ?? 'unknown'
  }

  const releaseClient = (token: symbol) => {
    if (activeClientToken === token) {
      activeClientToken = null
    }
  }

  const isAuthenticationBlocked = async (clientAddress: string) =>
    ((await rateLimiter.get(clientAddress))?.remainingPoints ?? 1) <= 0

  const recordAuthenticationFailure = async (clientAddress: string) => {
    try {
      const state = await rateLimiter.consume(clientAddress)
      if (state.remainingPoints === 0) {
        await rateLimiter.block(clientAddress, 5 * 60)
      }
    } catch {
      await rateLimiter.block(clientAddress, 5 * 60)
    }
  }

  const hasAllowedOrigin = (context: Context<GatewayEnvironment>) => {
    const origin = context.req.header('origin')
    return Boolean(origin && config.allowedOrigins.has(origin))
  }

  const claimClient = createMiddleware<GatewayEnvironment>(
    async (context, next) => {
      if (context.req.header('upgrade')?.toLowerCase() !== 'websocket') {
        return jsonError(context, 404, 'Not found.')
      }
      if (!hasAllowedOrigin(context)) {
        return jsonError(context, 403, 'Origin is not allowed.')
      }
      if (activeClientToken) {
        return jsonError(context, 409, 'Another browser is using the terminal.')
      }

      const ticket = getCookie(context, ticketCookieName)
      const clientAddress = getClientAddress(context)
      if (!ticket || !tickets.consume(ticket, clientAddress)) {
        return jsonError(context, 401, 'Terminal authorization is required.')
      }

      const token = Symbol('terminal-client')
      activeClientToken = token

      context.set('clientToken', token)
      context.env.incoming.socket.once('close', () => {
        releaseClient(token)
      })

      try {
        await next()
      } catch (error) {
        releaseClient(token)
        throw error
      }
    },
  )

  const validateTicketRequest = validator('json', (value, context) => {
    const result = terminalTicketRequestSchema.safeParse(value)
    return result.success
      ? result.data
      : jsonError(context, 400, 'Password is required.')
  })

  app.use('/api/terminal/*', async (context, next) => {
    context.header('Cache-Control', 'no-store')
    context.header('X-Content-Type-Options', 'nosniff')
    await next()
  })

  app.post(
    '/api/terminal/tickets',
    bodyLimit({
      maxSize: 4096,
      onError: (context) => jsonError(context, 400, 'Invalid request.'),
    }),
    validateTicketRequest,
    async (context) => {
      if (!hasAllowedOrigin(context)) {
        return jsonError(context, 403, 'Origin is not allowed.')
      }

      const clientAddress = getClientAddress(context)
      if (activeClientToken) {
        return jsonError(context, 409, 'Another browser is using the terminal.')
      }
      if (await isAuthenticationBlocked(clientAddress)) {
        return jsonError(context, 429, 'Too many attempts. Try again later.')
      }

      const { password } = context.req.valid('json')
      if (!(await verifyPassword(password))) {
        await recordAuthenticationFailure(clientAddress)
        return jsonError(context, 401, 'Incorrect terminal password.')
      }

      await rateLimiter.delete(clientAddress)
      const ticket = tickets.issue(clientAddress)
      setCookie(context, ticketCookieName, ticket, {
        httpOnly: true,
        secure: config.secureCookie,
        sameSite: 'strict',
        path: '/',
        maxAge: Math.ceil(config.ticketTtlMs / 1000),
      })
      return context.body(null, 204)
    },
  )

  app.get('/api/terminal/health', (context) => {
    return context.json({
      status: 'ok',
      activeClient: activeClientToken !== null,
      maxTerminals: config.maxTerminals,
    })
  })

  app.get(
    '/api/terminal/ws',
    claimClient,
    upgradeWebSocket((context) => {
      const token = context.get('clientToken')
      let manager: TerminalManagerHandle | null = null

      const closeConnection = () => {
        manager?.closeAll()
        manager = null
        releaseClient(token)
      }

      return {
        onOpen(_event, socket) {
          const rawSocket = socket.raw as WebSocket | undefined
          if (!rawSocket) {
            closeConnection()
            socket.close(1011, 'Could not initialize the terminal connection')
            return
          }

          manager = createTerminalManager(rawSocket)
          socket.send(
            JSON.stringify({
              type: 'connection.ready',
              maxTerminals: config.maxTerminals,
            }),
          )
        },
        onMessage(event, socket) {
          if (typeof event.data !== 'string') {
            socket.close(1003, 'Binary messages are not supported')
            return
          }

          const message = parseTerminalClientMessage(event.data)
          if (!message) {
            socket.send(
              JSON.stringify({
                type: 'error',
                code: 'invalid_message',
                message: 'Invalid terminal message.',
              }),
            )
            return
          }
          manager?.handle(message)
        },
        onClose() {
          closeConnection()
        },
        onError(event, socket) {
          console.error('Terminal WebSocket error', event)
          closeConnection()
          socket.close(1011, 'Terminal connection failed')
        },
      }
    }),
  )

  app.notFound((context) => jsonError(context, 404, 'Not found.'))

  app.onError((error, context) => {
    if (error instanceof HTTPException && error.status < 500) {
      return jsonError(context, error.status as ErrorStatus, 'Invalid request.')
    }

    console.error('Terminal gateway request failed', error)
    return jsonError(context, 500, 'Internal server error.')
  })

  return app
}

import { type HttpBindings, serve, upgradeWebSocket } from '@hono/node-server'
import {
  parseTerminalClientMessage,
  terminalTicketRequestSchema,
} from '@sinsei-umiusi/terminal-protocol'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { validator } from 'hono/validator'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { config, ticketCookieName } from './config.js'
import { verifyPasswordHash } from './password.js'
import { TerminalManager } from './terminalManager.js'
import { TicketStore } from './tickets.js'

type GatewayEnvironment = {
  Bindings: HttpBindings
}

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500

const tickets = new TicketStore(config.ticketTtlMs)
const rateLimiter = new RateLimiterMemory({ points: 5, duration: 60 })
let activeClient = false

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

const getClientAddress = (context: Context<GatewayEnvironment>) => {
  const forwarded = context.req.header('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return context.env.incoming.socket.remoteAddress ?? 'unknown'
}

const hasAllowedOrigin = (context: Context<GatewayEnvironment>) => {
  const origin = context.req.header('origin')
  return Boolean(origin && config.allowedOrigins.has(origin))
}

const jsonError = (
  context: Context<GatewayEnvironment>,
  status: ErrorStatus,
  message: string,
) => context.json({ message }, status)

const verifyPassword = async (password: string) => {
  if (config.passwordHash) {
    return await verifyPasswordHash(password, config.passwordHash)
  }
  return password === config.password
}

const claimClient = createMiddleware<GatewayEnvironment>(
  async (context, next) => {
    if (context.req.header('upgrade')?.toLowerCase() !== 'websocket') {
      return jsonError(context, 404, 'Not found.')
    }
    if (!hasAllowedOrigin(context)) {
      return jsonError(context, 403, 'Origin is not allowed.')
    }
    if (activeClient) {
      return jsonError(context, 409, 'Another browser is using the terminal.')
    }

    const ticket = getCookie(context, ticketCookieName)
    const clientAddress = getClientAddress(context)
    if (!ticket || !tickets.consume(ticket, clientAddress)) {
      return jsonError(context, 401, 'Terminal authorization is required.')
    }

    activeClient = true
    context.env.incoming.socket.once('close', () => {
      activeClient = false
    })
    await next()
  },
)

const app = new Hono<GatewayEnvironment>()

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
    if (activeClient) {
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
    context.header('Cache-Control', 'no-store')
    return context.body(null, 204)
  },
)

app.get('/api/terminal/health', (context) => {
  return context.json({
    status: 'ok',
    activeClient,
    maxTerminals: config.maxTerminals,
  })
})

app.get(
  '/api/terminal/ws',
  claimClient,
  upgradeWebSocket(() => {
    let manager: TerminalManager | null = null

    return {
      onOpen(_event, socket) {
        const rawSocket = socket.raw as WebSocket | undefined
        if (!rawSocket) {
          socket.close(1011, 'Could not initialize the terminal connection')
          return
        }

        manager = new TerminalManager(rawSocket)
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
        manager?.closeAll()
      },
      onError(event, socket) {
        console.error('Terminal WebSocket error', event)
        manager?.closeAll()
        socket.close(1011, 'Terminal connection failed')
      },
    }
  }),
)

app.notFound((context) => jsonError(context, 404, 'Not found.'))

const webSocketServer = new WebSocketServer({
  noServer: true,
  maxPayload: config.maxPayloadBytes,
  perMessageDeflate: false,
})

const server = serve(
  {
    fetch: app.fetch,
    hostname: config.host,
    port: config.port,
    websocket: { server: webSocketServer },
  },
  () => {
    console.log(
      `Terminal gateway listening on http://${config.host}:${config.port}`,
    )
    console.log(`Allowed origins: ${[...config.allowedOrigins].join(', ')}`)
    if (config.password) {
      console.warn(
        'Using plaintext TERMINAL_PASSWORD for local development. Do not use it in production.',
      )
    }
  },
)

const shutdown = () => {
  for (const client of webSocketServer.clients) {
    client.close(1001, 'Gateway shutting down')
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { parse as parseCookie, serialize as serializeCookie } from 'cookie'
import { WebSocketServer } from 'ws'
import { config, ticketCookieName } from './config.js'
import { verifyPasswordHash } from './password.js'
import { parseClientMessage } from './protocol.js'
import { AuthenticationRateLimiter } from './rateLimiter.js'
import { TerminalManager } from './terminalManager.js'
import { TicketStore } from './tickets.js'

const tickets = new TicketStore(config.ticketTtlMs)
const rateLimiter = new AuthenticationRateLimiter()
let activeClient = false

const getClientAddress = (request: IncomingMessage) => {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.socket.remoteAddress ?? 'unknown'
}

const hasAllowedOrigin = (request: IncomingMessage) => {
  const origin = request.headers.origin
  return typeof origin === 'string' && config.allowedOrigins.has(origin)
}

const sendJson = (
  response: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) => {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  })
  response.end(JSON.stringify(body))
}

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = []
  let length = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > 4096) throw new Error('request_too_large')
    chunks.push(buffer)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

const verifyPassword = async (password: string) => {
  if (config.passwordHash) {
    return await verifyPasswordHash(password, config.passwordHash)
  }
  return password === config.password
}

const handleTicketRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
) => {
  if (!hasAllowedOrigin(request)) {
    sendJson(response, 403, { message: 'Origin is not allowed.' })
    return
  }

  const clientAddress = getClientAddress(request)
  if (activeClient) {
    sendJson(response, 409, {
      message: 'Another browser is using the terminal.',
    })
    return
  }
  if (rateLimiter.isBlocked(clientAddress)) {
    sendJson(response, 429, { message: 'Too many attempts. Try again later.' })
    return
  }

  let body: unknown
  try {
    body = await readJsonBody(request)
  } catch {
    sendJson(response, 400, { message: 'Invalid request.' })
    return
  }

  const password =
    typeof body === 'object' &&
    body !== null &&
    'password' in body &&
    typeof body.password === 'string'
      ? body.password
      : null

  if (!password || password.length > 1024) {
    sendJson(response, 400, { message: 'Password is required.' })
    return
  }

  if (!(await verifyPassword(password))) {
    rateLimiter.recordFailure(clientAddress)
    sendJson(response, 401, { message: 'Incorrect terminal password.' })
    return
  }

  rateLimiter.clear(clientAddress)
  const ticket = tickets.issue(clientAddress)
  const cookie = serializeCookie(ticketCookieName, ticket, {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.ceil(config.ticketTtlMs / 1000),
  })
  response.writeHead(204, {
    'Set-Cookie': cookie,
    'Cache-Control': 'no-store',
  })
  response.end()
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://terminal-gateway.local')

  if (request.method === 'POST' && url.pathname === '/api/terminal/tickets') {
    await handleTicketRequest(request, response)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/terminal/health') {
    sendJson(response, 200, {
      status: 'ok',
      activeClient,
      maxTerminals: config.maxTerminals,
    })
    return
  }

  sendJson(response, 404, { message: 'Not found.' })
})

const webSocketServer = new WebSocketServer({
  noServer: true,
  maxPayload: config.maxPayloadBytes,
  perMessageDeflate: false,
})

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url ?? '/', 'http://terminal-gateway.local')
  if (url.pathname !== '/api/terminal/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  if (!hasAllowedOrigin(request)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  if (activeClient) {
    socket.write('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }

  const cookies = parseCookie(request.headers.cookie ?? '')
  const ticket = cookies[ticketCookieName]
  const clientAddress = getClientAddress(request)
  if (!ticket || !tickets.consume(ticket, clientAddress)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }

  activeClient = true
  try {
    webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
      webSocketServer.emit('connection', webSocket, request)
    })
  } catch (error) {
    activeClient = false
    socket.destroy()
    console.error('WebSocket upgrade failed', error)
  }
})

webSocketServer.on('connection', (socket) => {
  const manager = new TerminalManager(socket)
  let released = false

  const releaseClient = () => {
    if (released) return
    released = true
    manager.closeAll()
    activeClient = false
  }

  socket.send(
    JSON.stringify({
      type: 'connection.ready',
      maxTerminals: config.maxTerminals,
    }),
  )

  socket.on('message', (data, isBinary) => {
    if (isBinary) {
      socket.close(1003, 'Binary messages are not supported')
      return
    }

    const message = parseClientMessage(data.toString('utf8'))
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
    manager.handle(message)
  })

  socket.on('close', () => {
    releaseClient()
  })

  socket.on('error', (error) => {
    console.error('Terminal WebSocket error', error)
    releaseClient()
  })
})

server.listen(config.port, config.host, () => {
  console.log(
    `Terminal gateway listening on http://${config.host}:${config.port}`,
  )
  console.log(`Allowed origins: ${[...config.allowedOrigins].join(', ')}`)
  if (config.password) {
    console.warn(
      'Using plaintext TERMINAL_PASSWORD for local development. Do not use it in production.',
    )
  }
})

const shutdown = () => {
  for (const client of webSocketServer.clients) {
    client.close(1001, 'Gateway shutting down')
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { createGatewayApp } from './app.js'
import { config, ticketCookieName } from './config.js'
import { verifyPasswordHash } from './password.js'
import { TerminalManager } from './terminalManager.js'
import { TicketStore } from './tickets.js'

const verifyPassword = async (password: string) => {
  if (config.passwordHash) {
    return await verifyPasswordHash(password, config.passwordHash)
  }
  return password === config.password
}

const app = createGatewayApp({
  config,
  ticketCookieName,
  tickets: new TicketStore(config.ticketTtlMs),
  verifyPassword,
  createTerminalManager: (socket) => new TerminalManager(socket),
})

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

let shuttingDown = false

const shutdown = () => {
  if (shuttingDown) return
  shuttingDown = true

  for (const client of webSocketServer.clients) {
    client.close(1001, 'Gateway shutting down')
  }
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

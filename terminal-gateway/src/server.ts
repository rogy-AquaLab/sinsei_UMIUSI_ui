import { websocket } from 'hono/bun'
import { createGatewayApp } from './app'
import { config, ticketCookieName } from './config'
import { verifyPasswordHash } from './password'
import { TerminalManager } from './terminalManager'
import { TicketStore } from './tickets'

const verifyPassword = async (password: string) => {
  if (config.passwordHash) {
    return verifyPasswordHash(password, config.passwordHash)
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

const server = Bun.serve({
  hostname: config.host,
  port: config.port,
  fetch: (request, bunServer) => app.fetch(request, bunServer),
  websocket: {
    ...websocket,
    maxPayloadLength: config.maxPayloadBytes,
    backpressureLimit: config.maxBufferedBytes,
    closeOnBackpressureLimit: true,
    perMessageDeflate: false,
    idleTimeout: 0,
  },
})

console.log(`Terminal gateway listening on ${server.url}`)
console.log(`Allowed origins: ${[...config.allowedOrigins].join(', ')}`)
if (config.password) {
  console.warn(
    'Using plaintext TERMINAL_PASSWORD for local development. Do not use it in production.',
  )
}

let shuttingDown = false

const shutdown = async () => {
  if (shuttingDown) return
  shuttingDown = true

  await server.stop(true)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

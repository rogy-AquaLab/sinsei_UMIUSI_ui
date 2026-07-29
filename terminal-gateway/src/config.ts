import { homedir, platform } from 'node:os'

const parseInteger = (
  value: string | undefined,
  fallback: number,
  minimum: number,
) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

const defaultShell = () => {
  if (process.env.SHELL) return process.env.SHELL
  return platform() === 'darwin' ? '/bin/zsh' : '/bin/bash'
}

const allowedOrigins = (
  process.env.TERMINAL_ALLOWED_ORIGINS ??
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (!process.env.TERMINAL_PASSWORD && !process.env.TERMINAL_PASSWORD_HASH) {
  throw new Error(
    'Set TERMINAL_PASSWORD_HASH, or TERMINAL_PASSWORD for local development.',
  )
}

if (process.env.NODE_ENV === 'production' && process.env.TERMINAL_PASSWORD) {
  throw new Error(
    'TERMINAL_PASSWORD is only for local development. Use TERMINAL_PASSWORD_HASH in production.',
  )
}

export const config = {
  host: process.env.TERMINAL_HOST ?? '127.0.0.1',
  port: parseInteger(process.env.TERMINAL_PORT, 3001, 1),
  allowedOrigins: new Set(allowedOrigins),
  password: process.env.TERMINAL_PASSWORD,
  passwordHash: process.env.TERMINAL_PASSWORD_HASH,
  secureCookie: parseBoolean(
    process.env.TERMINAL_SECURE_COOKIE,
    process.env.NODE_ENV === 'production',
  ),
  ticketTtlMs: parseInteger(process.env.TERMINAL_TICKET_TTL_MS, 30_000, 1_000),
  maxTerminals: parseInteger(process.env.TERMINAL_MAX_TABS, 6, 1),
  maxPayloadBytes: parseInteger(
    process.env.TERMINAL_MAX_PAYLOAD_BYTES,
    64 * 1024,
    1024,
  ),
  maxBufferedBytes: parseInteger(
    process.env.TERMINAL_MAX_BUFFERED_BYTES,
    1024 * 1024,
    64 * 1024,
  ),
  shell: process.env.TERMINAL_SHELL ?? defaultShell(),
  shellCwd: process.env.TERMINAL_CWD ?? homedir(),
} as const

export const ticketCookieName = config.secureCookie
  ? '__Host-terminal-ticket'
  : 'terminal-ticket'

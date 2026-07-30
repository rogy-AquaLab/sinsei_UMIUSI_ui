import { describe, expect, it } from 'bun:test'
import { createGatewayApp } from '../src/app'

const bindings = (remoteAddress = '127.0.0.1') => ({
  requestIP: () => ({
    address: remoteAddress,
    family: 'IPv4',
    port: 12345,
  }),
})

const setup = ({
  passwordIsValid = true,
}: {
  passwordIsValid?: boolean
} = {}) => {
  const issuedFor: string[] = []
  const app = createGatewayApp({
    config: {
      allowedOrigins: new Set(['http://localhost:5173']),
      secureCookie: false,
      ticketTtlMs: 30_000,
      maxTerminals: 6,
    },
    ticketCookieName: 'terminal-ticket',
    tickets: {
      issue(clientAddress) {
        issuedFor.push(clientAddress)
        return 'issued-ticket'
      },
      consume() {
        return false
      },
    },
    verifyPassword: async () => passwordIsValid,
    createTerminalManager() {
      throw new Error('WebSocket manager should not be created in HTTP tests')
    },
  })

  const requestTicket = (body: string, headers: Record<string, string> = {}) =>
    app.request(
      '/api/terminal/tickets',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:5173',
          ...headers,
        },
        body,
      },
      bindings(),
    )

  return { app, issuedFor, requestTicket }
}

describe('terminal gateway app', () => {
  it('issues a secure, single-purpose ticket cookie', async () => {
    const { issuedFor, requestTicket } = setup()

    const response = await requestTicket(
      JSON.stringify({ password: 'correct-password' }),
    )

    expect(response.status).toBe(204)
    expect(issuedFor).toEqual(['127.0.0.1'])
    expect(response.headers.get('set-cookie') ?? '').toMatch(
      /^terminal-ticket=issued-ticket;/,
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('rejects an incorrect password', async () => {
    const { issuedFor, requestTicket } = setup({
      passwordIsValid: false,
    })

    const response = await requestTicket(
      JSON.stringify({ password: 'wrong-password' }),
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      message: 'Incorrect terminal password.',
    })
    expect(issuedFor).toEqual([])
  })

  it('blocks a client after five authentication failures', async () => {
    const { requestTicket } = setup({ passwordIsValid: false })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await requestTicket(
        JSON.stringify({ password: 'wrong-password' }),
      )
      expect(response.status).toBe(401)
    }

    const blockedResponse = await requestTicket(
      JSON.stringify({ password: 'wrong-password' }),
    )
    expect(blockedResponse.status).toBe(429)
  })

  it('returns the common JSON error shape for malformed JSON', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket('{')

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Invalid request.' })
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('rejects oversized request bodies with the common JSON error shape', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket(
      JSON.stringify({ password: 'a'.repeat(4_096) }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ message: 'Invalid request.' })
  })

  it('ignores forwarded addresses', async () => {
    const gateway = setup()
    await gateway.requestTicket(JSON.stringify({ password: 'correct' }), {
      'x-forwarded-for': '203.0.113.10',
    })
    expect(gateway.issuedFor).toEqual(['127.0.0.1'])
  })

  it('rejects requests from other origins', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket(
      JSON.stringify({ password: 'correct' }),
      { origin: 'https://example.com' },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      message: 'Origin is not allowed.',
    })
  })
})

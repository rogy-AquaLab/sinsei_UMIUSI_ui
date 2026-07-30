import assert from 'node:assert/strict'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, it } from 'node:test'
import type { HttpBindings } from '@hono/node-server'
import { createGatewayApp } from '../src/app.js'

const bindings = (remoteAddress = '127.0.0.1'): HttpBindings =>
  ({
    incoming: {
      socket: { remoteAddress },
    } as IncomingMessage,
    outgoing: {} as ServerResponse,
  }) satisfies HttpBindings

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

    assert.equal(response.status, 204)
    assert.deepEqual(issuedFor, ['127.0.0.1'])
    assert.match(
      response.headers.get('set-cookie') ?? '',
      /^terminal-ticket=issued-ticket;/,
    )
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  })

  it('rejects an incorrect password', async () => {
    const { issuedFor, requestTicket } = setup({
      passwordIsValid: false,
    })

    const response = await requestTicket(
      JSON.stringify({ password: 'wrong-password' }),
    )

    assert.equal(response.status, 401)
    assert.deepEqual(await response.json(), {
      message: 'Incorrect terminal password.',
    })
    assert.deepEqual(issuedFor, [])
  })

  it('blocks a client after five authentication failures', async () => {
    const { requestTicket } = setup({ passwordIsValid: false })

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await requestTicket(
        JSON.stringify({ password: 'wrong-password' }),
      )
      assert.equal(response.status, 401)
    }

    const blockedResponse = await requestTicket(
      JSON.stringify({ password: 'wrong-password' }),
    )
    assert.equal(blockedResponse.status, 429)
  })

  it('returns the common JSON error shape for malformed JSON', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket('{')

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { message: 'Invalid request.' })
    assert.equal(response.headers.get('cache-control'), 'no-store')
  })

  it('rejects oversized request bodies with the common JSON error shape', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket(
      JSON.stringify({ password: 'a'.repeat(4_096) }),
    )

    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { message: 'Invalid request.' })
  })

  it('ignores forwarded addresses', async () => {
    const gateway = setup()
    await gateway.requestTicket(JSON.stringify({ password: 'correct' }), {
      'x-forwarded-for': '203.0.113.10',
    })
    assert.deepEqual(gateway.issuedFor, ['127.0.0.1'])
  })

  it('rejects requests from other origins', async () => {
    const { requestTicket } = setup()

    const response = await requestTicket(
      JSON.stringify({ password: 'correct' }),
      { origin: 'https://example.com' },
    )

    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), {
      message: 'Origin is not allowed.',
    })
  })
})

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { TicketStore } from '../src/tickets.js'

describe('TicketStore', () => {
  it('issues single-use tickets bound to a client address', () => {
    const tickets = new TicketStore(1_000, () => 100)
    const ticket = tickets.issue('client-a')

    assert.equal(tickets.consume(ticket, 'client-a'), true)
    assert.equal(tickets.consume(ticket, 'client-a'), false)
  })

  it('rejects expired tickets', () => {
    let now = 100
    const tickets = new TicketStore(1_000, () => now)
    const ticket = tickets.issue('client-a')

    now = 1_100

    assert.equal(tickets.consume(ticket, 'client-a'), false)
  })

  it('consumes a ticket when the client address does not match', () => {
    const tickets = new TicketStore(1_000, () => 100)
    const ticket = tickets.issue('client-a')

    assert.equal(tickets.consume(ticket, 'client-b'), false)
    assert.equal(tickets.consume(ticket, 'client-a'), false)
  })
})

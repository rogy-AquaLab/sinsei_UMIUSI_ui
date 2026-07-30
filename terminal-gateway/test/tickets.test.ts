import { describe, expect, it } from 'bun:test'
import { TicketStore } from '../src/tickets'

describe('TicketStore', () => {
  it('issues single-use tickets bound to a client address', () => {
    const tickets = new TicketStore(1_000, () => 100)
    const ticket = tickets.issue('client-a')

    expect(tickets.consume(ticket, 'client-a')).toBe(true)
    expect(tickets.consume(ticket, 'client-a')).toBe(false)
  })

  it('rejects expired tickets', () => {
    let now = 100
    const tickets = new TicketStore(1_000, () => now)
    const ticket = tickets.issue('client-a')

    now = 1_100

    expect(tickets.consume(ticket, 'client-a')).toBe(false)
  })

  it('consumes a ticket when the client address does not match', () => {
    const tickets = new TicketStore(1_000, () => 100)
    const ticket = tickets.issue('client-a')

    expect(tickets.consume(ticket, 'client-b')).toBe(false)
    expect(tickets.consume(ticket, 'client-a')).toBe(false)
  })
})

import { createHash, randomBytes } from 'node:crypto'

type TicketRecord = {
  clientAddress: string
  expiresAt: number
}

export class TicketStore {
  readonly #tickets = new Map<string, TicketRecord>()

  constructor(private readonly ttlMs: number) {}

  issue(clientAddress: string) {
    this.prune()
    const ticket = randomBytes(32).toString('base64url')
    this.#tickets.set(this.hash(ticket), {
      clientAddress,
      expiresAt: Date.now() + this.ttlMs,
    })
    return ticket
  }

  consume(ticket: string, clientAddress: string) {
    this.prune()
    const ticketHash = this.hash(ticket)
    const record = this.#tickets.get(ticketHash)
    this.#tickets.delete(ticketHash)

    return Boolean(
      record &&
        record.expiresAt > Date.now() &&
        record.clientAddress === clientAddress,
    )
  }

  private hash(ticket: string) {
    return createHash('sha256').update(ticket).digest('base64url')
  }

  private prune() {
    const now = Date.now()
    for (const [ticket, record] of this.#tickets) {
      if (record.expiresAt <= now) this.#tickets.delete(ticket)
    }
  }
}

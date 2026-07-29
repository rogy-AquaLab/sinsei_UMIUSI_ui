type AttemptRecord = {
  attempts: number[]
  blockedUntil: number
}

export class AuthenticationRateLimiter {
  readonly #records = new Map<string, AttemptRecord>()

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 60_000,
    private readonly blockMs = 5 * 60_000,
  ) {}

  isBlocked(clientAddress: string) {
    const record = this.#records.get(clientAddress)
    if (!record) return false

    if (record.blockedUntil > Date.now()) return true
    this.prune(record)
    return false
  }

  recordFailure(clientAddress: string) {
    const record = this.#records.get(clientAddress) ?? {
      attempts: [],
      blockedUntil: 0,
    }
    this.prune(record)
    record.attempts.push(Date.now())

    if (record.attempts.length >= this.maxAttempts) {
      record.blockedUntil = Date.now() + this.blockMs
      record.attempts = []
    }

    this.#records.set(clientAddress, record)
  }

  clear(clientAddress: string) {
    this.#records.delete(clientAddress)
  }

  private prune(record: AttemptRecord) {
    const cutoff = Date.now() - this.windowMs
    record.attempts = record.attempts.filter((attempt) => attempt > cutoff)
    if (record.blockedUntil <= Date.now()) record.blockedUntil = 0
  }
}

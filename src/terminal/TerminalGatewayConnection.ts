import {
  isTerminalScopedMessage,
  parseTerminalServerMessage,
  type TerminalClientMessage,
  type TerminalScopedMessage,
} from '@sinsei-umiusi/terminal-protocol'
import type { TerminalConnectionState } from '@/terminal/connectionState'

type TerminalListener = (message: TerminalScopedMessage) => void

type ConnectionAttempt = {
  controller: AbortController
  socket: WebSocket | null
  readyTimeout: number | null
  cancel: (() => void) | null
}

type TerminalGatewayConnectionOptions = {
  onStateChange: (state: TerminalConnectionState) => void
  onErrorChange: (error: string | null) => void
  onMaxTerminalsChange: (maxTerminals: number) => void
}

const connectionReadyTimeoutMs = 10_000

const readErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { message?: unknown }
    if (typeof data.message === 'string') {
      return data.message
    }
  } catch {
    // Fall back to a status-based message below.
  }

  if (response.status === 401) return 'Incorrect terminal password.'
  if (response.status === 409) return 'Another browser is using the terminal.'
  if (response.status === 429) return 'Too many attempts. Try again later.'
  return 'Could not authorize the terminal.'
}

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/terminal/ws`
}

const closeSocket = (socket: WebSocket | null) => {
  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    socket.close(1000, 'Disconnected by user')
  }
}

export class TerminalGatewayConnection {
  readonly #options: TerminalGatewayConnectionOptions
  readonly #listeners = new Map<string, Set<TerminalListener>>()
  #socket: WebSocket | null = null
  #connectionAttempt: ConnectionAttempt | null = null

  constructor(options: TerminalGatewayConnectionOptions) {
    this.#options = options
  }

  send(message: TerminalClientMessage) {
    if (this.#socket?.readyState !== WebSocket.OPEN) return false

    this.#socket.send(JSON.stringify(message))
    return true
  }

  disconnect() {
    this.#closeConnection()
    this.#options.onStateChange('disconnected')
  }

  async connect(password: string) {
    if (this.#connectionAttempt || this.#socket) return false

    const attempt: ConnectionAttempt = {
      controller: new AbortController(),
      socket: null,
      readyTimeout: null,
      cancel: null,
    }
    this.#connectionAttempt = attempt
    this.#options.onErrorChange(null)
    this.#options.onStateChange('authorizing')

    let response: Response
    try {
      response = await fetch('/api/terminal/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
        signal: attempt.controller.signal,
      })
    } catch {
      if (this.#connectionAttempt !== attempt) return false

      this.#connectionAttempt = null
      this.#options.onErrorChange('The terminal gateway is unavailable.')
      this.#options.onStateChange('disconnected')
      return false
    }

    if (this.#connectionAttempt !== attempt) return false

    if (!response.ok) {
      const errorMessage = await readErrorMessage(response)
      if (this.#connectionAttempt !== attempt) return false

      this.#connectionAttempt = null
      this.#options.onErrorChange(errorMessage)
      this.#options.onStateChange('disconnected')
      return false
    }

    this.#options.onStateChange('connecting')

    let socket: WebSocket
    try {
      socket = new WebSocket(getWebSocketUrl())
    } catch {
      if (this.#connectionAttempt !== attempt) return false

      this.#connectionAttempt = null
      this.#options.onErrorChange('Could not open the terminal connection.')
      this.#options.onStateChange('disconnected')
      return false
    }

    attempt.socket = socket
    this.#socket = socket

    return await new Promise<boolean>((resolve) => {
      let settled = false

      const settle = (connected: boolean) => {
        if (settled) return
        settled = true
        attempt.cancel = null
        if (attempt.readyTimeout !== null) {
          window.clearTimeout(attempt.readyTimeout)
          attempt.readyTimeout = null
        }
        if (this.#connectionAttempt === attempt) {
          this.#connectionAttempt = null
        }
        resolve(connected)
      }
      attempt.cancel = () => settle(false)

      attempt.readyTimeout = window.setTimeout(() => {
        if (
          settled ||
          this.#connectionAttempt !== attempt ||
          this.#socket !== socket
        ) {
          return
        }

        this.#socket = null
        this.#options.onErrorChange('The terminal connection timed out.')
        this.#options.onStateChange('disconnected')
        settle(false)
        closeSocket(socket)
      }, connectionReadyTimeoutMs)

      socket.addEventListener('message', (event) => {
        if (this.#socket !== socket || typeof event.data !== 'string') return

        const message = parseTerminalServerMessage(event.data)
        if (!message) return

        if (message.type === 'connection.ready') {
          if (settled) return

          this.#options.onMaxTerminalsChange(message.maxTerminals)
          this.#options.onStateChange('connected')
          settle(true)
          return
        }

        if (message.type === 'error' && !message.terminalId) {
          this.#options.onErrorChange(message.message)
        }

        if (isTerminalScopedMessage(message)) {
          const listeners = this.#listeners.get(message.terminalId)
          if (!listeners) return
          for (const listener of listeners) listener(message)
        }
      })

      socket.addEventListener('close', (event) => {
        if (this.#socket === socket) {
          this.#socket = null
          this.#options.onStateChange('disconnected')
          if (event.code !== 1000) {
            this.#options.onErrorChange(
              event.reason || 'The terminal connection ended unexpectedly.',
            )
          }
        }
        settle(false)
      })

      socket.addEventListener('error', () => {
        if (!settled && this.#connectionAttempt === attempt) {
          this.#options.onErrorChange('Could not open the terminal connection.')
        }
      })
    })
  }

  subscribeTerminal(terminalId: string, listener: TerminalListener) {
    const listeners =
      this.#listeners.get(terminalId) ?? new Set<TerminalListener>()
    listeners.add(listener)
    this.#listeners.set(terminalId, listeners)

    return () => {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.#listeners.delete(terminalId)
      }
    }
  }

  dispose() {
    this.#closeConnection()
    this.#listeners.clear()
  }

  #closeConnection() {
    const attempt = this.#connectionAttempt
    this.#connectionAttempt = null
    attempt?.controller.abort()
    attempt?.cancel?.()

    const activeSocket = this.#socket
    this.#socket = null
    closeSocket(attempt?.socket ?? null)
    if (activeSocket !== attempt?.socket) {
      closeSocket(activeSocket)
    }
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  TerminalClientMessage,
  TerminalConnectionState,
  TerminalScopedMessage,
  TerminalServerMessage,
} from '@/types/terminal'

type TerminalListener = (message: TerminalScopedMessage) => void

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

export const useTerminalSession = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const listenersRef = useRef(new Map<string, Set<TerminalListener>>())
  const [state, setState] = useState<TerminalConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [maxTerminals, setMaxTerminals] = useState(1)

  const send = useCallback((message: TerminalClientMessage) => {
    const socket = socketRef.current
    if (socket?.readyState !== WebSocket.OPEN) return false

    socket.send(JSON.stringify(message))
    return true
  }, [])

  const disconnect = useCallback(() => {
    const socket = socketRef.current
    socketRef.current = null
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close(1000, 'Disconnected by user')
    }
    setState('disconnected')
  }, [])

  const connect = useCallback(
    async (password: string) => {
      if (state !== 'disconnected') return false

      setError(null)
      setState('authorizing')

      let response: Response
      try {
        response = await fetch('/api/terminal/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ password }),
        })
      } catch {
        setError('The terminal gateway is unavailable.')
        setState('disconnected')
        return false
      }

      if (!response.ok) {
        setError(await readErrorMessage(response))
        setState('disconnected')
        return false
      }

      setState('connecting')

      return await new Promise<boolean>((resolve) => {
        const socket = new WebSocket(getWebSocketUrl())
        socketRef.current = socket
        let settled = false

        const settle = (connected: boolean) => {
          if (settled) return
          settled = true
          resolve(connected)
        }

        socket.addEventListener('message', (event) => {
          if (typeof event.data !== 'string') return

          let message: TerminalServerMessage
          try {
            message = JSON.parse(event.data) as TerminalServerMessage
          } catch {
            return
          }

          if (message.type === 'connection.ready') {
            setMaxTerminals(message.maxTerminals)
            setState('connected')
            settle(true)
            return
          }

          if (message.type === 'error' && !message.terminalId) {
            setError(message.message)
          }

          if ('terminalId' in message && message.terminalId) {
            const listeners = listenersRef.current.get(message.terminalId)
            if (!listeners) return
            for (const listener of listeners) listener(message)
          }
        })

        socket.addEventListener('close', (event) => {
          if (socketRef.current === socket) {
            socketRef.current = null
            setState('disconnected')
            if (event.code !== 1000) {
              setError(
                event.reason || 'The terminal connection ended unexpectedly.',
              )
            }
          }
          settle(false)
        })

        socket.addEventListener('error', () => {
          if (!settled) {
            setError('Could not open the terminal connection.')
          }
        })
      })
    },
    [state],
  )

  const subscribeTerminal = useCallback(
    (terminalId: string, listener: TerminalListener) => {
      const listeners =
        listenersRef.current.get(terminalId) ?? new Set<TerminalListener>()
      listeners.add(listener)
      listenersRef.current.set(terminalId, listeners)

      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          listenersRef.current.delete(terminalId)
        }
      }
    },
    [],
  )

  useEffect(() => disconnect, [disconnect])

  return {
    state,
    error,
    maxTerminals,
    connect,
    disconnect,
    send,
    subscribeTerminal,
  }
}

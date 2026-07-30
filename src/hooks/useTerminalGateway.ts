import type {
  TerminalClientMessage,
  TerminalScopedMessage,
} from '@sinsei-umiusi/terminal-protocol'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { TerminalConnectionState } from '@/terminal/connectionState'
import { TerminalGatewayConnection } from '@/terminal/TerminalGatewayConnection'

export const useTerminalGateway = () => {
  const [state, setState] = useState<TerminalConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [maxTerminals, setMaxTerminals] = useState(1)
  const connectionRef = useRef<TerminalGatewayConnection | null>(null)

  if (!connectionRef.current) {
    connectionRef.current = new TerminalGatewayConnection({
      onStateChange: setState,
      onErrorChange: setError,
      onMaxTerminalsChange: setMaxTerminals,
    })
  }
  const connection = connectionRef.current

  const connect = useCallback(
    (password: string) => connection.connect(password),
    [connection],
  )
  const disconnect = useCallback(() => connection.disconnect(), [connection])
  const send = useCallback(
    (message: TerminalClientMessage) => connection.send(message),
    [connection],
  )
  const subscribeTerminal = useCallback(
    (terminalId: string, listener: (message: TerminalScopedMessage) => void) =>
      connection.subscribeTerminal(terminalId, listener),
    [connection],
  )

  useEffect(() => () => connection.dispose(), [connection])

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

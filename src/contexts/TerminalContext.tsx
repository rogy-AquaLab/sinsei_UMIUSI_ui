import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useTerminalGateway } from '@/hooks/useTerminalGateway'
import type { TerminalConnectionState } from '@/terminal/connectionState'
import { XtermRegistry } from '@/terminal/XtermRegistry'

export type TerminalTab = {
  id: string
  title: string
}

type TerminalContextValue = {
  state: TerminalConnectionState
  error: string | null
  maxTerminals: number
  tabs: TerminalTab[]
  activeTerminalId: string | null
  connect: (password: string) => Promise<boolean>
  disconnect: () => void
  addTerminal: () => void
  closeTerminal: (terminalId: string) => void
  activateTerminal: (terminalId: string) => void
  attachTerminal: (terminalId: string, host: HTMLElement) => void
  detachTerminal: (terminalId: string, host: HTMLElement) => void
}

const TerminalContext = createContext<TerminalContextValue | null>(null)

const newTerminalId = () => uuidv4()

type TerminalUiState = {
  tabs: TerminalTab[]
  activeTerminalId: string | null
}

const emptyTerminalUiState: TerminalUiState = {
  tabs: [],
  activeTerminalId: null,
}

const TerminalProvider = ({ children }: PropsWithChildren) => {
  const gateway = useTerminalGateway()
  const [terminalUi, setTerminalUi] =
    useState<TerminalUiState>(emptyTerminalUiState)
  const createdInitialTerminalRef = useRef(false)

  const updateProcessName = useCallback(
    (terminalId: string, processName: string) => {
      setTerminalUi((current) => ({
        ...current,
        tabs: current.tabs.map((tab) =>
          tab.id === terminalId ? { ...tab, title: processName } : tab,
        ),
      }))
    },
    [],
  )

  const xtermRegistry = useMemo(
    () =>
      new XtermRegistry({
        send: gateway.send,
        subscribe: gateway.subscribeTerminal,
        onProcessName: updateProcessName,
      }),
    [gateway.send, gateway.subscribeTerminal, updateProcessName],
  )

  const addTerminal = useCallback(() => {
    const id = newTerminalId()
    setTerminalUi((current) => {
      if (current.tabs.length >= gateway.maxTerminals) return current

      return {
        tabs: [...current.tabs, { id, title: 'Starting…' }],
        activeTerminalId: id,
      }
    })
  }, [gateway.maxTerminals])

  const closeTerminal = useCallback(
    (terminalId: string) => {
      xtermRegistry.close(terminalId)
      setTerminalUi((current) => {
        const closingIndex = current.tabs.findIndex(
          (tab) => tab.id === terminalId,
        )
        if (closingIndex === -1) return current

        const remaining = current.tabs.filter((tab) => tab.id !== terminalId)
        if (current.activeTerminalId !== terminalId) {
          return { ...current, tabs: remaining }
        }

        const nextActive =
          remaining[Math.min(closingIndex, remaining.length - 1)] ?? null
        return {
          tabs: remaining,
          activeTerminalId: nextActive?.id ?? null,
        }
      })
    },
    [xtermRegistry],
  )

  const activateTerminal = useCallback((terminalId: string) => {
    setTerminalUi((current) => ({
      ...current,
      activeTerminalId: terminalId,
    }))
  }, [])

  const attachTerminal = useCallback(
    (terminalId: string, host: HTMLElement) => {
      xtermRegistry.attach(terminalId, host)
    },
    [xtermRegistry],
  )

  const detachTerminal = useCallback(
    (terminalId: string, host: HTMLElement) => {
      xtermRegistry.detach(terminalId, host)
    },
    [xtermRegistry],
  )

  const disconnect = useCallback(() => {
    xtermRegistry.closeAll(true)
    gateway.disconnect()
  }, [gateway.disconnect, xtermRegistry])

  useEffect(() => {
    if (gateway.state === 'connected' && !createdInitialTerminalRef.current) {
      createdInitialTerminalRef.current = true
      addTerminal()
    }

    if (gateway.state === 'disconnected') {
      createdInitialTerminalRef.current = false
      xtermRegistry.closeAll()
      setTerminalUi(emptyTerminalUiState)
    }
  }, [addTerminal, gateway.state, xtermRegistry])

  useEffect(() => () => xtermRegistry.closeAll(), [xtermRegistry])

  const contextValue = useMemo(
    () => ({
      state: gateway.state,
      error: gateway.error,
      maxTerminals: gateway.maxTerminals,
      tabs: terminalUi.tabs,
      activeTerminalId: terminalUi.activeTerminalId,
      connect: gateway.connect,
      disconnect,
      addTerminal,
      closeTerminal,
      activateTerminal,
      attachTerminal,
      detachTerminal,
    }),
    [
      gateway.state,
      gateway.error,
      gateway.maxTerminals,
      gateway.connect,
      terminalUi,
      disconnect,
      addTerminal,
      closeTerminal,
      activateTerminal,
      attachTerminal,
      detachTerminal,
    ],
  )

  return <TerminalContext value={contextValue}>{children}</TerminalContext>
}

export { TerminalContext, TerminalProvider }

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTerminalSession } from '@/hooks/useTerminalSession'
import { XtermRegistry } from '@/terminal/XtermRegistry'
import type { TerminalConnectionState } from '@/types/terminal'

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

const newTerminalId = () => crypto.randomUUID()

type TerminalUiState = {
  tabs: TerminalTab[]
  activeTerminalId: string | null
}

const emptyTerminalUiState: TerminalUiState = {
  tabs: [],
  activeTerminalId: null,
}

const TerminalProvider = ({ children }: PropsWithChildren) => {
  const session = useTerminalSession()
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
        send: session.send,
        subscribe: session.subscribeTerminal,
        onProcessName: updateProcessName,
      }),
    [session.send, session.subscribeTerminal, updateProcessName],
  )

  const addTerminal = useCallback(() => {
    const id = newTerminalId()
    setTerminalUi((current) => {
      if (current.tabs.length >= session.maxTerminals) return current

      return {
        tabs: [...current.tabs, { id, title: 'Starting…' }],
        activeTerminalId: id,
      }
    })
  }, [session.maxTerminals])

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
    session.disconnect()
  }, [session.disconnect, xtermRegistry])

  useEffect(() => {
    if (session.state === 'connected' && !createdInitialTerminalRef.current) {
      createdInitialTerminalRef.current = true
      addTerminal()
    }

    if (session.state === 'disconnected') {
      createdInitialTerminalRef.current = false
      xtermRegistry.closeAll()
      setTerminalUi(emptyTerminalUiState)
    }
  }, [addTerminal, session.state, xtermRegistry])

  useEffect(() => () => xtermRegistry.closeAll(), [xtermRegistry])

  const contextValue = useMemo(
    () => ({
      state: session.state,
      error: session.error,
      maxTerminals: session.maxTerminals,
      tabs: terminalUi.tabs,
      activeTerminalId: terminalUi.activeTerminalId,
      connect: session.connect,
      disconnect,
      addTerminal,
      closeTerminal,
      activateTerminal,
      attachTerminal,
      detachTerminal,
    }),
    [
      session.state,
      session.error,
      session.maxTerminals,
      session.connect,
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

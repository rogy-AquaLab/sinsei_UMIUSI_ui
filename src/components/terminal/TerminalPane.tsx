import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'
import type {
  TerminalClientMessage,
  TerminalScopedMessage,
} from '@/types/terminal'

type TerminalPaneProps = {
  terminalId: string
  active: boolean
  send: (message: TerminalClientMessage) => boolean
  subscribe: (
    terminalId: string,
    listener: (message: TerminalScopedMessage) => void,
  ) => () => void
  onProcessName: (terminalId: string, processName: string) => void
}

const fitTerminal = (terminal: Terminal, fitAddon: FitAddon) => {
  const dimensions = fitAddon.proposeDimensions()
  if (!dimensions) return

  terminal.resize(dimensions.cols, Math.max(2, dimensions.rows - 1))
}

const TerminalPane = ({
  terminalId,
  active,
  send,
  subscribe,
  onProcessName,
}: TerminalPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily:
        '"SFMono-Regular", "Cascadia Code", "Liberation Mono", Menlo, monospace',
      fontSize: 14,
      lineHeight: 1.15,
      scrollback: 10_000,
      theme: {
        background: '#111827',
        foreground: '#e5e7eb',
        cursor: '#f9fafb',
        selectionBackground: '#374151',
      },
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitTerminal(terminal, fitAddon)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    const unsubscribe = subscribe(terminalId, (message) => {
      if (message.type === 'terminal.output') {
        terminal.write(message.data)
      } else if (message.type === 'terminal.exited') {
        terminal.write(
          `\r\n\x1b[90m[process exited with code ${message.exitCode}]\x1b[0m\r\n`,
        )
      } else if (
        message.type === 'terminal.created' ||
        message.type === 'terminal.process'
      ) {
        onProcessName(terminalId, message.processName)
      } else if (message.type === 'error') {
        terminal.write(`\r\n\x1b[31m${message.message}\x1b[0m\r\n`)
      }
    })

    const inputSubscription = terminal.onData((data) => {
      send({ type: 'terminal.input', terminalId, data })
    })

    let resizeAnimationFrame: number | null = null
    const fitAndResize = () => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return

      fitTerminal(terminal, fitAddon)
      send({
        type: 'terminal.resize',
        terminalId,
        cols: terminal.cols,
        rows: terminal.rows,
      })
    }
    const resizeObserver = new ResizeObserver(() => {
      if (resizeAnimationFrame !== null) {
        window.cancelAnimationFrame(resizeAnimationFrame)
      }
      resizeAnimationFrame = window.requestAnimationFrame(fitAndResize)
    })
    resizeObserver.observe(container)

    send({
      type: 'terminal.create',
      terminalId,
      cols: terminal.cols,
      rows: terminal.rows,
    })

    return () => {
      send({ type: 'terminal.close', terminalId })
      unsubscribe()
      inputSubscription.dispose()
      resizeObserver.disconnect()
      if (resizeAnimationFrame !== null) {
        window.cancelAnimationFrame(resizeAnimationFrame)
      }
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [onProcessName, send, subscribe, terminalId])

  useEffect(() => {
    if (!active) return

    const animationFrame = window.requestAnimationFrame(() => {
      const terminal = terminalRef.current
      const fitAddon = fitAddonRef.current
      if (terminal && fitAddon) {
        fitTerminal(terminal, fitAddon)
        send({
          type: 'terminal.resize',
          terminalId,
          cols: terminal.cols,
          rows: terminal.rows,
        })
      }
      terminalRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [active, send, terminalId])

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden bg-[#111827] p-3 ${
        active ? 'visible' : 'invisible pointer-events-none'
      }`}
      aria-hidden={!active}
    />
  )
}

export default TerminalPane

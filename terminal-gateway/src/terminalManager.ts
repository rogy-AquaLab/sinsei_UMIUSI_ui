import { basename } from 'node:path'
import type {
  TerminalClientMessage,
  TerminalServerMessage,
} from '@sinsei-umiusi/terminal-protocol'
import type { IPty } from 'node-pty'
import * as pty from 'node-pty'
import type { WebSocket } from 'ws'
import { config } from './config.js'

const shellEnvironment = () => {
  const environment: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && !key.startsWith('TERMINAL_')) {
      environment[key] = value
    }
  }
  environment.TERM = 'xterm-256color'
  environment.COLORTERM = 'truecolor'
  return environment
}

type ManagedTerminal = {
  pty: IPty
  processName: string
  processPoller: NodeJS.Timeout
}

const fallbackProcessName = basename(config.shell)

const readProcessName = (terminal: IPty) => {
  try {
    const sanitizedProcess = [...terminal.process]
      .filter((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint >= 32 && codePoint !== 127
      })
      .join('')
    const executable = sanitizedProcess.trim().split(/\s+/, 1)[0]
    return executable ? basename(executable).slice(0, 64) : fallbackProcessName
  } catch {
    return fallbackProcessName
  }
}

export class TerminalManager {
  readonly #terminals = new Map<string, ManagedTerminal>()

  constructor(private readonly socket: WebSocket) {}

  handle(message: TerminalClientMessage) {
    switch (message.type) {
      case 'terminal.create':
        this.create(message.terminalId, message.cols, message.rows)
        break
      case 'terminal.input':
        this.#terminals.get(message.terminalId)?.pty.write(message.data)
        break
      case 'terminal.resize':
        this.resize(message.terminalId, message.cols, message.rows)
        break
      case 'terminal.close':
        this.close(message.terminalId)
        break
    }
  }

  closeAll() {
    for (const terminal of this.#terminals.values()) {
      clearInterval(terminal.processPoller)
      terminal.pty.kill()
    }
    this.#terminals.clear()
  }

  private create(terminalId: string, cols: number, rows: number) {
    if (this.#terminals.has(terminalId)) {
      this.sendError('terminal_exists', 'Terminal already exists.', terminalId)
      return
    }
    if (this.#terminals.size >= config.maxTerminals) {
      this.sendError(
        'terminal_limit',
        `A maximum of ${config.maxTerminals} terminals is allowed.`,
        terminalId,
      )
      return
    }

    let terminal: IPty
    try {
      terminal = pty.spawn(config.shell, ['-l'], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: config.shellCwd,
        env: shellEnvironment(),
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not start the shell.'
      this.sendError('spawn_failed', message, terminalId)
      return
    }

    const processName = readProcessName(terminal)
    const processPoller = setInterval(() => {
      const managedTerminal = this.#terminals.get(terminalId)
      if (!managedTerminal) return

      const nextProcessName = readProcessName(managedTerminal.pty)
      if (nextProcessName === managedTerminal.processName) return

      managedTerminal.processName = nextProcessName
      this.send({
        type: 'terminal.process',
        terminalId,
        processName: nextProcessName,
      })
    }, 500)
    processPoller.unref()

    this.#terminals.set(terminalId, {
      pty: terminal,
      processName,
      processPoller,
    })
    this.send({ type: 'terminal.created', terminalId, processName })

    terminal.onData((data) => {
      if (this.socket.bufferedAmount > config.maxBufferedBytes) {
        this.socket.close(1013, 'Terminal output exceeded the buffer limit')
        return
      }
      this.send({ type: 'terminal.output', terminalId, data })
    })

    terminal.onExit(({ exitCode, signal }) => {
      const managedTerminal = this.#terminals.get(terminalId)
      if (managedTerminal?.pty !== terminal) return
      clearInterval(managedTerminal.processPoller)
      this.#terminals.delete(terminalId)
      this.send({
        type: 'terminal.exited',
        terminalId,
        exitCode,
        signal,
      })
    })
  }

  private resize(terminalId: string, cols: number, rows: number) {
    const terminal = this.#terminals.get(terminalId)?.pty
    if (!terminal) return
    try {
      terminal.resize(cols, rows)
    } catch {
      this.sendError(
        'resize_failed',
        'Could not resize the terminal.',
        terminalId,
      )
    }
  }

  private close(terminalId: string) {
    const terminal = this.#terminals.get(terminalId)
    if (!terminal) return
    this.#terminals.delete(terminalId)
    clearInterval(terminal.processPoller)
    terminal.pty.kill()
  }

  private sendError(code: string, message: string, terminalId?: string) {
    this.send({ type: 'error', code, message, terminalId })
  }

  private send(message: TerminalServerMessage) {
    if (this.socket.readyState === this.socket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }
}

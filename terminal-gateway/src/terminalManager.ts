import { constants } from 'node:os'
import { basename } from 'node:path'
import type {
  TerminalClientMessage,
  TerminalServerMessage,
} from '@sinsei-umiusi/terminal-protocol'
import { config } from './config'

export type TerminalSocket = Pick<
  Bun.ServerWebSocket<unknown>,
  'readyState' | 'send' | 'close' | 'getBufferedAmount'
>

type ManagedTerminal = {
  terminal: Bun.Terminal
  process: Bun.Subprocess
  decoder: TextDecoder
  pendingInput: Uint8Array[]
}

const inputEncoder = new TextEncoder()
const processName = basename(config.shell)

const normalizedExit = (
  exitCode: number | null,
  signalCode: number | string | null,
) => {
  const signal =
    typeof signalCode === 'number'
      ? signalCode
      : signalCode
        ? constants.signals[signalCode as keyof typeof constants.signals]
        : undefined
  return {
    exitCode: exitCode ?? (signal ? 128 + signal : 1),
    signal,
  }
}

export class TerminalManager {
  readonly #terminals = new Map<string, ManagedTerminal>()

  constructor(private readonly socket: TerminalSocket) {}

  handle(message: TerminalClientMessage) {
    switch (message.type) {
      case 'terminal.create':
        this.create(message.terminalId, message.cols, message.rows)
        break
      case 'terminal.input':
        this.write(message.terminalId, message.data)
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
    for (const terminalId of [...this.#terminals.keys()]) {
      this.destroy(terminalId)
    }
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

    const decoder = new TextDecoder()
    const bufferedOutput: string[] = []
    let created = false
    let terminal: Bun.Terminal | null = null

    try {
      terminal = new Bun.Terminal({
        name: 'xterm-256color',
        cols,
        rows,
        data: (_terminal, data) => {
          const output = decoder.decode(data, { stream: true })
          if (!output) return
          if (!created) {
            bufferedOutput.push(output)
            return
          }
          this.sendOutput(terminalId, output)
        },
        drain: () => {
          this.flushInput(terminalId)
        },
      })

      const subprocess = Bun.spawn([config.shell, '-l'], {
        cwd: config.shellCwd,
        env: shellEnvironment(),
        terminal,
        onExit: (exitedProcess, exitCode, signalCode, error) => {
          this.handleExit(
            terminalId,
            exitedProcess,
            exitCode,
            signalCode,
            error,
          )
        },
      })

      this.#terminals.set(terminalId, {
        terminal,
        process: subprocess,
        decoder,
        pendingInput: [],
      })
      this.send({ type: 'terminal.created', terminalId, processName })
      created = true
      for (const output of bufferedOutput) {
        this.sendOutput(terminalId, output)
      }
    } catch (error) {
      terminal?.close()
      const message =
        error instanceof Error ? error.message : 'Could not start the shell.'
      this.sendError('spawn_failed', message, terminalId)
    }
  }

  private write(terminalId: string, data: string) {
    const managedTerminal = this.#terminals.get(terminalId)
    if (!managedTerminal) return

    managedTerminal.pendingInput.push(inputEncoder.encode(data))
    this.flushInput(terminalId)
  }

  private flushInput(terminalId: string) {
    const managedTerminal = this.#terminals.get(terminalId)
    if (!managedTerminal) return

    while (managedTerminal.pendingInput.length > 0) {
      const input = managedTerminal.pendingInput[0]
      if (!input) return

      const written = managedTerminal.terminal.write(input)
      if (written <= 0) return
      if (written < input.byteLength) {
        managedTerminal.pendingInput[0] = input.subarray(written)
        return
      }
      managedTerminal.pendingInput.shift()
    }
  }

  private resize(terminalId: string, cols: number, rows: number) {
    const terminal = this.#terminals.get(terminalId)?.terminal
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
    this.destroy(terminalId)
  }

  private destroy(terminalId: string) {
    const managedTerminal = this.#terminals.get(terminalId)
    if (!managedTerminal) return
    this.#terminals.delete(terminalId)

    try {
      managedTerminal.process.kill()
    } catch (error) {
      console.error(`Could not stop terminal process ${terminalId}`, error)
    } finally {
      managedTerminal.terminal.close()
    }
  }

  private handleExit(
    terminalId: string,
    subprocess: Bun.Subprocess,
    exitCode: number | null,
    signalCode: number | string | null,
    error?: Error,
  ) {
    const managedTerminal = this.#terminals.get(terminalId)
    if (managedTerminal?.process !== subprocess) return
    this.#terminals.delete(terminalId)

    const trailingOutput = managedTerminal.decoder.decode()
    if (trailingOutput) this.sendOutput(terminalId, trailingOutput)
    managedTerminal.terminal.close()

    if (error) {
      console.error(`Terminal process ${terminalId} failed`, error)
    }
    this.send({
      type: 'terminal.exited',
      terminalId,
      ...normalizedExit(exitCode, signalCode),
    })
  }

  private sendOutput(terminalId: string, data: string) {
    if (this.socket.getBufferedAmount() > config.maxBufferedBytes) {
      this.socket.close(1013, 'Terminal output exceeded the buffer limit')
      return
    }
    this.send({ type: 'terminal.output', terminalId, data })
  }

  private sendError(code: string, message: string, terminalId?: string) {
    this.send({ type: 'error', code, message, terminalId })
  }

  private send(message: TerminalServerMessage) {
    if (this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(message))
    }
  }
}

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

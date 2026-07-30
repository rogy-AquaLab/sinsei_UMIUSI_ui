import { describe, expect, it } from 'bun:test'
import type { TerminalServerMessage } from '@sinsei-umiusi/terminal-protocol'
import type { TerminalSocket } from '../src/terminalManager'

process.env.TERMINAL_PASSWORD ??= 'test-password'
process.env.TERMINAL_CWD = process.cwd()

const { TerminalManager } = await import('../src/terminalManager')

class TestSocket implements TerminalSocket {
  readyState: TerminalSocket['readyState'] = 1
  readonly messages: TerminalServerMessage[] = []
  closeCode: number | null = null

  send(data: Parameters<TerminalSocket['send']>[0]) {
    if (typeof data !== 'string') {
      throw new Error('TerminalManager must send text WebSocket messages')
    }
    this.messages.push(JSON.parse(data) as TerminalServerMessage)
    return data.length
  }

  close(code?: number) {
    this.closeCode = code ?? 1000
    this.readyState = 3
  }

  getBufferedAmount() {
    return 0
  }
}

const outputOf = (socket: TestSocket) =>
  socket.messages
    .filter(
      (
        message,
      ): message is Extract<
        TerminalServerMessage,
        { type: 'terminal.output' }
      > => message.type === 'terminal.output',
    )
    .map((message) => message.data)
    .join('')

const waitForOutput = async (socket: TestSocket, expected: string) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const output = outputOf(socket)
    if (output.includes(expected)) return output
    await Bun.sleep(20)
  }
  throw new Error(`Timed out waiting for terminal output: ${expected}`)
}

describe('TerminalManager with Bun.Terminal', () => {
  it('runs a shell, preserves UTF-8 output, and resizes the PTY', async () => {
    const socket = new TestSocket()
    const manager = new TerminalManager(socket)
    const terminalId = crypto.randomUUID()

    try {
      manager.handle({
        type: 'terminal.create',
        terminalId,
        cols: 80,
        rows: 24,
      })
      manager.handle({
        type: 'terminal.resize',
        terminalId,
        cols: 53,
        rows: 17,
      })
      manager.handle({
        type: 'terminal.input',
        terminalId,
        data: "printf '水中ロボット\\n'; stty size; echo __PTY_DONE__\n",
      })

      const output = await waitForOutput(socket, '17 53')

      expect(output).toContain('水中ロボット')
      expect(output).toContain('17 53')
      expect(socket.closeCode).toBeNull()
    } finally {
      manager.closeAll()
    }
  })
})

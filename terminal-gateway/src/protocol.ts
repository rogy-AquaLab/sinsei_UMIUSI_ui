export type ClientMessage =
  | {
      type: 'terminal.create'
      terminalId: string
      cols: number
      rows: number
    }
  | { type: 'terminal.input'; terminalId: string; data: string }
  | {
      type: 'terminal.resize'
      terminalId: string
      cols: number
      rows: number
    }
  | { type: 'terminal.close'; terminalId: string }

export type ServerMessage =
  | { type: 'connection.ready'; maxTerminals: number }
  | {
      type: 'terminal.created'
      terminalId: string
      processName: string
    }
  | {
      type: 'terminal.process'
      terminalId: string
      processName: string
    }
  | { type: 'terminal.output'; terminalId: string; data: string }
  | {
      type: 'terminal.exited'
      terminalId: string
      exitCode: number
      signal?: number
    }
  | {
      type: 'error'
      code: string
      message: string
      terminalId?: string
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isTerminalId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(value)

const isDimension = (value: unknown, maximum: number): value is number =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= 1 &&
  value <= maximum

export const parseClientMessage = (value: string): ClientMessage | null => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return null
  }
  if (!isRecord(parsed) || !isTerminalId(parsed.terminalId)) return null

  switch (parsed.type) {
    case 'terminal.create':
    case 'terminal.resize':
      if (!isDimension(parsed.cols, 300) || !isDimension(parsed.rows, 200)) {
        return null
      }
      return {
        type: parsed.type,
        terminalId: parsed.terminalId,
        cols: parsed.cols,
        rows: parsed.rows,
      }
    case 'terminal.input':
      if (typeof parsed.data !== 'string' || parsed.data.length > 16_384) {
        return null
      }
      return {
        type: parsed.type,
        terminalId: parsed.terminalId,
        data: parsed.data,
      }
    case 'terminal.close':
      return { type: parsed.type, terminalId: parsed.terminalId }
    default:
      return null
  }
}

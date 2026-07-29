export type TerminalConnectionState =
  | 'disconnected'
  | 'authorizing'
  | 'connecting'
  | 'connected'

export type TerminalClientMessage =
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

export type TerminalServerMessage =
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

export type TerminalScopedMessage = Exclude<
  TerminalServerMessage,
  { type: 'connection.ready' }
>

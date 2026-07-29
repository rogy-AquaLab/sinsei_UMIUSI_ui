import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import type {
  TerminalClientMessage,
  TerminalScopedMessage,
} from '@/types/terminal'

type SendTerminalMessage = (message: TerminalClientMessage) => boolean
type SubscribeTerminal = (
  terminalId: string,
  listener: (message: TerminalScopedMessage) => void,
) => () => void

export type XtermInstanceOptions = {
  terminalId: string
  send: SendTerminalMessage
  subscribe: SubscribeTerminal
  onProcessName: (terminalId: string, processName: string) => void
}

export class XtermInstance {
  readonly #terminalId: string
  readonly #send: SendTerminalMessage
  readonly #onProcessName: XtermInstanceOptions['onProcessName']
  readonly #terminal: Terminal
  readonly #fitAddon: FitAddon
  readonly #wrapper: HTMLDivElement
  readonly #resizeObserver: ResizeObserver
  readonly #unsubscribe: () => void
  readonly #inputSubscription: { dispose: () => void }
  #host: HTMLElement | null
  #resizeAnimationFrame: number | null = null
  #disposed = false

  constructor(options: XtermInstanceOptions, host: HTMLElement) {
    this.#terminalId = options.terminalId
    this.#send = options.send
    this.#onProcessName = options.onProcessName
    this.#host = host

    this.#terminal = new Terminal({
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
    this.#fitAddon = new FitAddon()
    this.#wrapper = document.createElement('div')
    this.#wrapper.className = 'h-full w-full'
    host.appendChild(this.#wrapper)
    this.#terminal.loadAddon(this.#fitAddon)
    this.#terminal.open(this.#wrapper)

    this.#unsubscribe = options.subscribe(this.#terminalId, this.#handleMessage)
    this.#inputSubscription = this.#terminal.onData((data) => {
      this.#send({ type: 'terminal.input', terminalId: this.#terminalId, data })
    })
    this.#resizeObserver = new ResizeObserver(() => {
      this.#scheduleResize()
    })
    this.#resizeObserver.observe(host)

    this.#resizeToHost()
    this.#send({
      type: 'terminal.create',
      terminalId: this.#terminalId,
      cols: this.#terminal.cols,
      rows: this.#terminal.rows,
    })
    this.#scheduleResize(true)
  }

  attach(host: HTMLElement) {
    if (this.#disposed) return

    if (this.#host !== host) {
      this.#resizeObserver.disconnect()
      this.#host = host
      host.appendChild(this.#wrapper)
      this.#resizeObserver.observe(host)
    }
    this.#scheduleResize(true)
  }

  detach(host: HTMLElement) {
    if (this.#disposed || this.#host !== host) return

    this.#resizeObserver.disconnect()
    this.#cancelScheduledResize()
    this.#wrapper.remove()
    this.#host = null
  }

  dispose() {
    if (this.#disposed) return
    this.#disposed = true

    this.#resizeObserver.disconnect()
    this.#cancelScheduledResize()
    this.#unsubscribe()
    this.#inputSubscription.dispose()
    this.#terminal.dispose()
    this.#wrapper.remove()
    this.#host = null
  }

  #handleMessage = (message: TerminalScopedMessage) => {
    switch (message.type) {
      case 'terminal.output':
        this.#terminal.write(message.data)
        break
      case 'terminal.exited':
        this.#terminal.write(
          `\r\n\x1b[90m[process exited with code ${message.exitCode}]\x1b[0m\r\n`,
        )
        break
      case 'terminal.created':
      case 'terminal.process':
        this.#onProcessName(this.#terminalId, message.processName)
        break
      case 'error':
        this.#terminal.write(`\r\n\x1b[31m${message.message}\x1b[0m\r\n`)
        break
    }
  }

  #resizeToHost() {
    const host = this.#host
    if (!host || host.clientWidth === 0 || host.clientHeight === 0) return

    const dimensions = this.#fitAddon.proposeDimensions()
    if (!dimensions) return

    this.#terminal.resize(dimensions.cols, Math.max(2, dimensions.rows - 1))
    this.#send({
      type: 'terminal.resize',
      terminalId: this.#terminalId,
      cols: this.#terminal.cols,
      rows: this.#terminal.rows,
    })
  }

  #scheduleResize(focus = false) {
    this.#cancelScheduledResize()
    this.#resizeAnimationFrame = window.requestAnimationFrame(() => {
      this.#resizeAnimationFrame = null
      if (this.#disposed) return

      this.#resizeToHost()
      this.#terminal.refresh(0, this.#terminal.rows - 1)
      if (focus) {
        this.#terminal.focus()
      }
    })
  }

  #cancelScheduledResize() {
    if (this.#resizeAnimationFrame === null) return

    window.cancelAnimationFrame(this.#resizeAnimationFrame)
    this.#resizeAnimationFrame = null
  }
}

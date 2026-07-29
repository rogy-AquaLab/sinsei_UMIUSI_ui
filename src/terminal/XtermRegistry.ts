import {
  XtermInstance,
  type XtermInstanceOptions,
} from '@/terminal/XtermInstance'

type XtermRegistryOptions = Omit<XtermInstanceOptions, 'terminalId'>

export class XtermRegistry {
  readonly #instances = new Map<string, XtermInstance>()
  readonly #options: XtermRegistryOptions

  constructor(options: XtermRegistryOptions) {
    this.#options = options
  }

  attach(terminalId: string, host: HTMLElement) {
    const existingInstance = this.#instances.get(terminalId)
    if (existingInstance) {
      existingInstance.attach(host)
      return
    }

    const instance = new XtermInstance(
      {
        ...this.#options,
        terminalId,
      },
      host,
    )
    this.#instances.set(terminalId, instance)
  }

  detach(terminalId: string, host: HTMLElement) {
    this.#instances.get(terminalId)?.detach(host)
  }

  close(terminalId: string, notifyServer = true) {
    const instance = this.#instances.get(terminalId)
    if (!instance) return

    this.#instances.delete(terminalId)
    if (notifyServer) {
      this.#options.send({ type: 'terminal.close', terminalId })
    }
    instance.dispose()
  }

  closeAll(notifyServer = false) {
    for (const terminalId of [...this.#instances.keys()]) {
      this.close(terminalId, notifyServer)
    }
  }
}

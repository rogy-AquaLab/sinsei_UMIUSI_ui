import { Ros, Service as RoslibService, Topic as RoslibTopic } from 'roslib'

export type TopicSpec = {
  name: string
  messageType: string
}

export type ServiceSpec = {
  name: string
  serviceType: string
}

export type Publisher<Message> = {
  publish: (message: Message) => void
  dispose: () => void
}

type RosSessionHandlers = {
  onConnection: () => void
  onClose: () => void
  onError: (error: Error) => void
}

export type RosSession = {
  connect: () => void
  close: () => void
  publisher: <Message>(topic: TopicSpec) => Publisher<Message>
  subscribe: <Message>(
    topic: TopicSpec,
    callback: (message: Message) => void,
  ) => () => void
  call: <Request, Response>(
    service: ServiceSpec,
    request: Request,
  ) => Promise<Response>
}

const CLOSED_MESSAGE = 'ROS connection closed'

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error))

class RoslibSession implements RosSession {
  readonly #ros = new Ros()
  readonly #url: string
  readonly #handlers: RosSessionHandlers
  readonly #closed = new AbortController()
  #started = false
  #listening = true

  constructor(url: string, handlers: RosSessionHandlers) {
    this.#url = url
    this.#handlers = handlers
    this.#ros.on('connection', this.#handleConnection)
    this.#ros.on('close', this.#handleClose)
    this.#ros.on('error', this.#handleError)
  }

  connect = () => {
    if (this.#started || this.#closed.signal.aborted) return
    this.#started = true

    void this.#ros.connect(this.#url).then(() => {
      // transportの生成前にcloseされた場合、生成直後に閉じる
      if (this.#closed.signal.aborted) this.#ros.close()
    }, this.#handleError)
  }

  close = () => {
    this.#abort()
    this.#ros.close()
  }

  publisher = <Message>(spec: TopicSpec): Publisher<Message> => {
    this.#throwIfClosed()

    const topic = new RoslibTopic<Message>({
      ros: this.#ros,
      ...spec,
      reconnect_on_close: false,
    })
    let active = true
    const dispose = this.#untilClose(() => {
      active = false
      topic.unadvertise()
    })

    return {
      publish: (message) => {
        if (active) topic.publish(message)
      },
      dispose,
    }
  }

  subscribe = <Message>(
    spec: TopicSpec,
    callback: (message: Message) => void,
  ) => {
    this.#throwIfClosed()

    const topic = new RoslibTopic<Message>({
      ros: this.#ros,
      ...spec,
      reconnect_on_close: false,
    })
    topic.subscribe(callback)
    return this.#untilClose(() => topic.unsubscribe(callback))
  }

  call = <Request, Response>(
    spec: ServiceSpec,
    request: Request,
  ): Promise<Response> => {
    if (this.#closed.signal.aborted) {
      return Promise.reject(this.#closeError())
    }

    const service = new RoslibService<Request, Response>({
      ros: this.#ros,
      ...spec,
    })

    return new Promise<Response>((resolve, reject) => {
      let settled = false

      const finish = (callback: () => void) => {
        if (settled) return
        settled = true
        this.#closed.signal.removeEventListener('abort', handleAbort)
        callback()
      }
      const handleAbort = () => finish(() => reject(this.#closeError()))

      this.#closed.signal.addEventListener('abort', handleAbort, { once: true })

      try {
        service.callService(
          request,
          (response) => finish(() => resolve(response)),
          (error) => finish(() => reject(toError(error))),
        )
      } catch (error) {
        finish(() => reject(toError(error)))
      }
    })
  }

  #handleConnection = () => {
    if (this.#closed.signal.aborted) {
      this.#ros.close()
      return
    }
    this.#handlers.onConnection()
  }

  #handleClose = () => {
    this.#abort()
    this.#handlers.onClose()
    this.#detach()
  }

  #handleError = (error: unknown) => {
    if (this.#closed.signal.aborted) return

    this.#abort(toError(error))
    this.#handlers.onError(toError(error))
    this.#detach()
    this.#ros.close()
  }

  #abort(reason: Error = new Error(CLOSED_MESSAGE)) {
    if (!this.#closed.signal.aborted) this.#closed.abort(reason)
  }

  #closeError() {
    return toError(this.#closed.signal.reason ?? CLOSED_MESSAGE)
  }

  #throwIfClosed() {
    if (this.#closed.signal.aborted) throw this.#closeError()
  }

  #untilClose(disposeResource: () => void) {
    let disposed = false

    const dispose = () => {
      if (disposed) return
      disposed = true
      this.#closed.signal.removeEventListener('abort', dispose)
      disposeResource()
    }

    this.#closed.signal.addEventListener('abort', dispose, { once: true })
    return dispose
  }

  #detach() {
    if (!this.#listening) return
    this.#listening = false
    this.#ros.off('connection', this.#handleConnection)
    this.#ros.off('close', this.#handleClose)
    this.#ros.off('error', this.#handleError)
  }
}

export const createRosSession = (
  url: string,
  handlers: RosSessionHandlers,
): RosSession => new RoslibSession(url, handlers)

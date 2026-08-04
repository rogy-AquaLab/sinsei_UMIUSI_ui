import { WhepReader } from '@/services/camera/WhepReader'

export type CameraSessionStatus = 'connecting' | 'live' | 'retrying' | 'failed'

export type CameraSessionState = {
  stream: MediaStream | null
  status: CameraSessionStatus
  errorMessage: string
}

type CameraSessionHandlers = {
  onStateChange: (state: CameraSessionState) => void
  onReconnected: () => void
  onFailure: (error: Error) => void
}

export type CameraSession = {
  connect: () => void
  retry: () => void
  close: () => void
}

const RETRY_DELAY_MS = 2_000
const MAX_AUTOMATIC_RETRIES = 2

class WhepCameraSession implements CameraSession {
  readonly #url: string
  readonly #handlers: CameraSessionHandlers
  #state: CameraSessionState = {
    stream: null,
    status: 'connecting',
    errorMessage: '',
  }
  #reader: WhepReader | null = null
  #retryTimer: number | null = null
  #retryCount = 0
  #hasRetried = false
  #started = false
  #closed = false

  constructor(url: string, handlers: CameraSessionHandlers) {
    this.#url = url
    this.#handlers = handlers
  }

  connect = () => {
    if (this.#started || this.#closed) return
    this.#started = true
    this.#connect()
  }

  retry = () => {
    if (this.#closed) return
    this.#started = true
    this.#stopCurrentConnection()
    this.#retryCount = 0
    this.#hasRetried = true
    this.#emit({
      stream: null,
      status: 'retrying',
      errorMessage: '',
    })
    this.#connect()
  }

  close = () => {
    if (this.#closed) return
    this.#closed = true
    this.#stopCurrentConnection()
  }

  #connect() {
    if (this.#closed) return

    this.#emit({
      ...this.#state,
      status: this.#hasRetried ? 'retrying' : 'connecting',
    })

    const reader = new WhepReader({
      url: this.#url,
      onTrack: (event) => {
        if (this.#closed || this.#reader !== reader) return

        const stream = event.streams[0] ?? new MediaStream([event.track])
        this.#retryCount = 0
        this.#emit({ stream, status: 'live', errorMessage: '' })

        if (this.#hasRetried) {
          this.#hasRetried = false
          this.#handlers.onReconnected()
        }
      },
      onError: (error) => {
        if (this.#closed || this.#reader !== reader) return

        this.#reader = null
        reader.close()
        this.#clearStream()
        this.#hasRetried = true

        if (this.#retryCount < MAX_AUTOMATIC_RETRIES) {
          this.#retryCount += 1
          this.#emit({
            stream: null,
            status: 'retrying',
            errorMessage: error.message,
          })
          this.#retryTimer = window.setTimeout(() => {
            this.#retryTimer = null
            this.#connect()
          }, RETRY_DELAY_MS)
          return
        }

        this.#emit({
          stream: null,
          status: 'failed',
          errorMessage: error.message,
        })
        this.#handlers.onFailure(error)
      },
    })

    this.#reader = reader
    void reader.start()
  }

  #stopCurrentConnection() {
    if (this.#retryTimer !== null) {
      window.clearTimeout(this.#retryTimer)
      this.#retryTimer = null
    }

    const reader = this.#reader
    this.#reader = null
    reader?.close()
    this.#clearStream()
  }

  #clearStream() {
    this.#state.stream?.getTracks().forEach((track) => {
      track.stop()
    })
    this.#state = { ...this.#state, stream: null }
  }

  #emit(state: CameraSessionState) {
    this.#state = state
    this.#handlers.onStateChange(state)
  }
}

export const createCameraSession = (
  url: string,
  handlers: CameraSessionHandlers,
): CameraSession => new WhepCameraSession(url, handlers)

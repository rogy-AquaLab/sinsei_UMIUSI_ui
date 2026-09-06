type WhepReaderOptions = {
  url: string
  onTrack: (event: RTCTrackEvent) => void
  onError: (error: Error) => void
}

const ICE_GATHERING_TIMEOUT_MS = 10_000

const splitLinkHeader = (header: string) => {
  const entries: string[] = []
  let start = 0
  let inQuotes = false
  let inAngleBrackets = false
  let escaped = false

  for (let index = 0; index < header.length; index += 1) {
    const character = header[index]

    if (escaped) {
      escaped = false
      continue
    }
    if (inQuotes && character === '\\') {
      escaped = true
      continue
    }
    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && character === '<') {
      inAngleBrackets = true
      continue
    }
    if (!inQuotes && character === '>') {
      inAngleBrackets = false
      continue
    }
    if (!inQuotes && !inAngleBrackets && character === ',') {
      entries.push(header.slice(start, index).trim())
      start = index + 1
    }
  }

  entries.push(header.slice(start).trim())
  return entries.filter(Boolean)
}

const getQuotedParameter = (entry: string, name: string) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const value = entry.match(
    new RegExp(`(?:^|;)\\s*${escapedName}="((?:\\\\.|[^"])*)"`, 'i'),
  )?.[1]
  return value?.replace(/\\(.)/g, '$1')
}

const parseIceServers = (header: string | null): RTCIceServer[] => {
  if (!header) return []

  return splitLinkHeader(header).flatMap((entry) => {
    const relation = getQuotedParameter(entry, 'rel')
    if (!relation?.toLowerCase().split(/\s+/).includes('ice-server')) return []

    const url = entry.match(/<([^>]+)>/)?.[1]
    if (!url) throw new Error('Invalid ICE server Link header')

    const username = getQuotedParameter(entry, 'username')
    const credential = getQuotedParameter(entry, 'credential')

    return [
      {
        urls: url,
        ...(username !== undefined ? { username } : {}),
        ...(credential !== undefined ? { credential } : {}),
      },
    ]
  })
}

const waitForIceGathering = (
  connection: RTCPeerConnection,
  signal: AbortSignal,
) =>
  new Promise<void>((resolve, reject) => {
    if (connection.iceGatheringState === 'complete') {
      resolve()
      return
    }
    if (signal.aborted) {
      reject(new DOMException('The operation was aborted', 'AbortError'))
      return
    }

    let timeoutId: number | null = null

    const cleanup = () => {
      connection.removeEventListener(
        'icegatheringstatechange',
        handleStateChange,
      )
      signal.removeEventListener('abort', handleAbort)
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }

    const finish = (callback: () => void) => {
      cleanup()
      callback()
    }

    const handleStateChange = () => {
      if (connection.iceGatheringState !== 'complete') return
      finish(resolve)
    }
    const handleAbort = () => {
      finish(() =>
        reject(new DOMException('The operation was aborted', 'AbortError')),
      )
    }

    connection.addEventListener('icegatheringstatechange', handleStateChange)
    signal.addEventListener('abort', handleAbort, { once: true })
    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error('ICE gathering timed out')))
    }, ICE_GATHERING_TIMEOUT_MS)
  })

const responseError = async (operation: string, response: Response) => {
  const body = await response.text()
  let detail = body.trim()

  if (detail.startsWith('{')) {
    try {
      const parsed = JSON.parse(detail) as { error?: unknown }
      if (typeof parsed.error === 'string') detail = parsed.error
    } catch {
      // JSONではないレスポンスはそのままエラー詳細として使用する
    }
  }

  if (!detail) {
    detail =
      {
        400: 'invalid request',
        401: 'authentication required',
        403: 'access denied',
        404: 'stream not found',
      }[response.status] ?? ''
  }

  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
  return new Error(
    detail
      ? `WHEP ${operation} failed (${status}): ${detail}`
      : `WHEP ${operation} failed (${status})`,
  )
}

/**
 * MediaMTXのWHEP endpointからvideo trackを受信する最小限のreader。
 * カメラは映像のみを配信するため、video transceiverだけを要求する。
 */
export class WhepReader {
  private readonly options: WhepReaderOptions
  private connection: RTCPeerConnection | null = null
  private sessionUrl: string | null = null
  private abortController = new AbortController()
  private closed = false

  constructor(options: WhepReaderOptions) {
    this.options = options
  }

  async start() {
    try {
      const optionsResponse = await fetch(this.options.url, {
        method: 'OPTIONS',
        signal: this.abortController.signal,
      })
      if (!optionsResponse.ok) {
        throw await responseError('OPTIONS', optionsResponse)
      }

      const connection = new RTCPeerConnection({
        iceServers: parseIceServers(optionsResponse.headers.get('Link')),
      })
      this.connection = connection
      connection.addTransceiver('video', { direction: 'recvonly' })
      connection.ontrack = this.options.onTrack
      connection.onconnectionstatechange = () => {
        if (
          !this.closed &&
          (connection.connectionState === 'failed' ||
            connection.connectionState === 'closed')
        ) {
          this.options.onError(new Error('WebRTC connection closed'))
        }
      }

      const offer = await connection.createOffer()
      await connection.setLocalDescription(offer)
      await waitForIceGathering(connection, this.abortController.signal)

      if (!connection.localDescription?.sdp) {
        throw new Error('WebRTC offer was not created')
      }

      const response = await fetch(this.options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: connection.localDescription.sdp,
        signal: this.abortController.signal,
      })
      if (response.status !== 201) {
        throw await responseError('POST', response)
      }

      const location = response.headers.get('Location')
      if (!location) {
        throw new Error('WHEP response did not include a Location header')
      }
      try {
        this.sessionUrl = new URL(location, this.options.url).toString()
      } catch {
        throw new Error('WHEP response included an invalid Location header')
      }

      const answer = await response.text()
      if (!answer.trim()) {
        throw new Error('WHEP response did not include answer SDP')
      }
      await connection.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      })
    } catch (error) {
      if (
        this.closed ||
        (error instanceof DOMException && error.name === 'AbortError')
      )
        return
      this.options.onError(
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  close() {
    this.closed = true
    this.abortController.abort()
    this.connection?.close()
    this.connection = null

    if (this.sessionUrl) {
      void fetch(this.sessionUrl, { method: 'DELETE', keepalive: true }).catch(
        () => {},
      )
      this.sessionUrl = null
    }
  }
}

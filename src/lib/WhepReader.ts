type WhepReaderOptions = {
  url: string
  onTrack: (event: RTCTrackEvent) => void
  onError: (error: Error) => void
}

const parseIceServers = (header: string | null): RTCIceServer[] => {
  if (!header) return []

  return header.split(',').flatMap((entry) => {
    const url = entry.match(/<([^>]+)>/)?.[1]
    if (!url) return []

    const username = entry.match(/username="([^"]*)"/)?.[1]
    const credential = entry.match(/credential="([^"]*)"/)?.[1]

    return [
      {
        urls: url,
        ...(username ? { username } : {}),
        ...(credential ? { credential } : {}),
      },
    ]
  })
}

const waitForIceGathering = (connection: RTCPeerConnection) =>
  new Promise<void>((resolve) => {
    if (connection.iceGatheringState === 'complete') {
      resolve()
      return
    }

    const handleStateChange = () => {
      if (connection.iceGatheringState !== 'complete') return
      connection.removeEventListener(
        'icegatheringstatechange',
        handleStateChange,
      )
      resolve()
    }
    connection.addEventListener('icegatheringstatechange', handleStateChange)
  })

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
        throw new Error(`WHEP OPTIONS failed (${optionsResponse.status})`)
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
      await waitForIceGathering(connection)

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
        const detail = await response.text()
        throw new Error(detail || `WHEP connection failed (${response.status})`)
      }

      const location = response.headers.get('Location')
      if (location) {
        this.sessionUrl = new URL(location, this.options.url).toString()
      }

      await connection.setRemoteDescription({
        type: 'answer',
        sdp: await response.text(),
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

import { useEffect, useRef, useState } from 'react'
import { FaExclamationTriangle, FaSpinner } from 'react-icons/fa'
import { WhepReader } from '@/lib/WhepReader'
import { useNotificationStore } from '@/stores/notificationStore'

type Props = {
  label: string
  url: string
}

type PlayerState = 'connecting' | 'live' | 'retrying' | 'failed'

const RETRY_DELAY_MS = 2_000
const MAX_AUTOMATIC_RETRIES = 2

const WebRtcVideo = ({ label, url }: Props) => {
  const notify = useNotificationStore((state) => state.notify)
  const notifyRef = useRef(notify)
  notifyRef.current = notify
  const videoRef = useRef<HTMLVideoElement>(null)
  const retriedRef = useRef(false)
  const [state, setState] = useState<PlayerState>('connecting')
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let disposed = false
    let retryCount = 0
    let reader: WhepReader | null = null
    let retryTimer: number | null = null

    if (retryKey > 0) retriedRef.current = true

    const connect = () => {
      if (disposed) return
      setState('connecting')
      setErrorMessage('')

      reader = new WhepReader({
        url,
        onTrack: (event) => {
          const stream = event.streams[0] ?? new MediaStream([event.track])
          if (videoRef.current) videoRef.current.srcObject = stream
        },
        onError: (error) => {
          if (disposed) return
          reader?.close()
          setErrorMessage(error.message)
          retriedRef.current = true

          if (retryCount < MAX_AUTOMATIC_RETRIES) {
            retryCount += 1
            setState('retrying')
            retryTimer = window.setTimeout(connect, RETRY_DELAY_MS)
          } else {
            setState('failed')
            notifyRef.current(`${label} connection failed.`, 'error')
          }
        },
      })
      void reader.start()
    }

    connect()
    return () => {
      disposed = true
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      reader?.close()
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [label, retryKey, url])

  const handlePlaying = () => {
    setState('live')
    if (retriedRef.current) {
      retriedRef.current = false
      notifyRef.current(`${label} reconnected.`, 'success')
    }
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#12303b_0%,#07171d_55%,#020709_100%)]">
      <video
        ref={videoRef}
        className="pointer-events-none h-full w-full object-contain"
        autoPlay
        muted
        playsInline
        onPlaying={handlePlaying}
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/65 px-2.5 py-1 text-sm font-medium text-white">
        {label}
      </div>

      {state !== 'live' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 text-white"
          title={errorMessage}
        >
          {state === 'connecting' ? (
            <>
              <FaSpinner className="animate-spin text-2xl" />
              <span className="text-sm">Connecting</span>
            </>
          ) : state === 'retrying' ? (
            <>
              <FaExclamationTriangle className="text-2xl text-warning" />
              <span className="text-sm">Reconnecting</span>
            </>
          ) : (
            <>
              <FaExclamationTriangle className="text-2xl text-error" />
              <span className="text-sm">Camera unavailable</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setRetryKey((current) => current + 1)
                  notifyRef.current(`Retrying ${label}.`, 'info')
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default WebRtcVideo

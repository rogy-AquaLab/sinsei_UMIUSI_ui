import { useEffect, useRef } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa'
import { type CameraId, useCameraStreamStore } from '@/stores/cameraStreamStore'

type Props = {
  cameraId: CameraId
  label: string
}

const WebRtcVideo = ({ cameraId, label }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stream = useCameraStreamStore((store) => store.cameras[cameraId].stream)
  const status = useCameraStreamStore((store) => store.cameras[cameraId].status)
  const errorMessage = useCameraStreamStore(
    (store) => store.cameras[cameraId].errorMessage,
  )
  const retry = useCameraStreamStore((store) => store.retry)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream

    return () => {
      if (video.srcObject === stream) video.srcObject = null
    }
  }, [stream])

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="pointer-events-none h-full w-full object-contain"
        autoPlay
        muted
        playsInline
      />

      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/65 px-2.5 py-1 text-sm font-medium text-white">
        {label}
      </div>

      {status !== 'live' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 text-white"
          title={errorMessage}
        >
          {status === 'connecting' ? (
            <>
              <span className="loading loading-spinner loading-lg" />
              <span className="text-sm">Connecting...</span>
            </>
          ) : status === 'retrying' ? (
            <>
              <span className="loading loading-spinner loading-lg" />
              <span className="text-sm">Reconnecting...</span>
            </>
          ) : (
            <>
              <FaExclamationTriangle className="text-2xl text-error" />
              <span className="text-sm">Camera unavailable</span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => retry(cameraId)}
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

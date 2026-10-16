import { type ReactNode, useEffect, useRef, useState } from 'react'
import { FaExclamationTriangle, FaRedoAlt } from 'react-icons/fa'
import { type CameraId, useCameraStreamStore } from '@/stores/cameraStreamStore'

export type VideoContentSize = { width: number; height: number }

type Props = {
  cameraId: CameraId
  label: string
  /** 映像が実際に描かれている範囲（object-contain の余白を除く）に重ねて描く */
  renderOverlay?: (size: VideoContentSize) => ReactNode
}

type ContentRect = VideoContentSize & { left: number; top: number }

// 映像の大きさがまだ分からないとき（接続前など）は前カメラの 16:9 とみなす
const FALLBACK_ASPECT = 16 / 9

const contentRect = (
  container: HTMLElement,
  video: HTMLVideoElement,
): ContentRect => {
  const cw = container.clientWidth
  const ch = container.clientHeight
  const aspect =
    video.videoWidth > 0 && video.videoHeight > 0
      ? video.videoWidth / video.videoHeight
      : FALLBACK_ASPECT
  const width = Math.min(cw, ch * aspect)
  const height = width / aspect
  return { left: (cw - width) / 2, top: (ch - height) / 2, width, height }
}

const WebRtcVideo = ({ cameraId, label, renderOverlay }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [rect, setRect] = useState<ContentRect | null>(null)
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

  useEffect(() => {
    const container = containerRef.current
    const video = videoRef.current
    if (!renderOverlay || !container || !video) return
    const update = () => setRect(contentRect(container, video))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    video.addEventListener('loadedmetadata', update)
    video.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      video.removeEventListener('loadedmetadata', update)
      video.removeEventListener('resize', update)
    }
  }, [renderOverlay])

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-black"
    >
      <video
        ref={videoRef}
        className="pointer-events-none h-full w-full object-contain"
        autoPlay
        muted
        playsInline
      />

      {renderOverlay && rect && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }}
        >
          {renderOverlay({ width: rect.width, height: rect.height })}
        </div>
      )}

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
                <FaRedoAlt />
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

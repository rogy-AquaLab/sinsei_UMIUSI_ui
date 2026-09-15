import { useEffect, useRef, useState } from 'react'
import { FaThLarge, FaVideo } from 'react-icons/fa'
import WebRtcVideo from '@/components/camera/WebRtcVideo'
import { CAMERA_STREAMS, type CameraId } from '@/stores/cameraStreamStore'

type ViewMode = CameraId | 'dual'

const VIDEO_ASPECT_RATIO = 16 / 9
const DUAL_VIEW_GAP = 4

const CameraViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('dual')
  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [])

  const horizontalVideoWidth = containerSize
    ? Math.min(
        Math.max(0, containerSize.width - DUAL_VIEW_GAP) / 2,
        containerSize.height * VIDEO_ASPECT_RATIO,
      )
    : 0
  const verticalVideoWidth = containerSize
    ? Math.min(
        containerSize.width,
        (Math.max(0, containerSize.height - DUAL_VIEW_GAP) / 2) *
          VIDEO_ASPECT_RATIO,
      )
    : 0
  const useHorizontalLayout = horizontalVideoWidth >= verticalVideoWidth
  const dualVideoWidth = useHorizontalLayout
    ? horizontalVideoWidth
    : verticalVideoWidth

  const isVisible = (id: CameraId) => viewMode === 'dual' || viewMode === id

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-base-300"
      data-theme="dark"
    >
      <div
        className={`absolute inset-0 flex items-center justify-center gap-1 ${
          viewMode === 'dual' && !useHorizontalLayout ? 'flex-col' : 'flex-row'
        }`}
      >
        {CAMERA_STREAMS.map((camera) => {
          const visible = isVisible(camera.id)
          return (
            <div
              key={camera.id}
              className={
                !visible
                  ? 'hidden'
                  : viewMode === 'dual'
                    ? 'relative shrink-0 overflow-hidden bg-black'
                    : 'absolute inset-0'
              }
              style={
                viewMode === 'dual' && containerSize
                  ? {
                      width: `${dualVideoWidth}px`,
                      height: `${dualVideoWidth / VIDEO_ASPECT_RATIO}px`,
                    }
                  : undefined
              }
            >
              {visible && (
                <WebRtcVideo cameraId={camera.id} label={camera.label} />
              )}
            </div>
          )
        })}
      </div>

      <div
        role="tablist"
        className="tabs tabs-box tabs-sm absolute left-1/2 top-4 z-30 -translate-x-1/2 bg-base-200/85 shadow-lg backdrop-blur-sm"
        aria-label="Camera view"
      >
        <button
          type="button"
          role="tab"
          className={`tab gap-2 ${viewMode === 'front' ? 'tab-active' : ''}`}
          aria-selected={viewMode === 'front'}
          onClick={() => setViewMode('front')}
        >
          <FaVideo />
          Front
        </button>
        <button
          type="button"
          role="tab"
          className={`tab gap-2 ${viewMode === 'down' ? 'tab-active' : ''}`}
          aria-selected={viewMode === 'down'}
          onClick={() => setViewMode('down')}
        >
          <FaVideo />
          Down
        </button>
        <button
          type="button"
          role="tab"
          className={`tab gap-2 ${viewMode === 'dual' ? 'tab-active' : ''}`}
          aria-selected={viewMode === 'dual'}
          onClick={() => setViewMode('dual')}
        >
          <FaThLarge />
          Dual
        </button>
      </div>
    </div>
  )
}

export default CameraViewer

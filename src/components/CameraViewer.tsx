import { useState } from 'react'
import { FaCamera, FaThLarge } from 'react-icons/fa'
import WebRtcVideo from '@/components/camera/WebRtcVideo'
import { CAMERA_STREAMS, type CameraId } from '@/stores/cameraStreamStore'

type ViewMode = CameraId | 'dual'

const CameraViewer = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dual')

  const isVisible = (id: CameraId) => viewMode === 'dual' || viewMode === id

  return (
    <div className="relative h-full w-full bg-base-300" data-theme="dark">
      {CAMERA_STREAMS.map((camera) => {
        const visible = isVisible(camera.id)
        const isDownPreview = viewMode === 'dual' && camera.id === 'down'
        return (
          <div
            key={camera.id}
            className={
              !visible
                ? 'hidden'
                : isDownPreview
                  ? 'absolute bottom-4 right-4 z-20 aspect-video w-[clamp(13.75rem,28%,22.5rem)] max-w-[calc(100%-2rem)] overflow-hidden rounded-xl border border-base-300 bg-black shadow-2xl'
                  : 'absolute inset-0'
            }
          >
            {visible && (
              <WebRtcVideo cameraId={camera.id} label={camera.label} />
            )}
          </div>
        )
      })}

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
          <FaCamera />
          Front
        </button>
        <button
          type="button"
          role="tab"
          className={`tab gap-2 ${viewMode === 'down' ? 'tab-active' : ''}`}
          aria-selected={viewMode === 'down'}
          onClick={() => setViewMode('down')}
        >
          <FaCamera />
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

import { useState } from 'react'
import { FaExchangeAlt, FaThLarge, FaVideo } from 'react-icons/fa'
import WebRtcVideo from '@/components/camera/WebRtcVideo'
import { CAMERA_STREAMS, type CameraId } from '@/stores/cameraStreamStore'

type ViewMode = CameraId | 'dual'

const CameraViewer = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('dual')
  const [primaryCamera, setPrimaryCamera] = useState<CameraId>('front')

  const isVisible = (id: CameraId) => viewMode === 'dual' || viewMode === id
  const isPrimary = (id: CameraId) =>
    viewMode === id || (viewMode === 'dual' && primaryCamera === id)

  return (
    <div className="relative h-full w-full bg-black">
      {CAMERA_STREAMS.map((camera) => {
        const visible = isVisible(camera.id)
        const primary = isPrimary(camera.id)
        return (
          <div
            key={camera.id}
            className={
              !visible
                ? 'hidden'
                : primary
                  ? 'absolute inset-0'
                  : 'absolute bottom-4 right-4 z-20 aspect-video w-72 max-w-[42%] overflow-hidden rounded-lg border border-white/30 shadow-2xl'
            }
          >
            {visible && (
              <WebRtcVideo cameraId={camera.id} label={camera.label} />
            )}
            {visible && !primary && (
              <button
                type="button"
                className="absolute inset-0 z-10 cursor-pointer"
                aria-label={`Show ${camera.label} as main view`}
                onClick={() => setPrimaryCamera(camera.id)}
              />
            )}
          </div>
        )
      })}

      <div className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-black/65 p-1 text-white shadow-lg">
        <button
          type="button"
          className={`btn btn-sm border-none ${viewMode === 'front' ? 'btn-primary' : 'btn-ghost text-white'}`}
          aria-pressed={viewMode === 'front'}
          onClick={() => setViewMode('front')}
        >
          <FaVideo />
          Front
        </button>
        <button
          type="button"
          className={`btn btn-sm border-none ${viewMode === 'down' ? 'btn-primary' : 'btn-ghost text-white'}`}
          aria-pressed={viewMode === 'down'}
          onClick={() => setViewMode('down')}
        >
          <FaVideo />
          Down
        </button>
        <button
          type="button"
          className={`btn btn-sm border-none ${viewMode === 'dual' ? 'btn-primary' : 'btn-ghost text-white'}`}
          aria-pressed={viewMode === 'dual'}
          onClick={() => setViewMode('dual')}
        >
          <FaThLarge />
          Dual
        </button>
        {viewMode === 'dual' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square text-white"
            aria-label="Swap camera views"
            onClick={() =>
              setPrimaryCamera((current) =>
                current === 'front' ? 'down' : 'front',
              )
            }
          >
            <FaExchangeAlt />
          </button>
        )}
      </div>
    </div>
  )
}

export default CameraViewer

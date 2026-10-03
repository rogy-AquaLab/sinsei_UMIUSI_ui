import type { BalloonDetection } from '@/msgs/AutonomyMsgs'
import { useDetectionStore } from '@/stores/detectionStore'

const COLOUR_LABELS: Record<string, { label: string; className: string }> = {
  red: { label: '赤', className: 'text-error' },
  yellow: { label: '黄', className: 'text-warning' },
  blue: { label: '青', className: 'text-info' },
}

const RAD_TO_DEG = 180 / Math.PI

const formatBearing = (azimuth: number) => {
  const deg = Math.round(azimuth * RAD_TO_DEG)
  if (deg === 0) return '正面'
  return deg > 0 ? `右 ${deg}°` : `左 ${-deg}°`
}

const DetectionLine = ({ detection }: { detection: BalloonDetection }) => {
  const colour = COLOUR_LABELS[detection.colour] ?? {
    label: detection.colour,
    className: '',
  }
  return (
    <li>
      <span className={`font-bold ${colour.className}`}>{colour.label}</span>{' '}
      {detection.range_m.toFixed(1)} m / {formatBearing(detection.azimuth)} /{' '}
      {Math.round(detection.confidence * 100)}%
    </li>
  )
}

/**
 * 前カメラに重ねる認識の状態 (/perception_node/detections)
 */
const DetectionOverlay = () => {
  const status = useDetectionStore((state) => state.status)
  const detections = useDetectionStore((state) => state.detections)
  const rateHz = useDetectionStore((state) => state.rateHz)

  const rate = rateHz === null ? '' : ` (${rateHz.toFixed(1)} Hz)`

  return (
    <div className="absolute left-4 top-4 z-30 max-w-[calc(100%-2rem)] rounded-lg bg-base-200/85 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      {status === 'never' && (
        <span className="text-base-content/60">認識: 未受信</span>
      )}
      {status === 'stale' && (
        <span className="font-bold text-warning">
          認識: 停止 (1 秒以上届いていない)
        </span>
      )}
      {status === 'live' && detections.length === 0 && (
        <span>認識: なし{rate}</span>
      )}
      {status === 'live' && detections.length > 0 && (
        <>
          <span>
            認識: {detections.length} 個{rate}
          </span>
          <ul>
            {detections.slice(0, 4).map((detection, index) => (
              <DetectionLine
                // biome-ignore lint/suspicious/noArrayIndexKey: 検出に ID が無い
                key={index}
                detection={detection}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default DetectionOverlay

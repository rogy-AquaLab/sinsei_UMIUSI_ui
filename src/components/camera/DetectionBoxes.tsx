import type { VideoContentSize } from '@/components/camera/WebRtcVideo'
import type { BalloonColor } from '@/msgs/AutoTargetGeneratorStatus'
import { useAutoStatusStore } from '@/stores/autoStatusStore'

const STROKE: Record<BalloonColor, string> = {
  yellow: '#facc15',
  red: '#ef4444',
  blue: '#3b82f6',
}
const LABEL: Record<BalloonColor, string> = {
  yellow: '黄',
  red: '赤',
  blue: '青',
}

/**
 * 前カメラの映像に、auto_target_generator の検出（外接円）を重ねる。
 * 座標は検出器の正規化座標（画像中心 0、端 ±1、半径は画像の幅に対する比）。
 * 狙っている色の円は太く描く。中央の十字は画像の中心（照準 aim_x / aim_y の既定値）。
 */
const DetectionBoxes = ({ width, height }: VideoContentSize) => {
  const detections = useAutoStatusStore((state) => state.detections)
  const target = useAutoStatusStore((state) => state.status?.target ?? null)
  const live = useAutoStatusStore((state) => state.link === 'live')
  // CNN のときは確信度も出す（しきい値 cnn_conf の近くでちらつくものを見分ける）
  const cnn = useAutoStatusStore((state) => state.status?.detector === 'cnn')
  if (!live) return null

  const cx = width / 2
  const cy = height / 2
  return (
    <svg
      className="absolute inset-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="風船の検出"
    >
      <line
        x1={cx - 10}
        y1={cy}
        x2={cx + 10}
        y2={cy}
        stroke="white"
        strokeOpacity={0.7}
      />
      <line
        x1={cx}
        y1={cy - 10}
        x2={cx}
        y2={cy + 10}
        stroke="white"
        strokeOpacity={0.7}
      />
      {detections.map((d, index) => {
        const x = ((d.x + 1) / 2) * width
        const y = ((d.y + 1) / 2) * height
        const r = Math.max(4, d.r * width)
        const isTarget = d.color === target
        const color = STROKE[d.color] ?? 'white'
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: 検出に ID が無い
          <g key={index}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="none"
              stroke="black"
              strokeOpacity={0.6}
              strokeWidth={isTarget ? 6 : 4}
            />
            <circle
              cx={x}
              cy={y}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={isTarget ? 3.5 : 2}
            />
            <text
              x={x}
              y={Math.max(12, y - r - 4)}
              textAnchor="middle"
              fontSize={13}
              fontWeight="bold"
              fill={color}
              stroke="black"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {LABEL[d.color] ?? d.color}
              {cnn && d.s !== undefined ? ` ${d.s.toFixed(2)}` : ''}
              {isTarget ? ' ◎' : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default DetectionBoxes

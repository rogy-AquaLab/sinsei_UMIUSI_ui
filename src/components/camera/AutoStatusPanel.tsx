import type {
  BalloonColor,
  MissionState,
} from '@/msgs/AutoTargetGeneratorStatus'
import { useAutoStatusStore } from '@/stores/autoStatusStore'
import { useRobotStateStore } from '@/stores/robotStateStore'

const STATE_LABEL: Record<MissionState, { label: string; className: string }> =
  {
    WAIT: { label: '待機', className: 'badge-ghost' },
    DIVE: { label: '潜行', className: 'badge-info' },
    APPROACH: { label: '接近', className: 'badge-warning' },
    RAM: { label: '突進', className: 'badge-error' },
    BACKOFF: { label: '後退', className: 'badge-info' },
    SEARCH: { label: '探索', className: 'badge-secondary' },
    END: { label: '終了', className: 'badge-ghost' },
    ERROR: { label: '例外（推力 0）', className: 'badge-error' },
  }

const COLOR_LABEL: Record<BalloonColor, { label: string; className: string }> =
  {
    yellow: { label: '黄', className: 'text-warning' },
    red: { label: '赤', className: 'text-error' },
    blue: { label: '青', className: 'text-info' },
  }

const RAD_TO_DEG = 180 / Math.PI

const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`

const yawText = (yawRate: number) => {
  const deg = Math.round(yawRate * RAD_TO_DEG)
  if (deg === 0) return '0°/s'
  return deg > 0 ? `左 ${deg}°/s` : `右 ${-deg}°/s`
}

/**
 * 前カメラに重ねる自律の状態（/auto_target_generator/status）。
 * 行動決定の状態・狙っている色・出している指令・認識の頻度を出す。
 */
const AutoStatusPanel = () => {
  const link = useAutoStatusStore((state) => state.link)
  const status = useAutoStatusStore((state) => state.status)
  const detections = useAutoStatusStore((state) => state.detections)
  const frameRateHz = useAutoStatusStore((state) => state.frameRateHz)
  const mode = useRobotStateStore((state) => state.mode)

  // auto_target_generator は AUTO の間だけ動く。AUTO 以外で届かないのは正常
  const inAuto = mode === null || mode === 'AUTO'
  const state = status
    ? (STATE_LABEL[status.state] ?? { label: status.state, className: '' })
    : null
  const target = status?.target ? COLOR_LABEL[status.target] : null

  return (
    <div className="absolute left-4 top-4 z-30 max-w-[calc(100%-2rem)] rounded-lg bg-base-200/85 px-3 py-2 text-sm shadow-lg backdrop-blur-sm">
      {link === 'never' && (
        <span className="text-base-content/60">
          自律: {inAuto ? '未受信' : 'AUTO で動く'}
        </span>
      )}
      {link === 'stale' && (
        <span
          className={inAuto ? 'font-bold text-warning' : 'text-base-content/60'}
        >
          自律: {inAuto ? '停止（1 秒以上届いていない）' : 'AUTO 以外は停止中'}
        </span>
      )}
      {link === 'live' && status && state && (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`badge badge-sm ${state.className}`}>
              {state.label}
            </span>
            <span>
              狙い:{' '}
              {target ? (
                <span className={`font-bold ${target.className}`}>
                  {target.label}
                </span>
              ) : (
                <span className="text-base-content/60">なし</span>
              )}
            </span>
          </div>
          <div className="font-mono text-xs">
            前後 {signed(status.cmd.surge)} / 上下 {signed(status.cmd.heave)} /
            旋回 {yawText(status.cmd.yaw_rate)}
            {status.cmd.hold_yaw ? ' / 方位保持' : ''}
          </div>
          {status.config && (
            <div className="text-xs">
              色の設定:{' '}
              {status.config.fallback ? (
                <span className="font-bold text-warning">
                  {status.config.file}（予備。色合わせの結果を読んでいない）
                </span>
              ) : (
                <span>
                  {status.config.file}（
                  {new Date(status.config.loaded_at * 1000).toLocaleTimeString(
                    'ja-JP',
                    { hour: '2-digit', minute: '2-digit', second: '2-digit' },
                  )}{' '}
                  に読み込み）
                </span>
              )}
            </div>
          )}
          <div className="text-xs">
            認識: {detections.length} 個
            {frameRateHz === null ? (
              <span className="text-warning"> （フレームが来ていない）</span>
            ) : (
              ` （${frameRateHz.toFixed(1)} Hz）`
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoStatusPanel

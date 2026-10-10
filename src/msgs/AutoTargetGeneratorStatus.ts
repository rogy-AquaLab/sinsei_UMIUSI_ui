// ref: sinsei_UMIUSI_core src/sinsei_umiusi_core/auto_target_generator/auto_target_generator.py
// `/auto_target_generator/status` (std_msgs/msg/String) の data に入っている JSON

/** 行動決定の状態 (sinsei_umiusi_core/balloon/mission.py) */
export type MissionState =
  | 'WAIT'
  | 'DIVE'
  | 'APPROACH'
  | 'RAM'
  | 'BACKOFF'
  | 'SEARCH'
  | 'END'
  | 'ERROR'

export type BalloonColor = 'yellow' | 'red' | 'blue'

export type AutoDetection = {
  color: BalloonColor
  /** 画像中心が 0、右が +、端が ±1 */
  x: number
  /** 画像中心が 0、下が +、端が ±1 */
  y: number
  /** 外接円の半径 / 画像の幅 */
  r: number
}

export type AutoCommand = {
  /** + = 前進 */
  surge: number
  /** + = 浮上 */
  heave: number
  /** + = 左旋回 [rad/s] */
  yaw_rate: number
  hold_yaw: boolean
}

export type AutoStatus = {
  state: MissionState
  /** 狙っている色。無ければ null */
  target: BalloonColor | null
  cmd: AutoCommand
  /** この周期で新しいフレームを処理したか。false のとき detections は空 */
  new_frame: boolean
  detections: AutoDetection[]
}

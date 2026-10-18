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
  /** AUTO でない間の認識だけの表示（core の preview）。指令は出していない */
  | 'PREVIEW'

export type BalloonColor = 'yellow' | 'red' | 'blue'

export type AutoDetection = {
  color: BalloonColor
  /** 画像中心が 0、右が +、端が ±1 */
  x: number
  /** 画像中心が 0、下が +、端が ±1 */
  y: number
  /** 外接円の半径 / 画像の幅 */
  r: number
  /** 確信度（CNN の検出だけ意味がある。色の検出は 1。古い core には無い） */
  s?: number
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
  /** 今使っている色の設定（古い core には無い） */
  config?: {
    /** 読んだファイル名（例: current.json） */
    file: string
    /** 読んだ時刻 [s, UNIX] */
    loaded_at: number
    /** current.json を読めず、同梱の設定で動いている */
    fallback: boolean
  }
  /** 検出のしかた。'cnn' = 学習した CNN、'hsv' = 色のしきい値（古い core には無い = hsv） */
  detector?: 'hsv' | 'cnn'
  /** CNN のモデルのファイル名（detector が cnn のときだけ） */
  cnn_model?: string | null
  detections: AutoDetection[]
}

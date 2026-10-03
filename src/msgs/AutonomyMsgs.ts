import type * as StdMsgs from '@/msgs/StdMsgs'

// ref: sinsei_UMIUSI_autonomy umiusi_autonomy_msgs/msg

export type BalloonDetection = {
  /** "red" | "yellow" | "blue" */
  colour: string
  points: number
  /** [rad] + = 画像の右 */
  azimuth: number
  /** [rad] + = 光軸より上 */
  elevation: number
  range_m: number
  confidence: number
  bbox: number[]
  centroid: number[]
  area_px: number
}

export type BalloonDetectionArray = {
  header: StdMsgs.Header
  detections: BalloonDetection[]
}

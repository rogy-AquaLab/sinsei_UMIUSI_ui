export type Time = {
  sec: number
  nanosec?: number
}

export type ColorRGBA = {
  r: number
  g: number
  b: number
  a: number
}

export type Header = {
  stamp: Time
  frame_id: string
}

export type Time = {
  sec: number
  nanosec?: number
}

export type Header = {
  stamp: Time
  frame_id: string
}

export type ColorRGBA = {
  r: number
  g: number
  b: number
  a: number
}

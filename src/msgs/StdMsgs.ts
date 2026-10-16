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

export type Float64 = {
  data: number
}

export type UInt8 = {
  data: number
}

export type Empty = Record<string, never>

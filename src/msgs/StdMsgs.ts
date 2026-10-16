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

export type Float64 = {
  data: number
}

export type UInt8 = {
  data: number
}

export type Empty = Record<string, never>

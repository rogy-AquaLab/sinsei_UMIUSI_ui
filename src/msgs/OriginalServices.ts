import type { RobotModeNum } from '@/msgs/utils/RobotMode'

export type PowerOnResponse = {
  success: boolean
  error_msg: string
}

export type PowerOffResponse = {
  success: boolean
  error_msg: string
}

export type SetModeRequest = {
  mode: RobotModeNum
}

export type SetModeResponse = {
  success: boolean
  error_msg: string
}

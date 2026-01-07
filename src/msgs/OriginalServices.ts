import type { RobotModeNum } from '@/msgs/utils/RobotMode'

export type PowerOnResponce = {
  success: boolean
  error_msg: string
}

export type PowerOffResponce = {
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

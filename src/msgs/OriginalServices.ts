import { RobotMode } from '@/msgs/utils/RobotMode'

export type PowerOnResponce = {
  success: boolean
  error_msg: string
}

export type PowerOffResponce = {
  success: boolean
  error_msg: string
}

export type SetModeRequest = {
  mode: RobotMode
}

export type SetModeResponse = {
  success: boolean
  error_msg: string
}

import * as GeometryMsgs from '@/msgs/GeometryMsgs'
import { RobotMode } from '@/msgs/utils/RobotMode'

export type Target = {
  velocity: GeometryMsgs.Vector3
  orientation: GeometryMsgs.Vector3
}

export type RobotState = {
  state: RobotMode
}

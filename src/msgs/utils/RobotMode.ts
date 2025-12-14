export const RobotMode = {
  STANDBY: 0,
  MANUAL: 1,
  AUTO: 2,
  DEBUG: 3,
  POWERED_OFF: -1,
} as const

export type RobotMode = (typeof RobotMode)[keyof typeof RobotMode]

export const robotModeToString = (mode: RobotMode): string => {
  switch (mode) {
    case RobotMode.STANDBY:
      return 'Standby'
    case RobotMode.MANUAL:
      return 'Manual'
    case RobotMode.AUTO:
      return 'Auto'
    case RobotMode.DEBUG:
      return 'Debug'
    case RobotMode.POWERED_OFF:
      return 'Powered Off'
    default:
      return 'Unknown'
  }
}

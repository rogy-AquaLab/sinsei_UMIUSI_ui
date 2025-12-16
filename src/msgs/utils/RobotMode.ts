export const RobotModeMap = {
  STANDBY: 0,
  MANUAL: 1,
  AUTO: 2,
  DEBUG: 3,
  POWERED_OFF: -1,
} as const

export type RobotMode = keyof typeof RobotModeMap

export type RobotModeNum = (typeof RobotModeMap)[RobotMode]

export const robotModeToNum = (mode: RobotMode): RobotModeNum => {
  return RobotModeMap[mode]
}

export const numToRobotMode = (num: RobotModeNum): RobotMode | undefined => {
  return (Object.keys(RobotModeMap) as RobotMode[]).find(
    (key) => RobotModeMap[key] === num,
  )
}

export const robotModeToString = (mode: RobotMode): string => {
  switch (mode) {
    case 'STANDBY':
      return 'Standby'
    case 'MANUAL':
      return 'Manual'
    case 'AUTO':
      return 'Auto'
    case 'DEBUG':
      return 'Debug'
    case 'POWERED_OFF':
      return 'Powered Off'
    default:
      return 'Unknown'
  }
}

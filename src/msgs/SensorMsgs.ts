import type * as StdMsgs from '@/msgs/StdMsgs'

/**
 * Constants matching sensor_msgs/msg/BatteryState.msg.
 */
export const POWER_SUPPLY_STATUS = {
  UNKNOWN: 0,
  CHARGING: 1,
  DISCHARGING: 2,
  NOT_CHARGING: 3,
  FULL: 4,
} as const

export const POWER_SUPPLY_HEALTH = {
  UNKNOWN: 0,
  GOOD: 1,
  OVERHEAT: 2,
  DEAD: 3,
  OVERVOLTAGE: 4,
  UNSPEC_FAILURE: 5,
  COLD: 6,
  WATCHDOG_TIMER_EXPIRE: 7,
  SAFETY_TIMER_EXPIRE: 8,
} as const

/**
 * sensor_msgs/msg/BatteryState message definition.
 * Unavailable values are NaN.
 */
export type BatteryState = {
  header: StdMsgs.Header
  voltage: number // [V]
  temperature: number // [degC]
  current: number // [A], negative when discharging
  charge: number // [Ah]
  capacity: number // [Ah]
  design_capacity: number // [Ah]
  percentage: number // (0.0 ~ 1.0)
  power_supply_status: number
  power_supply_health: number
  power_supply_technology: number
  present: boolean
  cell_voltage: number[] // [V]
  cell_temperature: number[] // [degC]
  location: string
  serial_number: string
}

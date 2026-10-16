import type * as GeometryMsgs from '@/msgs/GeometryMsgs'
import type * as StdMsgs from '@/msgs/StdMsgs'
import type { RobotModeNum } from '@/msgs/utils/RobotMode'

export type Target = {
  velocity: GeometryMsgs.Vector3
  orientation: GeometryMsgs.Vector3
}

export type RobotState = {
  state: RobotModeNum
}

export type HealthCheckResult = {
  is_ok: boolean
}

export const LOW_POWER_CIRCUIT_STATE = {
  OK: 0,
  ERROR: 1,
} as const

export type LowPowerCircuitInfo = {
  can: number
  headlights: number
  imu: number
  indicator_led: number
}

export const HIGH_POWER_CIRCUIT_STATE = {
  OK: 0,
  ERROR: 1,
} as const

export type HighPowerCircuitInfo = {
  bms: number
  battery: number
  esc_lf: number
  esc_lb: number
  esc_rb: number
  esc_rf: number
}

export const BMS_POWER_SWITCH = {
  UNKNOWN: 0,
  INITIALIZING: 1,
  OFF: 2,
  PRECHARGE: 3,
  ON: 4,
  FAULT: 5,
} as const

export type BmsFaults = {
  precharge: boolean
  short_circuit: boolean
  switch_over_temperature: boolean
  charge_overcurrent: boolean
}

export type BmsState = {
  header: StdMsgs.Header
  state_of_health: number
  cell_voltage_min: number
  cell_voltage_max: number
  balancing: boolean
  charge_allowed: boolean
  cell_balancing: boolean[]
  charger_voltage: number
  // 値が無い温度センサはNaN（rosbridge経由ではnullで届くことがある）
  balance_ic_temperature: number | null
  mosfet_temperature: number | null
  ambient_temperature: number | null
  additional_temperatures: (number | null)[]
  power_switch_state: number
  faults: BmsFaults
}

export type ThrusterMode = {
  esc: number
  servo: number
}

export const THRUSTER_MODE = {
  DISABLED: -1,
  STANDBY: 0,
  RUNNABLE: 1,
} as const

export type ThrusterState = {
  mode: ThrusterMode
  duty_cycle: number
  angle: number
  rpm: number
  input_voltage: number
  water_leaked: boolean
}

export type ThrusterStateAll = {
  lf: ThrusterState
  lb: ThrusterState
  rb: ThrusterState
  rf: ThrusterState
}

export type ThrusterRunnable = {
  esc: boolean
  servo: boolean
}

export type ThrusterRunnableAll = {
  lf: ThrusterRunnable
  lb: ThrusterRunnable
  rb: ThrusterRunnable
  rf: ThrusterRunnable
}

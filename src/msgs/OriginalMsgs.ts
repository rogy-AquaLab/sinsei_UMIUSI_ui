import type * as GeometryMsgs from '@/msgs/GeometryMsgs'
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

export type EscState = {
  voltage: number
  water_leaked: boolean
}

export type HighPowerCircuitInfo = {
  voltage: number
  temperature: number
  water_leaked: boolean
  esc_lf_state: EscState
  esc_lb_state: EscState
  esc_rb_state: EscState
  esc_rf_state: EscState
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
}

export type ThrusterStateAll = {
  lf: ThrusterState
  lb: ThrusterState
  rb: ThrusterState
  rf: ThrusterState
}

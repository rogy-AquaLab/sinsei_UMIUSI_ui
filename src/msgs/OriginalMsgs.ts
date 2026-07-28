import type * as GeometryMsgs from "@/msgs/GeometryMsgs";
import type { RobotModeNum } from "@/msgs/utils/RobotMode";

export type Target = {
  velocity: GeometryMsgs.Vector3;
  orientation: GeometryMsgs.Vector3;
};

export type RobotState = {
  state: RobotModeNum;
};

export type HealthCheckResult = {
  is_ok: boolean;
};

export type ThrusterMode = {
  esc: number;
  servo: number;
};

export const THRUSTER_MODE = {
  DISABLED: -1,
  STANDBY: 0,
  RUNNABLE: 1,
} as const;

export type ThrusterState = {
  mode: ThrusterMode;
  duty_cycle: number;
  angle: number;
  rpm: number;
};

export type ThrusterStateAll = {
  lf: ThrusterState;
  lb: ThrusterState;
  rb: ThrusterState;
  rf: ThrusterState;
};

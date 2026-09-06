import { type RobotMode, robotModeToString } from '@/msgs/utils/RobotMode'
import { useRobotStateStore } from '@/stores/robotStateStore'

type OperationMode = Exclude<RobotMode, 'STANDBY' | 'POWERED_OFF'>
const OPERATION_MODES: OperationMode[] = ['MANUAL', 'AUTO', 'DEBUG']

const OperationModeSelect = () => {
  const mainPowerState = useRobotStateStore((state) => state.mainPowerState)
  const mode = useRobotStateStore((state) => state.mode)
  const modeTransitionState = useRobotStateStore(
    (state) => state.modeTransitionState,
  )
  const operationMode = useRobotStateStore((state) => state.operationMode)
  const setOperationMode = useRobotStateStore((state) => state.setOperationMode)

  return (
    <select
      className="select"
      id="mode-select"
      disabled={
        (mainPowerState === 'on' && mode !== 'STANDBY') ||
        modeTransitionState === 'transitioning'
      }
      value={operationMode}
      onChange={(e) => setOperationMode(e.target.value as OperationMode)}
    >
      {OPERATION_MODES.map((mode) => {
        return (
          <option key={mode} value={mode}>
            {robotModeToString(mode)}
          </option>
        )
      })}
    </select>
  )
}

export default OperationModeSelect

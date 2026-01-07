import { useRobotState } from '@/hooks/useRobotState'
import { type RobotMode, robotModeToString } from '@/msgs/utils/RobotMode'

type OperationMode = Exclude<RobotMode, 'STANDBY' | 'POWERED_OFF'>
const OPERATION_MODES: OperationMode[] = ['MANUAL', 'AUTO', 'DEBUG']

const OperationModeSelect = () => {
  const {
    mainPowerState,
    mode,
    modeTransitionState,
    operationMode,
    setOperationMode,
  } = useRobotState()

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

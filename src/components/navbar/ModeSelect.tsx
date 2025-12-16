import { useRobotState } from '@/hooks/useRobotState'
import {
  RobotModeMap,
  type RobotMode,
  robotModeToString,
} from '@/msgs/utils/RobotMode'

const ModeSelect = () => {
  const { mainPowerState, mode, setMode } = useRobotState()
  // mode: RobotModeNum | null を想定

  return (
    <label className="select">
      <span className="label">Mode</span>
      <select
        className="select"
        id="mode-select"
        disabled={mainPowerState !== 'on'}
        value={mode ?? ''}
        onChange={(e) => {
          const selectedMode = e.target.value
          if (selectedMode === '') return

          setMode(selectedMode as RobotMode)
        }}
      >
        {(Object.keys(RobotModeMap) as RobotMode[]).map((mode) => {
          return (
            <option key={mode} value={mode} disabled={mode === 'POWERED_OFF'}>
              {robotModeToString(mode)}
            </option>
          )
        })}
      </select>
    </label>
  )
}

export default ModeSelect

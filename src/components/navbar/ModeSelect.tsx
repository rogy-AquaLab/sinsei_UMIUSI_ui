import { useRobotState } from '@/hooks/useRobotState'
import { RobotMode, robotModeToString } from '@/msgs/utils/RobotMode'

const ModeSelect = () => {
  const { mainPowerState, mode, setMode } = useRobotState()

  return (
    <label className="select">
      <span className="label">Mode</span>
      <select
        className="select"
        id="mode-select"
        disabled={mainPowerState !== 'on'}
        value={mode ?? ''}
        onChange={(e) => {
          const selectedMode = e.target.value ? Number(e.target.value) : null
          if (selectedMode !== null) {
            setMode(selectedMode as RobotMode)
          }
        }}
      >
        {Object.values(RobotMode).map((mode) => (
          <option
            key={mode}
            value={mode}
            disabled={mode === RobotMode.POWERED_OFF}
          >
            {robotModeToString(mode)}
          </option>
        ))}
      </select>
    </label>
  )
}

export default ModeSelect

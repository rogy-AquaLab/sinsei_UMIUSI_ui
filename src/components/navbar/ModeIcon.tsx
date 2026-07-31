import {
  FaHandPaper,
  FaPauseCircle,
  FaQuestionCircle,
  FaRobot,
} from 'react-icons/fa'
import { robotModeToString } from '@/msgs/utils/RobotMode'
import { useRobotStateStore } from '@/stores/robotStateStore'

const ModeIcon = () => {
  const mode = useRobotStateStore((state) => state.mode)

  const tone =
    mode === null
      ? 'text-base-content/30'
      : mode === 'POWERED_OFF'
        ? 'text-error'
        : 'text-primary'

  return (
    <div
      className={`tooltip tooltip-bottom text-2xl ${tone}`}
      data-tip={`${mode ? robotModeToString(mode) : 'Unknown'} Mode`}
    >
      {mode === null ? (
        <FaQuestionCircle />
      ) : mode === 'POWERED_OFF' ? (
        <FaPauseCircle />
      ) : mode === 'STANDBY' ? (
        <FaPauseCircle />
      ) : mode === 'MANUAL' ? (
        <FaHandPaper />
      ) : mode === 'AUTO' ? (
        <FaRobot />
      ) : (
        <FaQuestionCircle />
      )}
    </div>
  )
}

export default ModeIcon

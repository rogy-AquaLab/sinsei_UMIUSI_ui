import {
  FaHandPaper,
  FaPauseCircle,
  FaQuestionCircle,
  FaRobot,
} from 'react-icons/fa'
import StatusIcon from '@/components/navbar/StatusIcon'
import { robotModeToString } from '@/msgs/utils/RobotMode'
import { useRobotStateStore } from '@/stores/robotStateStore'

const ModeIcon = () => {
  const mode = useRobotStateStore((state) => state.mode)

  const tone = mode === null || mode === 'POWERED_OFF' ? 'muted' : 'info'
  const Icon =
    mode === null
      ? FaQuestionCircle
      : mode === 'POWERED_OFF' || mode === 'STANDBY'
        ? FaPauseCircle
        : mode === 'MANUAL'
          ? FaHandPaper
          : mode === 'AUTO'
            ? FaRobot
            : FaQuestionCircle

  return (
    <StatusIcon
      icon={Icon}
      label={`${mode ? robotModeToString(mode) : 'Unknown'} Mode`}
      tone={tone}
    />
  )
}

export default ModeIcon

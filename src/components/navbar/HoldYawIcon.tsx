import { FaCompass } from 'react-icons/fa'
import StatusIcon from '@/components/navbar/StatusIcon'
import { useAttitudeTargetStore } from '@/stores/attitudeTargetStore'

const HoldYawIcon = () => {
  const holdYaw = useAttitudeTargetStore((state) => state.holdYaw)
  const controlMode = useAttitudeTargetStore((state) => state.controlMode)

  if (holdYaw === null) {
    return (
      <StatusIcon icon={FaCompass} label="方位保持: 指令なし" tone="muted" />
    )
  }
  if (!holdYaw) {
    return (
      <StatusIcon icon={FaCompass} label="方位保持: OFF" tone="muted" />
    )
  }
  if (controlMode === 'ff') {
    return (
      <StatusIcon
        icon={FaCompass}
        label="方位保持: ON だが ff モードなので効かない"
        tone="warning"
      />
    )
  }
  return (
    <StatusIcon
      icon={FaCompass}
      label={`方位保持: ON${controlMode === null ? ' (制御モード不明)' : ''}`}
      tone="success"
    />
  )
}

export default HoldYawIcon

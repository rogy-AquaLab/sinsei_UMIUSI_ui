import { FaLink, FaUnlink } from 'react-icons/fa'
import StatusIcon, { type StatusIconTone } from '@/components/navbar/StatusIcon'
import { useRosStore } from '@/stores/rosStore'

const RosConnectionStatusIcon = () => {
  const connectionState = useRosStore((state) => state.connectionState)
  const isConnected = connectionState === 'connected'
  const isDisconnected = connectionState === 'disconnected'
  const Icon = isDisconnected ? FaUnlink : FaLink
  const config: { label: string; tone: StatusIconTone } = isConnected
    ? {
        label: 'ROS connected',
        tone: 'success',
      }
    : isDisconnected
      ? {
          label: 'ROS disconnected',
          tone: 'muted',
        }
      : {
          label: 'ROS connection changing',
          tone: 'warning',
        }

  return <StatusIcon icon={Icon} label={config.label} tone={config.tone} />
}

export default RosConnectionStatusIcon

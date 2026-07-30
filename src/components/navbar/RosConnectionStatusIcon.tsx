import { FaLink, FaUnlink } from 'react-icons/fa'
import { useRos } from '@/hooks/useRos'

const RosConnectionStatusIcon = () => {
  const { connectionState } = useRos()
  const isConnected = connectionState === 'connected'
  const isDisconnected = connectionState === 'disconnected'
  const Icon = isDisconnected ? FaUnlink : FaLink
  const config = isConnected
    ? {
        label: 'ROS connected',
        tone: 'text-success',
      }
    : isDisconnected
      ? {
          label: 'ROS disconnected',
          tone: 'text-base-content/30',
        }
      : {
          label: 'ROS connection changing',
          tone: 'text-warning',
        }

  return (
    <div
      className={`tooltip tooltip-bottom text-2xl ${config.tone}`}
      data-tip={config.label}
      role="img"
      aria-label={config.label}
    >
      <Icon />
    </div>
  )
}

export default RosConnectionStatusIcon

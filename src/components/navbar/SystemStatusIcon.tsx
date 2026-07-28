import { FaHeartbeat } from 'react-icons/fa'
import { useHealth } from '@/hooks/useHealth'
import { useRos } from '@/hooks/useRos'
import { useThrusterState } from '@/hooks/useThrusterState'

const SystemStatusIcon = () => {
  const { connectionState } = useRos()
  const { overallStatus } = useHealth()
  const { telemetryStatus } = useThrusterState()
  const isTransitioning =
    connectionState === 'connecting' ||
    connectionState === 'cancel_connecting' ||
    connectionState === 'disconnecting'

  const config =
    connectionState === 'disconnected'
      ? {
          label: 'ROS disconnected',
          tone: 'text-error',
        }
      : isTransitioning
        ? {
            label: 'Connection changing',
            tone: 'text-warning',
          }
        : overallStatus === 'error'
          ? {
              label: 'Health check failed',
              tone: 'text-error',
            }
          : overallStatus === 'stale'
            ? {
                label: 'Health data outdated',
                tone: 'text-warning',
              }
            : overallStatus === 'unknown'
              ? {
                  label: 'Health status unknown',
                  tone: 'text-base-content/30',
                }
              : telemetryStatus === 'stale'
                ? {
                    label: 'Thruster telemetry outdated',
                    tone: 'text-warning',
                  }
                : telemetryStatus === 'unknown'
                  ? {
                      label: 'Thruster telemetry unavailable',
                      tone: 'text-base-content/30',
                    }
                  : {
                      label: 'Health check passed',
                      tone: 'text-success',
                    }

  return (
    <div
      className={`tooltip tooltip-bottom text-2xl ${config.tone}`}
      data-tip={config.label}
      role="img"
      aria-label={config.label}
    >
      <FaHeartbeat className={isTransitioning ? 'animate-pulse' : ''} />
    </div>
  )
}

export default SystemStatusIcon

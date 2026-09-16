import { FaHeartbeat } from 'react-icons/fa'
import StatusIcon, { type StatusIconTone } from '@/components/navbar/StatusIcon'
import { useHealthStore } from '@/stores/healthStore'
import { useRosStore } from '@/stores/rosStore'
import { useThrusterStateStore } from '@/stores/thrusterStateStore'

const SystemStatusIcon = () => {
  const connectionState = useRosStore((state) => state.connectionState)
  const overallStatus = useHealthStore((state) => state.overallStatus)
  const telemetryStatus = useThrusterStateStore(
    (state) => state.telemetryStatus,
  )

  const config: { label: string; tone: StatusIconTone } =
    connectionState !== 'connected'
      ? {
          label: 'System status unavailable',
          tone: 'muted',
        }
      : overallStatus === 'error'
        ? {
            label: 'Health check failed',
            tone: 'error',
          }
        : overallStatus === 'stale'
          ? {
              label: 'Health data outdated',
              tone: 'warning',
            }
          : overallStatus === 'unknown'
            ? {
                label: 'Health status unknown',
                tone: 'warning',
              }
            : telemetryStatus === 'stale'
              ? {
                  label: 'Thruster telemetry outdated',
                  tone: 'warning',
                }
              : telemetryStatus === 'unknown'
                ? {
                    label: 'Thruster telemetry unavailable',
                    tone: 'warning',
                  }
                : {
                    label: 'System status normal',
                    tone: 'success',
                  }

  return (
    <StatusIcon icon={FaHeartbeat} label={config.label} tone={config.tone} />
  )
}

export default SystemStatusIcon

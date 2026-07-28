import {
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaMicrochip,
  FaPlug,
  FaQuestionCircle,
} from 'react-icons/fa'
import type { HealthReading, HealthStatus } from '@/contexts/HealthContext'
import { useHealth } from '@/hooks/useHealth'
import { useRos } from '@/hooks/useRos'

const statusConfig: Record<
  HealthStatus,
  {
    label: string
    badgeTone: string
    icon: typeof FaCheckCircle
  }
> = {
  ok: { label: 'OK', badgeTone: 'badge-success', icon: FaCheckCircle },
  error: {
    label: 'Error',
    badgeTone: 'badge-error',
    icon: FaExclamationTriangle,
  },
  stale: { label: 'Timeout', badgeTone: 'badge-warning', icon: FaClock },
  unknown: {
    label: 'No data',
    badgeTone: 'badge-ghost',
    icon: FaQuestionCircle,
  },
}

const formatReceivedAt = (reading: HealthReading | null) => {
  if (!reading) return 'Never received'
  return `Last update ${new Date(reading.receivedAt).toLocaleTimeString()}`
}

type HealthRowProps = {
  icon: typeof FaMicrochip
  label: string
  status: HealthStatus
  reading: HealthReading | null
}

const HealthRow = ({ icon: Icon, label, status, reading }: HealthRowProps) => {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center justify-between gap-4 border-t border-base-300 py-4 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="shrink-0 text-lg text-base-content/60" />
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          <p className="truncate text-xs text-base-content/50">
            {formatReceivedAt(reading)}
          </p>
        </div>
      </div>
      <div className={`badge badge-soft shrink-0 ${config.badgeTone}`}>
        <StatusIcon />
        {config.label}
      </div>
    </div>
  )
}

const HealthPanel = () => {
  const {
    lowPower,
    highPower,
    lowPowerStatus,
    highPowerStatus,
    overallStatus,
  } = useHealth()
  const { connectionState } = useRos()
  const overall = statusConfig[overallStatus]
  const OverallIcon = overall.icon

  const isConnected = connectionState === 'connected'
  const isDisconnected = connectionState === 'disconnected'
  const connectionLabel = isConnected
    ? 'Connected'
    : isDisconnected
      ? 'Disconnected'
      : 'Connecting'
  const connectionTone = isConnected
    ? 'badge-success'
    : isDisconnected
      ? 'badge-error'
      : 'badge-warning'

  return (
    <section className="rounded-xl border border-base-300 bg-base-200/60 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Health Check</h2>
        <div className={`badge badge-soft ${overall.badgeTone}`}>
          <OverallIcon />
          {overall.label}
        </div>
      </div>

      <HealthRow
        icon={FaMicrochip}
        label="Low power circuit"
        status={lowPowerStatus}
        reading={lowPower}
      />
      <HealthRow
        icon={FaBolt}
        label="High power circuit"
        status={highPowerStatus}
        reading={highPower}
      />
      <div className="flex items-center justify-between gap-4 border-t border-base-300 py-4">
        <div className="flex items-center gap-3">
          <FaPlug className="text-lg text-base-content/60" />
          <p className="font-medium">ROS connection</p>
        </div>
        <div className={`badge badge-soft ${connectionTone}`}>
          {connectionLabel}
        </div>
      </div>
    </section>
  )
}

export default HealthPanel

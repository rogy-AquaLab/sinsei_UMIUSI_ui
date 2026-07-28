import type { ReactNode } from 'react'
import {
  FaBolt,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaMicrochip,
  FaPlug,
  FaQuestionCircle,
} from 'react-icons/fa'
import type { HealthStatus } from '@/contexts/HealthContext'
import { useHealth } from '@/hooks/useHealth'
import { useRos } from '@/hooks/useRos'
import {
  type EscState,
  LOW_POWER_CIRCUIT_STATE,
  type LowPowerCircuitInfo,
} from '@/msgs/OriginalMsgs'

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

type ReceivedReading = {
  receivedAt: number
}

const formatReceivedAt = (reading: ReceivedReading | null) => {
  if (!reading) return 'Never received'
  return `Last update ${new Date(reading.receivedAt).toLocaleTimeString()}`
}

type HealthRowProps = {
  icon: typeof FaMicrochip
  label: string
  status: HealthStatus
  reading: ReceivedReading | null
  children?: ReactNode
}

const HealthRow = ({
  icon: Icon,
  label,
  status,
  reading,
  children,
}: HealthRowProps) => {
  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="border-t border-base-300 py-4 first:border-t-0">
      <div className="flex items-center justify-between gap-4">
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
      {children}
    </div>
  )
}

const LowPowerDetails = ({ info }: { info: LowPowerCircuitInfo }) => {
  const items = [
    ['CAN', info.can],
    ['Headlights', info.headlights],
    ['IMU', info.imu],
    ['Indicator LED', info.indicator_led],
  ] as const

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-base-100 p-3">
      {items.map(([label, state]) => {
        const isOk = state === LOW_POWER_CIRCUIT_STATE.OK
        const isError = state === LOW_POWER_CIRCUIT_STATE.ERROR
        return (
          <div key={label} className="flex items-center justify-between gap-2">
            <span className="text-sm">{label}</span>
            <span
              className={`badge badge-soft badge-sm ${
                isOk ? 'badge-success' : isError ? 'badge-error' : 'badge-ghost'
              }`}
            >
              {isOk ? 'OK' : isError ? 'Error' : 'Unknown'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const formatValue = (value: number, unit: string) =>
  Number.isFinite(value) ? `${value.toFixed(1)} ${unit}` : '--'

const EscDetails = ({ label, state }: { label: string; state: EscState }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span>{label}</span>
    <span className={state.water_leaked ? 'text-error' : ''}>
      {formatValue(state.voltage, 'V')} · {state.water_leaked ? 'Leak' : 'Dry'}
    </span>
  </div>
)

const HealthPanel = () => {
  const {
    lowPower,
    highPower,
    lowPowerInfo,
    highPowerInfo,
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
        reading={lowPowerInfo ?? lowPower}
      >
        {lowPowerInfo && <LowPowerDetails info={lowPowerInfo.value} />}
      </HealthRow>
      <HealthRow
        icon={FaBolt}
        label="High power circuit"
        status={highPowerStatus}
        reading={highPowerInfo ?? highPower}
      >
        {highPowerInfo && (
          <div className="mt-3 space-y-2 rounded-lg bg-base-100 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span>Battery</span>
              <span className="text-right">
                {formatValue(highPowerInfo.value.voltage, 'V')}
              </span>
              <span>Temperature</span>
              <span className="text-right">
                {formatValue(highPowerInfo.value.temperature, '°C')}
              </span>
              <span>Hull</span>
              <span
                className={`text-right ${
                  highPowerInfo.value.water_leaked ? 'text-error' : ''
                }`}
              >
                {highPowerInfo.value.water_leaked ? 'Leak' : 'Dry'}
              </span>
            </div>
            <div className="space-y-1 border-t border-base-300 pt-2">
              <EscDetails
                label="ESC LF"
                state={highPowerInfo.value.esc_lf_state}
              />
              <EscDetails
                label="ESC LB"
                state={highPowerInfo.value.esc_lb_state}
              />
              <EscDetails
                label="ESC RB"
                state={highPowerInfo.value.esc_rb_state}
              />
              <EscDetails
                label="ESC RF"
                state={highPowerInfo.value.esc_rf_state}
              />
            </div>
          </div>
        )}
      </HealthRow>
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

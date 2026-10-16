import { FaClock, FaQuestionCircle, FaTachometerAlt } from 'react-icons/fa'
import { THRUSTER_MODE, type ThrusterState } from '@/msgs/OriginalMsgs'
import {
  type ActuatorName,
  type ActuatorTelemetryStatus,
  useActuatorStateStore,
} from '@/stores/actuatorStateStore'

const rows: {
  key: ActuatorName
  shortLabel: string
  label: string
  hasServo: boolean
}[] = [
  { key: 'thruster1', shortLabel: 'T1', label: 'Front left', hasServo: true },
  { key: 'thruster2', shortLabel: 'T2', label: 'Front right', hasServo: true },
  { key: 'thruster3', shortLabel: 'T3', label: 'Rear', hasServo: true },
  {
    key: 'crawler_left',
    shortLabel: 'CL',
    label: 'Crawler left',
    hasServo: false,
  },
  {
    key: 'crawler_right',
    shortLabel: 'CR',
    label: 'Crawler right',
    hasServo: false,
  },
]

const modeConfig: Record<number, { label: string; badgeTone: string }> = {
  [THRUSTER_MODE.DISABLED]: { label: 'Disabled', badgeTone: 'badge-ghost' },
  [THRUSTER_MODE.STANDBY]: { label: 'Standby', badgeTone: 'badge-warning' },
  [THRUSTER_MODE.RUNNABLE]: { label: 'Runnable', badgeTone: 'badge-success' },
}

const getModeConfig = (mode: number) =>
  modeConfig[mode] ?? { label: 'Unknown', badgeTone: 'badge-ghost' }

const telemetryConfig: Record<
  ActuatorTelemetryStatus,
  { label: string; badgeTone: string; icon: typeof FaTachometerAlt }
> = {
  fresh: { label: 'Live', badgeTone: 'badge-success', icon: FaTachometerAlt },
  stale: { label: 'Timeout', badgeTone: 'badge-warning', icon: FaClock },
  unknown: {
    label: 'No data',
    badgeTone: 'badge-ghost',
    icon: FaQuestionCircle,
  },
}

const resolveOverallStatus = (
  statuses: ActuatorTelemetryStatus[],
): ActuatorTelemetryStatus => {
  if (statuses.every((status) => status === 'fresh')) return 'fresh'
  if (statuses.some((status) => status !== 'unknown')) return 'stale'
  return 'unknown'
}

const formatDutyCycle = (state: ThrusterState) =>
  `${(state.duty_cycle * 100).toFixed(1)}%`

const formatAngle = (state: ThrusterState) =>
  `${((state.angle * 180) / Math.PI).toFixed(1)}°`

const formatRpm = (state: ThrusterState) =>
  Math.round(state.rpm).toLocaleString()

const formatVoltage = (state: ThrusterState) =>
  Number.isFinite(state.input_voltage)
    ? `${state.input_voltage.toFixed(1)} V`
    : '--'

const ModeBadge = ({ mode }: { mode: number | undefined }) => {
  const config =
    mode === undefined
      ? { label: 'Unknown', badgeTone: 'badge-ghost' }
      : getModeConfig(mode)
  return (
    <span className={`badge badge-soft badge-sm ${config.badgeTone}`}>
      {config.label}
    </span>
  )
}

const ActuatorPanel = () => {
  const { actuators, telemetryStatus } = useActuatorStateStore()
  const overall =
    telemetryConfig[resolveOverallStatus(Object.values(telemetryStatus))]
  const OverallIcon = overall.icon

  return (
    <section className="min-w-0 rounded-xl border border-base-300 bg-base-200/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span
            className="tooltip tooltip-right"
            data-tip="/state/thruster_state_all, /state/crawler_left, /state/crawler_right"
          >
            Thrusters & crawlers
          </span>
        </h2>
        <div className={`badge badge-soft ${overall.badgeTone}`}>
          <OverallIcon />
          {overall.label}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Actuator</th>
              <th>Motor</th>
              <th>Servo</th>
              <th className="text-right">Duty</th>
              <th className="text-right">Angle</th>
              <th className="text-right">RPM</th>
              <th className="text-right">Voltage</th>
              <th>Water</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const state =
                telemetryStatus[row.key] === 'fresh'
                  ? actuators[row.key]?.state
                  : undefined
              return (
                <tr key={row.key}>
                  <td className="whitespace-nowrap">
                    <span className="font-semibold">{row.shortLabel}</span>
                    <span className="ml-2 text-xs text-base-content/50">
                      {row.label}
                    </span>
                  </td>
                  <td>
                    <ModeBadge mode={state?.mode.esc} />
                  </td>
                  <td>
                    {row.hasServo ? (
                      <ModeBadge mode={state?.mode.servo} />
                    ) : (
                      <span className="text-base-content/40">—</span>
                    )}
                  </td>
                  <td className="text-right font-mono">
                    {state ? formatDutyCycle(state) : '--'}
                  </td>
                  <td className="text-right font-mono">
                    {state && row.hasServo ? formatAngle(state) : '--'}
                  </td>
                  <td className="text-right font-mono">
                    {state ? formatRpm(state) : '--'}
                  </td>
                  <td className="text-right font-mono">
                    {state ? formatVoltage(state) : '--'}
                  </td>
                  <td>
                    {state ? (
                      <span
                        className={`badge badge-soft badge-sm ${
                          state.water_leaked ? 'badge-error' : 'badge-success'
                        }`}
                      >
                        {state.water_leaked ? 'Leak' : 'Dry'}
                      </span>
                    ) : (
                      <span className="badge badge-soft badge-sm badge-ghost">
                        Unknown
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ActuatorPanel

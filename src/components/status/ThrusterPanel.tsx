import { FaClock, FaQuestionCircle, FaTachometerAlt } from 'react-icons/fa'
import { useThrusterState } from '@/hooks/useThrusterState'
import {
  THRUSTER_MODE,
  type ThrusterState,
  type ThrusterStateAll,
} from '@/msgs/OriginalMsgs'

type ThrusterPosition = keyof ThrusterStateAll

const positions: {
  key: ThrusterPosition
  shortLabel: string
  label: string
}[] = [
  {
    key: 'lf',
    shortLabel: 'LF',
    label: 'Left front',
  },
  {
    key: 'rf',
    shortLabel: 'RF',
    label: 'Right front',
  },
  {
    key: 'lb',
    shortLabel: 'LB',
    label: 'Left back',
  },
  {
    key: 'rb',
    shortLabel: 'RB',
    label: 'Right back',
  },
]

const modeConfig: Record<number, { label: string; badgeTone: string }> = {
  [THRUSTER_MODE.DISABLED]: {
    label: 'Disabled',
    badgeTone: 'badge-ghost',
  },
  [THRUSTER_MODE.STANDBY]: {
    label: 'Standby',
    badgeTone: 'badge-warning',
  },
  [THRUSTER_MODE.RUNNABLE]: {
    label: 'Runnable',
    badgeTone: 'badge-success',
  },
}

const getModeConfig = (mode: number | undefined) =>
  modeConfig[mode ?? Number.NaN] ?? {
    label: 'Unknown',
    badgeTone: 'badge-ghost',
  }

const formatDutyCycle = (thruster: ThrusterState | undefined) =>
  thruster ? `${(thruster.duty_cycle * 100).toFixed(1)}%` : '--'

const formatAngle = (thruster: ThrusterState | undefined) =>
  thruster ? `${((thruster.angle * 180) / Math.PI).toFixed(1)}°` : '--'

const formatRpm = (thruster: ThrusterState | undefined) =>
  thruster ? Math.round(thruster.rpm).toLocaleString() : '--'

const ThrusterPanel = () => {
  const { thrusters, telemetryStatus } = useThrusterState()
  const isFresh = telemetryStatus === 'fresh'

  return (
    <section className="min-w-0 rounded-xl border border-base-300 bg-base-200/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span
            className="tooltip tooltip-right"
            data-tip="/state/thruster_state_all"
          >
            Thrusters
          </span>
        </h2>
        <div
          className={`badge badge-soft ${
            telemetryStatus === 'fresh'
              ? 'badge-success'
              : telemetryStatus === 'stale'
                ? 'badge-warning'
                : 'badge-ghost'
          }`}
        >
          {telemetryStatus === 'fresh' ? (
            <FaTachometerAlt />
          ) : telemetryStatus === 'stale' ? (
            <FaClock />
          ) : (
            <FaQuestionCircle />
          )}
          {telemetryStatus === 'fresh'
            ? 'Live'
            : telemetryStatus === 'stale'
              ? 'Timeout'
              : 'No data'}
        </div>
      </div>

      <div className="min-w-0 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Position</th>
              <th>ESC</th>
              <th>Servo</th>
              <th className="text-right">Duty</th>
              <th className="text-right">Angle</th>
              <th className="text-right">RPM</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const thruster = thrusters?.[position.key]
              const escMode = getModeConfig(thruster?.mode.esc)
              const servoMode = getModeConfig(thruster?.mode.servo)
              return (
                <tr key={position.key}>
                  <td className="whitespace-nowrap">
                    <span className="font-semibold">{position.shortLabel}</span>
                    <span className="ml-2 text-xs text-base-content/50">
                      {position.label}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-soft badge-sm ${
                        isFresh ? escMode.badgeTone : 'badge-ghost'
                      }`}
                    >
                      {isFresh ? escMode.label : 'Unknown'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-soft badge-sm ${
                        isFresh ? servoMode.badgeTone : 'badge-ghost'
                      }`}
                    >
                      {isFresh ? servoMode.label : 'Unknown'}
                    </span>
                  </td>
                  <td className="text-right font-mono">
                    {isFresh ? formatDutyCycle(thruster) : '--'}
                  </td>
                  <td className="text-right font-mono">
                    {isFresh ? formatAngle(thruster) : '--'}
                  </td>
                  <td className="text-right font-mono">
                    {isFresh ? formatRpm(thruster) : '--'}
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

export default ThrusterPanel

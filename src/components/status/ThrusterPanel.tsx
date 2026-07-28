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
  rect: { x: number; y: number; rotation: number; cx: number; cy: number }
  text: { x: number; y: number }
}[] = [
  {
    key: 'lf',
    shortLabel: 'LF',
    label: 'Left front',
    rect: { x: 130, y: 86, rotation: -45, cx: 170, cy: 100 },
    text: { x: 104, y: 58 },
  },
  {
    key: 'rf',
    shortLabel: 'RF',
    label: 'Right front',
    rect: { x: 290, y: 86, rotation: 45, cx: 330, cy: 100 },
    text: { x: 396, y: 58 },
  },
  {
    key: 'lb',
    shortLabel: 'LB',
    label: 'Left back',
    rect: { x: 130, y: 246, rotation: 45, cx: 170, cy: 260 },
    text: { x: 104, y: 310 },
  },
  {
    key: 'rb',
    shortLabel: 'RB',
    label: 'Right back',
    rect: { x: 290, y: 246, rotation: -45, cx: 330, cy: 260 },
    text: { x: 396, y: 310 },
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

const getThrusterTone = (
  thruster: ThrusterState | undefined,
  fresh: boolean,
) => {
  if (!fresh || !thruster) {
    return 'fill-base-300 stroke-base-content/30'
  }
  switch (thruster.mode.esc) {
    case THRUSTER_MODE.RUNNABLE:
      return 'fill-success/30 stroke-success'
    case THRUSTER_MODE.STANDBY:
      return 'fill-warning/30 stroke-warning'
    default:
      return 'fill-base-300 stroke-base-content/30'
  }
}

const formatDutyCycle = (thruster: ThrusterState | undefined) =>
  thruster ? `${(thruster.duty_cycle * 100).toFixed(1)}%` : '--'

const formatAngle = (thruster: ThrusterState | undefined) =>
  thruster ? `${((thruster.angle * 180) / Math.PI).toFixed(1)}°` : '--'

const formatRpm = (thruster: ThrusterState | undefined) =>
  thruster ? Math.round(thruster.rpm).toLocaleString() : '--'

const ThrusterPanel = () => {
  const { thrusters, receivedAt, telemetryStatus } = useThrusterState()
  const isFresh = telemetryStatus === 'fresh'

  return (
    <section className="min-w-0 rounded-xl border border-base-300 bg-base-200/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Thrusters</h2>
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

      <div className="grid gap-5 lg:grid-cols-[minmax(16rem,0.9fr)_minmax(28rem,1.5fr)]">
        <div className="flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 500 360"
            className="w-full max-w-lg"
            role="img"
            aria-label="Top view of the octagonal UMIUSI body and its four thrusters"
          >
            <title>UMIUSI thruster layout</title>
            <polygon
              points="210,83 290,83 347,140 347,220 290,277 210,277 153,220 153,140"
              className="fill-base-100 stroke-base-content/30"
              strokeWidth="3"
            />
            <path
              d="M250 118 L250 158 M238 132 L250 118 L262 132"
              className="fill-none stroke-base-content/50"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="250"
              y="180"
              textAnchor="middle"
              className="fill-base-content/50 text-sm"
            >
              FRONT
            </text>
            {positions.map((position) => {
              const thruster = thrusters?.[position.key]
              return (
                <g key={position.key}>
                  <rect
                    x={position.rect.x}
                    y={position.rect.y}
                    width="80"
                    height="28"
                    rx="5"
                    transform={`rotate(${position.rect.rotation} ${position.rect.cx} ${position.rect.cy})`}
                    className={getThrusterTone(thruster, isFresh)}
                    strokeWidth="3"
                  />
                  <text
                    x={position.text.x}
                    y={position.text.y}
                    textAnchor="middle"
                    className="fill-base-content text-base font-semibold"
                  >
                    {position.shortLabel}
                  </text>
                </g>
              )
            })}
          </svg>
          <p className="text-xs text-base-content/50">
            {receivedAt
              ? `Last update ${new Date(receivedAt).toLocaleTimeString()}`
              : 'Waiting for /state/thruster_state_all'}
          </p>
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
                      <span className="font-semibold">
                        {position.shortLabel}
                      </span>
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
      </div>
    </section>
  )
}

export default ThrusterPanel

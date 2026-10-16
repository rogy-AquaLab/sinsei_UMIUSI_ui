import { useState } from 'react'
import { FaCrosshairs, FaPaperPlane, FaWater } from 'react-icons/fa'
import {
  BALLAST_NAMES,
  BALLAST_STATE,
  type BallastName,
  type BallastState,
  useBallastStore,
} from '@/stores/ballastStore'
import { useRosStore } from '@/stores/rosStore'

const BALLAST_LABELS: Record<BallastName, string> = {
  ballast1: 'Ballast 1 (M1)',
  ballast2: 'Ballast 2 (M2)',
}

const STATE_LABELS: Record<number, string> = {
  [BALLAST_STATE.UNCALIBRATED]: 'Uncalibrated',
  [BALLAST_STATE.APPROACHING_MIN_FAST]: 'Calibrating (approaching min)',
  [BALLAST_STATE.LEAVING_MIN]: 'Calibrating (leaving min)',
  [BALLAST_STATE.APPROACHING_MIN_SLOW]: 'Calibrating (re-approaching min)',
  [BALLAST_STATE.MEASURING_TRAVEL]: 'Measuring travel',
  [BALLAST_STATE.READY]: 'Ready',
  [BALLAST_STATE.FAULT]: 'Fault',
}

const FAULT_REASON_LABELS: Record<number, string> = {
  1: 'SPI communication failed',
  2: 'Driver overcurrent / overheat',
  3: 'Limit switch not reached',
  4: 'Limit switch stuck',
}

const formatPercent = (value: number | null) =>
  value === null ? '--' : `${(value * 100).toFixed(1)} %`

const stateBadge = (ballast: BallastState) => {
  if (ballast.telemetryStatus === 'unknown') {
    return { label: 'No data', tone: 'badge-ghost' }
  }
  if (ballast.telemetryStatus === 'stale') {
    return { label: 'Timeout', tone: 'badge-warning' }
  }
  if (ballast.state === null) {
    return { label: 'No data', tone: 'badge-ghost' }
  }
  const label = STATE_LABELS[ballast.state] ?? `Unknown (${ballast.state})`
  if (ballast.state === BALLAST_STATE.READY) {
    return { label, tone: 'badge-success' }
  }
  if (ballast.state === BALLAST_STATE.FAULT) {
    return { label, tone: 'badge-error' }
  }
  return { label, tone: 'badge-info' }
}

const BallastCard = ({ name }: { name: BallastName }) => {
  const ballast = useBallastStore((store) => store.ballasts[name])
  const setTarget = useBallastStore((store) => store.setTarget)
  const calibrate = useBallastStore((store) => store.calibrate)
  const connected = useRosStore(
    (state) => state.connectionState === 'connected',
  )
  // スライダーは0〜100 %で扱う
  const [targetPercent, setTargetPercent] = useState(0)

  const badge = stateBadge(ballast)
  const ready = ballast.state === BALLAST_STATE.READY
  const fault = ballast.state === BALLAST_STATE.FAULT
  const fill = ballast.position === null ? 0 : ballast.position * 100

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="card-title">
            <FaWater className="text-info" />
            {BALLAST_LABELS[name]}
          </h2>
          <span className={`badge ${badge.tone}`}>{badge.label}</span>
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-base-content/70">
              Water (0 % = drained, 100 % = full)
            </span>
            <span className="font-mono text-lg">
              {formatPercent(ballast.position)}
            </span>
          </div>
          <progress
            className="progress progress-info h-4 w-full"
            value={fill}
            max={100}
          />
        </div>

        {fault && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>
              {FAULT_REASON_LABELS[ballast.faultReason ?? 0] ??
                `Fault (reason ${ballast.faultReason ?? '?'})`}
              . Calibrate to recover.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${name}-target`}
            className="flex justify-between text-sm"
          >
            <span>Target</span>
            <span className="font-mono">{targetPercent} %</span>
          </label>
          <input
            id={`${name}-target`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={targetPercent}
            onChange={(event) => setTargetPercent(Number(event.target.value))}
            className="range range-info range-sm"
          />
          {!ready && ballast.telemetryStatus === 'fresh' && (
            <span className="text-xs text-warning">
              The driver ignores targets until it is ready.
            </span>
          )}
        </div>

        <div className="card-actions justify-end">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => calibrate(name)}
            disabled={!connected}
          >
            <FaCrosshairs />
            Calibrate
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setTarget(name, targetPercent / 100)}
            disabled={!connected}
          >
            <FaPaperPlane />
            Send target
          </button>
        </div>
      </div>
    </div>
  )
}

const BallastPanel = () => (
  <div className="grid gap-6 md:grid-cols-2">
    {BALLAST_NAMES.map((name) => (
      <BallastCard key={name} name={name} />
    ))}
  </div>
)

export default BallastPanel

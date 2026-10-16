import { useDriveStore } from '@/stores/driveStore'

const SWIM_CONTROLS = [
  ['Left stick', 'Forward / back, yaw'],
  ['Right stick', 'Roll, pitch'],
  ['D-pad left / right', 'Sideways'],
  ['L2 / R2', 'Up / down'],
] as const

const CRAWL_CONTROLS = [['Left stick', 'Forward / back, turn']] as const

const DrivePanel = () => {
  const armed = useDriveStore((state) => state.armed)
  const driveMode = useDriveStore((state) => state.driveMode)
  const controls = driveMode === 'swim' ? SWIM_CONTROLS : CRAWL_CONTROLS

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="card-title">Drive</h2>
          <div className="flex gap-2">
            <span className="badge badge-info">
              {driveMode === 'swim' ? 'Swim' : 'Crawl'}
            </span>
            <span
              className={`badge ${armed ? 'badge-success' : 'badge-ghost'}`}
            >
              {armed ? 'Armed' : 'Disarmed'}
            </span>
          </div>
        </div>
        <table className="table table-sm">
          <tbody>
            {controls.map(([input, action]) => (
              <tr key={input}>
                <td className="font-mono">{input}</td>
                <td>{action}</td>
              </tr>
            ))}
            <tr>
              <td className="font-mono">Y</td>
              <td>Switch swim / crawl</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DrivePanel

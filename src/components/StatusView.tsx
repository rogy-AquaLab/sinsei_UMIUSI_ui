import DrivePanel from '@/components/drive/DrivePanel'
import BallastPanel from '@/components/status/BallastPanel'
import BatteryPanel from '@/components/status/BatteryPanel'

const StatusView = () => {
  return (
    <div className="h-full overflow-auto bg-base-100">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alexandrite</h1>
        </div>
        <DrivePanel />
        <BallastPanel />
        <BatteryPanel />
      </div>
    </div>
  )
}

export default StatusView

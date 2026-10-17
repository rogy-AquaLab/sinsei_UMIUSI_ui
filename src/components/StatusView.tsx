import BatteryPanel from '@/components/status/BatteryPanel'
import HealthPanel from '@/components/status/HealthPanel'
import ThrusterPanel from '@/components/status/ThrusterPanel'

const StatusView = () => {
  return (
    <div className="h-full overflow-auto bg-base-100">
      <div className="mx-auto flex min-h-full max-w-7xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            System Status
          </h1>
        </div>
        <div className="grid flex-1 items-start gap-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,2fr)]">
          <HealthPanel />
          <div className="flex min-w-0 flex-col gap-6">
            <ThrusterPanel />
            <BatteryPanel />
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusView

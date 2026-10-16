import { FaShip, FaTruckMonster } from 'react-icons/fa'
import StatusIcon from '@/components/navbar/StatusIcon'
import { useDriveStore } from '@/stores/driveStore'

const DriveStatusIcon = () => {
  const armed = useDriveStore((state) => state.armed)
  const driveMode = useDriveStore((state) => state.driveMode)

  const modeLabel =
    driveMode === 'swim' ? 'Swim (thrusters)' : 'Crawl (crawlers)'
  return (
    <StatusIcon
      icon={driveMode === 'swim' ? FaShip : FaTruckMonster}
      label={`${modeLabel} / ${armed ? 'Armed' : 'Disarmed'} — press Y to switch`}
      tone={armed ? 'success' : 'muted'}
    />
  )
}

export default DriveStatusIcon

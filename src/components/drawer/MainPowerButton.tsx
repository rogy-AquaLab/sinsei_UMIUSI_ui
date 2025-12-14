import { FaPowerOff } from 'react-icons/fa6'
import { useRobotState } from '@/hooks/useRobotState'

const MainPowerButton = () => {
  const { isPoweredOn, setIsPoweredOn, isPowerTransitioning } = useRobotState()

  const isDisabled = isPoweredOn === null || isPowerTransitioning

  const label = isPoweredOn ? 'Disable Main Power' : 'Enable Main Power'
  const tone = isDisabled
    ? 'text-muted'
    : isPoweredOn
      ? 'text-error'
      : 'text-primary'
  return (
    <li className={isDisabled ? 'menu-disabled' : ''}>
      <button
        className={`is-drawer-close:tooltip is-drawer-close:tooltip-left ${tone} ${isDisabled && 'menu-disabled'}`}
        data-tip={label}
        onClick={() => setIsPoweredOn(!isPoweredOn)}
        disabled={isDisabled}
      >
        {isPowerTransitioning ? (
          <span className="loading loading-spinner my-1.5 inline-block size-4" />
        ) : (
          <FaPowerOff className="my-1.5 inline-block size-4" />
        )}
        <span className="is-drawer-close:hidden">{label}</span>
      </button>
    </li>
  )
}

export default MainPowerButton

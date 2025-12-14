import { FaPowerOff } from 'react-icons/fa6'
import { useRobotState } from '@/hooks/useRobotState'

const MainPowerButton = () => {
  const { mainPowerState, setMainPower } = useRobotState()

  const isDisabled =
    mainPowerState === 'unknown' ||
    mainPowerState === 'poweringOn' ||
    mainPowerState === 'poweringOff'
  const isOn = mainPowerState === 'on'
  const isTransitioning =
    mainPowerState === 'poweringOn' || mainPowerState === 'poweringOff'

  let label: string, tone: string
  switch (mainPowerState) {
    case 'unknown':
      label = 'Main Power State: Unknown'
      tone = 'text-muted'
      break
    case 'off':
      label = 'Enable Main Power'
      tone = 'text-primary'
      break
    case 'on':
      label = 'Disable Main Power'
      tone = 'text-error'
      break
    case 'poweringOn':
      label = 'Powering On...'
      tone = 'text-muted'
      break
    case 'poweringOff':
      label = 'Powering Off...'
      tone = 'text-muted'
      break
  }

  return (
    <li className={isDisabled ? 'menu-disabled' : ''}>
      <button
        className={`is-drawer-close:tooltip is-drawer-close:tooltip-left ${tone} ${isDisabled && 'menu-disabled'}`}
        data-tip={label}
        onClick={() => setMainPower(!isOn)}
        disabled={isDisabled}
      >
        {isTransitioning ? (
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

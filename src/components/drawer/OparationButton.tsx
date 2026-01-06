import { FaPlay, FaPause } from 'react-icons/fa6'
import type { ReactElement } from 'react'
import { useRobotState } from '@/hooks/useRobotState'
import { robotModeToString } from '@/msgs/utils/RobotMode'

const OperationButton = () => {
  const {
    mainPowerState,
    mode,
    modeTransitionState,
    operationMode,
    enterOperation,
    enterStandby,
  } = useRobotState()

  const isPoweredOn = mainPowerState === 'on'
  const isStandby = mode === 'STANDBY'
  const isTransitioning = modeTransitionState === 'transitioning'
  const isDisabled =
    !isPoweredOn || mode === null || mode === 'POWERED_OFF' || isTransitioning

  let label: string
  let tone: string
  let icon: ReactElement

  if (isTransitioning) {
    label = 'Switching Operation Mode...'
    tone = 'text-muted'
    icon = <FaPause className="my-1.5 inline-block size-4" />
  } else if (!isPoweredOn || mode === null || mode === 'POWERED_OFF') {
    label = 'Operation Mode: Unknown'
    tone = 'text-muted'
    icon = <FaPause className="my-1.5 inline-block size-4" />
  } else if (isStandby) {
    label = `Enter Operation (${robotModeToString(operationMode)})`
    tone = 'text-primary'
    icon = <FaPlay className="my-1.5 inline-block size-4" />
  } else {
    label = 'Back to Standby'
    tone = 'text-warning'
    icon = <FaPause className="my-1.5 inline-block size-4" />
  }

  return (
    <li className={isDisabled ? 'menu-disabled' : ''}>
      <button
        className={`is-drawer-close:tooltip is-drawer-close:tooltip-left ${tone} ${
          isDisabled && 'menu-disabled'
        }`}
        data-tip={label}
        disabled={isDisabled}
        onClick={() => {
          if (isStandby) {
            enterOperation()
          } else {
            enterStandby()
          }
        }}
      >
        {isTransitioning ? (
          <span className="loading loading-spinner my-1.5 inline-block size-4" />
        ) : (
          icon
        )}
        <span className="is-drawer-close:hidden">{label}</span>
      </button>
    </li>
  )
}

export default OperationButton

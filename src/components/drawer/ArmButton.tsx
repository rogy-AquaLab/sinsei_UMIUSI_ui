import { FaPowerOff } from 'react-icons/fa6'
import { useDriveStore } from '@/stores/driveStore'
import { useGamepadStore } from '@/stores/gamepadStore'
import { useRosStore } from '@/stores/rosStore'

const ArmButton = () => {
  const armed = useDriveStore((state) => state.armed)
  const arm = useDriveStore((state) => state.arm)
  const disarm = useDriveStore((state) => state.disarm)
  const connected = useRosStore(
    (state) => state.connectionState === 'connected',
  )
  const hasGamepad = useGamepadStore((state) => state.selectedIndex !== null)

  const isDisabled = !armed && !(connected && hasGamepad)
  let label: string, tone: string
  if (armed) {
    label = 'Disarm Actuators'
    tone = 'text-error'
  } else if (isDisabled) {
    label = 'Arm Actuators (needs ROS and gamepad)'
    tone = 'text-muted'
  } else {
    label = 'Arm Actuators'
    tone = 'text-primary'
  }

  return (
    <li className={isDisabled ? 'menu-disabled' : ''}>
      <button
        type="button"
        className={`is-drawer-close:tooltip is-drawer-close:tooltip-left ${tone}`}
        data-tip={label}
        onClick={armed ? disarm : arm}
        disabled={isDisabled}
      >
        <FaPowerOff className="my-1.5 inline-block size-4" />
        <span className="is-drawer-close:hidden">{label}</span>
      </button>
    </li>
  )
}

export default ArmButton

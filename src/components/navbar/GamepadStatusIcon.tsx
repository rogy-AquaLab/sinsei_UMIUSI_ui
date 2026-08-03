import { FaGamepad } from 'react-icons/fa'
import { useGamepadStore } from '@/stores/gamepadStore'

const GamepadStatusIcon = () => {
  const gamepads = useGamepadStore((state) => state.gamepads)
  const selectedIndex = useGamepadStore((state) => state.selectedIndex)

  return (
    <div
      className={`tooltip tooltip-bottom text-2xl ${selectedIndex !== null ? 'text-success' : 'text-base-content/30'}`}
      data-tip={
        selectedIndex !== null
          ? gamepads[selectedIndex]?.id
          : 'No Gamepad Connected'
      }
    >
      <FaGamepad />
    </div>
  )
}

export default GamepadStatusIcon

import { FaGamepad } from 'react-icons/fa'
import StatusIcon from '@/components/navbar/StatusIcon'
import { useGamepadStore } from '@/stores/gamepadStore'

const GamepadStatusIcon = () => {
  const gamepads = useGamepadStore((state) => state.gamepads)
  const selectedIndex = useGamepadStore((state) => state.selectedIndex)

  return (
    <StatusIcon
      icon={FaGamepad}
      label={
        selectedIndex !== null
          ? (gamepads[selectedIndex]?.id ?? 'Gamepad connected')
          : 'No Gamepad Connected'
      }
      tone={selectedIndex !== null ? 'success' : 'muted'}
    />
  )
}

export default GamepadStatusIcon

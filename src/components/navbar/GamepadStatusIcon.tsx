import { useContext } from 'react'
import { FaGamepad } from 'react-icons/fa'
import { GamepadContext } from '@/contexts/GamepadContext'

const GamepadStatusIcon = () => {
  const { gamepads, selectedIndex } = useContext(GamepadContext)

  return (
    <div
      className={`tooltip tooltip-bottom text-3xl ${selectedIndex !== null ? 'text-success' : 'text-base-content/30'}`}
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

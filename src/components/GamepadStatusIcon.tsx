import { useContext } from 'react'
import { FaGamepad } from 'react-icons/fa'
import { GamepadContext } from '../contexts/GamepadContext'

const GamepadStatusIcon = () => {
  const { gamepadInUse } = useContext(GamepadContext)

  return (
    <div
      className={`tooltip tooltip-bottom text-3xl ${gamepadInUse ? 'text-success' : 'text-base-content/30'}`}
      data-tip={gamepadInUse?.id ?? 'No Gamepad Connected'}
    >
      <FaGamepad />
    </div>
  )
}

export default GamepadStatusIcon

import { useContext } from 'react'
import { GamepadContext } from '../../contexts/GamepadContext'

const DEFAULT_TEXT = 'No Gamepad Connected'

const GamepadSelect = () => {
  const { gamepads, selectedIndex, selectGamepadByIndex } =
    useContext(GamepadContext)

  return (
    <select
      className="select"
      disabled={Object.keys(gamepads).length === 0}
      value={selectedIndex ?? DEFAULT_TEXT}
      onChange={(e) => {
        const index = e.target.value ? Number(e.target.value) : null
        selectGamepadByIndex?.(index)
      }}
    >
      {Object.keys(gamepads).length === 0 ? (
        <option value="">{DEFAULT_TEXT}</option>
      ) : (
        Object.values(gamepads).map(({ index, id }) => (
          <option key={index} value={index}>
            {`${index}: ${id}`}
          </option>
        ))
      )}
    </select>
  )
}

export default GamepadSelect

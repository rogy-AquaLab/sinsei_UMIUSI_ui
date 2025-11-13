import RosProvider from './RosProvider'
import { GamepadsProvider } from 'react-ts-gamepads'
import GamepadReceiver from './GamepadReceiver'

function App() {
  return (
    <>
      <RosProvider url="ws://umiusi2.local:9090">
        <GamepadsProvider>
          <GamepadReceiver />
        </GamepadsProvider>
      </RosProvider>
    </>
  )
}

export default App

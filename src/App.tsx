import { GamepadsProvider } from 'react-ts-gamepads'
import RosProvider from './RosProvider'
import { GamepadsProvider } from 'react-ts-gamepads'
import GamepadReceiver from './GamepadReceiver'
import NavBar from './components/NavBar'

function App() {
  return (
    <>
      <RosProvider url="ws://umiusi2.local:9090">
        <GamepadsProvider>
          <NavBar />
          <GamepadReceiver />
        </GamepadsProvider>
      </RosProvider>
    </>
  )
}

export default App

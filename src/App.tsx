import { GamepadsProvider } from 'react-ts-gamepads'
import GamepadReceiver from './GamepadReceiver'
import RosProvider from './providers/RosProvider'
import ToastProvider from './providers/ToastProvider'
import NavBar from './components/NavBar'

function App() {
  return (
    <ToastProvider>
      <RosProvider url="ws://localhost:9090">
        <GamepadsProvider>
          <NavBar />
          <GamepadReceiver />
        </GamepadsProvider>
      </RosProvider>
    </ToastProvider>
  )
}

export default App

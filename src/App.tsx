import { GamepadsProvider } from 'react-ts-gamepads'
import RosProvider from './RosProvider'
import NavBar from './components/NavBar'

function App() {
  return (
    <>
      <RosProvider url="ws://localhost:9090">
        <GamepadsProvider>
          <NavBar />
        </GamepadsProvider>
      </RosProvider>
    </>
  )
}

export default App

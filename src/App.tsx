import RosProvider from './RosProvider'
import { GamepadsProvider } from 'react-ts-gamepads'

function App() {
  return (
    <>
      <RosProvider url="ws://localhost:9090">
        <GamepadsProvider>
          <></>
        </GamepadsProvider>
      </RosProvider>
    </>
  )
}

export default App

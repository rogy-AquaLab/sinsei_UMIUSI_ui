import RosConnection from './RosConnection'
import { GamepadsProvider } from 'react-gamepads'

function App() {
  return (
    <>
      <RosConnection url="ws://localhost:9090">
        <GamepadsProvider>
          <></>
        </GamepadsProvider>
      </RosConnection>
    </>
  )
}

export default App

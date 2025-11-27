import { GamepadsProvider } from 'react-ts-gamepads'
import GamepadReceiver from './GamepadReceiver'
import RosProvider from './providers/RosProvider'
import ToastProvider from './providers/ToastProvider'
import NavBar from './components/NavBar'
import CameraViewer from './components/CameraViewer'

function App() {
  return (
    <ToastProvider>
      <RosProvider url="ws://localhost:9090">
        <GamepadsProvider>
          <div className="flex flex-col h-screen overflow-hidden">
            <NavBar />
            <div className="flex-1 min-h-0">
              <div className="flex flex-row w-full h-full">
                <div className="flex-1 min-w-0 min-h-0">
                  <CameraViewer
                    hostname="http://umiusi2.local:8080"
                    topicName="/pi_camera/image_raw"
                    width={1024}
                    height={768}
                  />
                </div>
                <div className="w-[200px] min-w-0 min-h-0">
                  <GamepadReceiver />
                </div>
              </div>
            </div>
          </div>
        </GamepadsProvider>
      </RosProvider>
    </ToastProvider>
  )
}

export default App

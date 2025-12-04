import { GamepadsProvider } from 'react-ts-gamepads'
import { RosProvider } from './contexts/RosContext'
import { ToastProvider } from './contexts/ToastContext'
import NavBar from './components/NavBar'
import Drawer from './components/Drawer'
import CameraViewer from './components/CameraViewer'

function App() {
  return (
    <ToastProvider>
      <RosProvider url="ws://umiusi2.local:9090">
        <GamepadsProvider>
          <Drawer>
            <div className="flex flex-col h-screen overflow-hidden">
              <NavBar />
              <div className="flex-1 min-h-0">
                {/* <div className="flex flex-row w-full h-full">
                <div className="flex-1 min-w-0 min-h-0"> */}
                <CameraViewer
                  hostname="http://umiusi2.local:8080"
                  topicName="/pi_camera/image_raw"
                  width={1024}
                  height={768}
                />
                {/* </div>
                <div className="flex-1 min-w-0 min-h-0">
                  <CameraViewer
                    hostname="http://umiusi2.local:8080"
                    topicName="/usb_camera/image_raw"
                    width={1024}
                    height={768}
                  />
                </div>
              </div> */}
              </div>
            </div>
          </Drawer>
        </GamepadsProvider>
      </RosProvider>
    </ToastProvider>
  )
}

export default App

import { useContext } from 'react'
import Navbar from './components/Navbar'
import Drawer from './components/Drawer'
import CameraViewer from './components/CameraViewer'
import { useGamepadPublisher } from './hooks/useGamepadPublisher'
import { RosContext } from './contexts/RosContext'

function App() {
  const { ros } = useContext(RosContext)

  useGamepadPublisher({ ros })

  return (
    <Drawer>
      <div className="flex flex-col h-screen overflow-hidden">
        <Navbar />
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
  )
}

export default App

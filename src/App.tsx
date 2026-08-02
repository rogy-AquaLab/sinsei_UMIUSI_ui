import { useState } from 'react'
import CameraViewer from '@/components/CameraViewer'
import Drawer from '@/components/Drawer'
import LogsView from '@/components/LogsView'
import Navbar from '@/components/Navbar'
import { useAppRuntime } from '@/hooks/useAppRuntime'
import type { MainContentTab } from '@/types/navigation'

function App() {
  useAppRuntime()
  const [activeTab, setActiveTab] = useState<MainContentTab>('camera')

  return (
    <Drawer>
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex flex-1 min-h-0 flex-col bg-base-200">
          <div className="flex-1 min-h-0">
            {activeTab === 'camera' ? (
              <CameraViewer
                hostname="http://umiusi2.local:8889"
                camName="cam1"
              />
            ) : (
              <LogsView />
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default App

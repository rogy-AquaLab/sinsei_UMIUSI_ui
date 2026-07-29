import { lazy, Suspense, useCallback, useState } from 'react'
import CameraViewer from '@/components/CameraViewer'
import Drawer from '@/components/Drawer'
import LogsView from '@/components/LogsView'
import Navbar from '@/components/Navbar'
import { useGamepadPublisher } from '@/hooks/useGamepadPublisher'
import { useRos } from '@/hooks/useRos'
import type { MainContentTab } from '@/types/navigation'

const TerminalView = lazy(() => import('@/components/TerminalView'))

function App() {
  const { ros } = useRos()
  const [activeTab, setActiveTab] = useState<MainContentTab>('camera')
  const [terminalOpened, setTerminalOpened] = useState(false)

  const handleTabChange = useCallback((tab: MainContentTab) => {
    if (tab === 'terminal') {
      setTerminalOpened(true)
    }
    setActiveTab(tab)
  }, [])

  useGamepadPublisher({ ros })

  return (
    <Drawer>
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
        <div className="flex flex-1 min-h-0 flex-col bg-base-200">
          <div className="flex-1 min-h-0">
            <div
              className={activeTab === 'camera' ? 'h-full' : 'hidden h-full'}
            >
              <CameraViewer
                hostname="http://umiusi2.local:8889"
                camName="cam1"
              />
            </div>
            <div className={activeTab === 'logs' ? 'h-full' : 'hidden h-full'}>
              <LogsView />
            </div>
            {terminalOpened && (
              <div
                className={
                  activeTab === 'terminal' ? 'h-full' : 'hidden h-full'
                }
              >
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <span className="loading loading-spinner loading-lg" />
                    </div>
                  }
                >
                  <TerminalView />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  )
}

export default App

import { useState } from 'react'
import Drawer from '@/components/Drawer'
import Navbar from '@/components/Navbar'
import { useAppRuntime } from '@/hooks/useAppRuntime'
import { DEFAULT_MAIN_TAB, MAIN_TABS, type MainContentTab } from '@/mainTabs'

function App() {
  useAppRuntime()
  const [activeTab, setActiveTab] = useState<MainContentTab>(DEFAULT_MAIN_TAB)
  const activeTabDefinition =
    MAIN_TABS.find(({ id }) => id === activeTab) ?? MAIN_TABS[0]

  return (
    <Drawer>
      <div className="flex h-screen flex-col overflow-hidden">
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex flex-1 min-h-0 flex-col bg-base-200">
          <div className="flex-1 min-h-0">{activeTabDefinition.content}</div>
        </div>
      </div>
    </Drawer>
  )
}

export default App

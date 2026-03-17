import { FaCamera, FaClipboardList } from 'react-icons/fa'
import type { MainContentTab } from '@/types/navigation'

type MainTabsProps = {
  active: MainContentTab
  onChange: (tab: MainContentTab) => void
}

const MainTabs = ({ active, onChange }: MainTabsProps) => {
  return (
    <div
      role="tablist"
      className="tabs tabs-box"
      aria-label="Main content tabs"
    >
      <button
        role="tab"
        className={`tab gap-2 ${active === 'camera' ? 'tab-active' : ''}`}
        onClick={() => onChange('camera')}
      >
        <FaCamera />
        Camera
      </button>
      <button
        role="tab"
        className={`tab gap-2 ${active === 'logs' ? 'tab-active' : ''}`}
        onClick={() => onChange('logs')}
      >
        <FaClipboardList />
        Logs
      </button>
    </div>
  )
}

export default MainTabs

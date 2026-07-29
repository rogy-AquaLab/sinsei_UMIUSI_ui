import { FaCamera, FaClipboardList, FaTerminal } from 'react-icons/fa'
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
        type="button"
        role="tab"
        aria-selected={active === 'camera'}
        className={`tab gap-2 ${active === 'camera' ? 'tab-active' : ''}`}
        onClick={() => onChange('camera')}
      >
        <FaCamera />
        Camera
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'logs'}
        className={`tab gap-2 ${active === 'logs' ? 'tab-active' : ''}`}
        onClick={() => onChange('logs')}
      >
        <FaClipboardList />
        Logs
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'terminal'}
        className={`tab gap-2 ${active === 'terminal' ? 'tab-active' : ''}`}
        onClick={() => onChange('terminal')}
      >
        <FaTerminal />
        Terminal
      </button>
    </div>
  )
}

export default MainTabs

import { MAIN_TABS, type MainContentTab } from '@/mainTabs'

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
      {MAIN_TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`tab gap-2 ${active === id ? 'tab-active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  )
}

export default MainTabs

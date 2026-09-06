import { FaAngleLeft } from 'react-icons/fa'
import GamepadStatusIcon from '@/components/navbar/GamepadStatusIcon'
import MainTabs from '@/components/navbar/MainTabs'
import ModeIcon from '@/components/navbar/ModeIcon'
import RosStatusBadge from '@/components/navbar/RosStatusBadge'
import type { MainContentTab } from '@/mainTabs'

type NavbarProps = {
  activeTab: MainContentTab
  onTabChange: (tab: MainContentTab) => void
}

const Navbar = ({ activeTab, onTabChange }: NavbarProps) => {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <div className="btn btn-ghost text-xl">
          <img
            src="/aqua_logo_light.png"
            alt="Aqua Logo"
            className="h-15 w-15 mr-2"
          />
          SINSEI UMIUSI
        </div>
      </div>
      <div className="navbar-center">
        <MainTabs active={activeTab} onChange={onTabChange} />
      </div>
      <div className="navbar-end">
        <div className="flex items-center gap-5">
          <GamepadStatusIcon />
          <ModeIcon />
          <RosStatusBadge />
          <label
            htmlFor="my-drawer"
            aria-label="open sidebar"
            className="btn btn-square"
          >
            <FaAngleLeft />
          </label>
        </div>
      </div>
    </div>
  )
}

export default Navbar

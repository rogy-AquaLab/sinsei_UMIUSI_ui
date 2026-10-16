import { FaAngleLeft } from 'react-icons/fa'
import CameraStatusIcon from '@/components/navbar/CameraStatusIcon'
import DriveStatusIcon from '@/components/navbar/DriveStatusIcon'
import GamepadStatusIcon from '@/components/navbar/GamepadStatusIcon'
import MainTabs from '@/components/navbar/MainTabs'
import RosConnectionStatusIcon from '@/components/navbar/RosConnectionStatusIcon'
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
          <span className="hidden lg:inline">ALEXANDRITE</span>
        </div>
      </div>
      <div className="navbar-center">
        <MainTabs active={activeTab} onChange={onTabChange} />
      </div>
      <div className="navbar-end">
        <div className="flex items-center gap-5">
          <DriveStatusIcon />
          <GamepadStatusIcon />
          <CameraStatusIcon />
          <RosConnectionStatusIcon />
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

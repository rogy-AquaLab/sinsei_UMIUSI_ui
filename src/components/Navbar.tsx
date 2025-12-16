import { FaAngleLeft } from 'react-icons/fa'
import RosStatusBadge from '@/components/navbar/RosStatusBadge'
import GamepadStatusIcon from '@/components/navbar/GamepadStatusIcon'
import ModeSelect from '@/components/navbar/ModeSelect'

const Navbar = () => {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <a className="btn btn-ghost text-xl">
          <img
            src="/aqua_logo_light.png"
            alt="Aqua Logo"
            className="h-15 w-15 mr-2"
          />
          SINSEI UMIUSI
        </a>
      </div>
      <div className="navbar-end">
        <div className="flex items-center gap-5">
          <ModeSelect />
          <GamepadStatusIcon />
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

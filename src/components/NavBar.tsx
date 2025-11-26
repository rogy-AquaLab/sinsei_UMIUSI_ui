import RosConnectionStatus from './RosConnectionStatus'
import RosConnectButton from './RosConnectButton'
import { FaBars } from 'react-icons/fa'

const DropdownMenu = () => {
  return (
    <div className="dropdown dropdown-end">
      <button tabIndex={0} className="btn">
        <FaBars />
      </button>
      <ul
        tabIndex={-1}
        className="menu dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
      >
        <li>
          <h2 className="menu-title">rosbridge</h2>
          <ul>
            <li>
              <RosConnectButton />
            </li>
          </ul>
          <h2 className="menu-title">Others</h2>
          <ul>
            <li>...</li>
          </ul>
        </li>
      </ul>
    </div>
  )
}

const NavBar = () => {
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
          <RosConnectionStatus />
          <DropdownMenu />
        </div>
      </div>
    </div>
  )
}

export default NavBar

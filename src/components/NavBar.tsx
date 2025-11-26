import ConnectionStatus from './ConnectionStatus'
import ConnectButton from './ConnectButton'

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
          <ConnectionStatus />
          <ConnectButton />
        </div>
      </div>
    </div>
  )
}

export default NavBar

import type { PropsWithChildren } from 'react'
import RosConnectButton from './RosConnectButton'
import UrlInput from './drawer/UrlInput'
import GamepadSelect from './drawer/GamepadSelect'

const Drawer = ({ children }: PropsWithChildren) => {
  return (
    <div className="drawer drawer-end lg:drawer-open">
      <input id="my-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">{children}</div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor="my-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-80">
          {/* Sidebar content here */}
          <div className="is-drawer-close:hidden w-full p-3">
            <fieldset className="fieldset bg-base-300 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend">Config</legend>
              <label className="label">rosbridge URL</label>
              <UrlInput />
              <label className="label">Gamepad</label>
              <GamepadSelect />
            </fieldset>
          </div>
          <ul className="menu w-full grow">
            {/* List item */}
            <li>
              <RosConnectButton />
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Drawer

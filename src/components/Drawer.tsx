import type { PropsWithChildren } from 'react'
import RosConnectButton from './RosConnectButton'
import UrlInput from './UrlInput'

const Drawer = ({ children }: PropsWithChildren) => {
  return (
    <div className="drawer drawer-end lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">{children}</div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor="my-drawer-4"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-80">
          {/* Sidebar content here */}
          <div className="is-drawer-close:hidden w-full p-3">
            <UrlInput />
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

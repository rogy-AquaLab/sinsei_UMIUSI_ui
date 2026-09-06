import type { PropsWithChildren } from 'react'
import GamepadSelect from '@/components/drawer/GamepadSelect'
import MainPowerButton from '@/components/drawer/MainPowerButton'
import OperationButton from '@/components/drawer/OparationButton'
import OperationModeSelect from '@/components/drawer/OperationModeSelect'
import RobotHostInput from '@/components/drawer/RobotHostInput'
import RosConnectButton from '@/components/drawer/RosConnectButton'

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
              <label htmlFor="robot-host" className="label">
                Robot host
              </label>
              <RobotHostInput />
              <label htmlFor="gamepad-select" className="label">
                Gamepad
              </label>
              <GamepadSelect />
              <label htmlFor="mode-select" className="label">
                Operation Mode
              </label>
              <OperationModeSelect />
            </fieldset>
          </div>
          <ul className="menu w-full grow">
            {/* List item */}
            <OperationButton />
            <MainPowerButton />
            <RosConnectButton />
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Drawer

import { GamepadProvider } from '@/contexts/GamepadContext'
import { RobotStateProvider } from '@/contexts/RobotStateContext'
import { RosProvider } from '@/contexts/RosContext'
import { RosoutProvider } from '@/contexts/RosoutContext'
import { ToastProvider } from '@/contexts/ToastContext'
import composeProviders from '@/utils/composeProviders'

const AppProviders = composeProviders(
  <ToastProvider />,
  <RosProvider url="ws://localhost:9090" />,
  <RosoutProvider />,
  <RobotStateProvider />,
  <GamepadProvider />,
)

export default AppProviders

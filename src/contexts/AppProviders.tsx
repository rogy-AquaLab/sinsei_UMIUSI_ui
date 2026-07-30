import { GamepadProvider } from '@/contexts/GamepadContext'
import { HealthProvider } from '@/contexts/HealthContext'
import { RobotStateProvider } from '@/contexts/RobotStateContext'
import { RosProvider } from '@/contexts/RosContext'
import { RosoutProvider } from '@/contexts/RosoutContext'
import { ThrusterStateProvider } from '@/contexts/ThrusterStateContext'
import { ToastProvider } from '@/contexts/ToastContext'
import composeProviders from '@/utils/composeProviders'

const AppProviders = composeProviders(
  <ToastProvider />,
  <RosProvider url="ws://localhost:9090" />,
  <HealthProvider />,
  <ThrusterStateProvider />,
  <RosoutProvider />,
  <RobotStateProvider />,
  <GamepadProvider />,
)

export default AppProviders

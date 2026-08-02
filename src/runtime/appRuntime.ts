import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadRuntime } from '@/runtime/gamepadRuntime'
import { initializeNotificationStore } from '@/stores/notificationStore'
import { initializeRobotStateStore } from '@/stores/robotStateStore'
import { initializeRosoutStore } from '@/stores/rosoutStore'
import { initializeRosStore } from '@/stores/rosStore'

export const initializeAppRuntime = composeInitializers(
  initializeNotificationStore,
  initializeRosStore,
  initializeGamepadRuntime,
  initializeRobotStateStore,
  initializeRosoutStore,
)

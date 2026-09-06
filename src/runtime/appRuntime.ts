import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadRuntime } from '@/runtime/gamepadRuntime'
import { initializeCameraStreamStore } from '@/stores/cameraStreamStore'
import { initializeHealthStore } from '@/stores/healthStore'
import { initializeRobotStateStore } from '@/stores/robotStateStore'
import { initializeRosoutStore } from '@/stores/rosoutStore'
import { initializeRosStore } from '@/stores/rosStore'
import { initializeThrusterStateStore } from '@/stores/thrusterStateStore'

export const initializeAppRuntime = composeInitializers(
  initializeRosStore,
  initializeGamepadRuntime,
  initializeRobotStateStore,
  initializeRosoutStore,
  initializeHealthStore,
  initializeThrusterStateStore,
  initializeCameraStreamStore,
)

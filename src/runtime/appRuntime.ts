import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadRuntime } from '@/runtime/gamepadRuntime'
import { initializeActuatorStateStore } from '@/stores/actuatorStateStore'
import { initializeBallastStore } from '@/stores/ballastStore'
import { initializeBmsStore } from '@/stores/bmsStore'
import { initializeCameraStreamStore } from '@/stores/cameraStreamStore'
import { initializeRosoutStore } from '@/stores/rosoutStore'
import { initializeRosStore } from '@/stores/rosStore'

export const initializeAppRuntime = composeInitializers(
  initializeRosStore,
  initializeGamepadRuntime,
  initializeRosoutStore,
  initializeActuatorStateStore,
  initializeBallastStore,
  initializeBmsStore,
  initializeCameraStreamStore,
)

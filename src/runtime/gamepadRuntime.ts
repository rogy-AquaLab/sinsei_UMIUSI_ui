import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadPublisher } from '@/services/gamepad/gamepadPublisher'
import { initializeDriveStore } from '@/stores/driveStore'
import { initializeGamepadStore } from '@/stores/gamepadStore'

export const initializeGamepadRuntime = composeInitializers(
  initializeGamepadStore,
  initializeDriveStore,
  initializeGamepadPublisher,
)

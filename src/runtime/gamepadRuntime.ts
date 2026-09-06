import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadPublisher } from '@/services/gamepad/gamepadPublisher'
import { initializeGamepadStore } from '@/stores/gamepadStore'

export const initializeGamepadRuntime = composeInitializers(
  initializeGamepadStore,
  initializeGamepadPublisher,
)

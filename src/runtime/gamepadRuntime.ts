import { composeInitializers } from '@/runtime/composeInitializers'
import { initializeGamepadPublisher } from '@/services/gamepadPublisher'
import { initializeGamepadStore } from '@/stores/gamepadStore'

export const initializeGamepadRuntime = composeInitializers(
  initializeGamepadStore,
  initializeGamepadPublisher,
)

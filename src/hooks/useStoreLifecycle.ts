import { useEffect } from 'react'
import { initializeGamepadStore } from '@/stores/gamepadStore'
import { disposeNotificationStore } from '@/stores/notificationStore'
import { initializeRobotStateStore } from '@/stores/robotStateStore'
import { initializeRosoutStore } from '@/stores/rosoutStore'
import { disposeRosStore } from '@/stores/rosStore'

export const useStoreLifecycle = () => {
  useEffect(() => {
    const disposeGamepads = initializeGamepadStore()
    const disposeRobotState = initializeRobotStateStore()
    const disposeRosout = initializeRosoutStore()

    return () => {
      disposeRosout()
      disposeRobotState()
      disposeGamepads()
      disposeRosStore()
      disposeNotificationStore()
    }
  }, [])
}

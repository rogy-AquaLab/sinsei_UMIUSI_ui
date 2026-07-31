import { useEffect } from 'react'
import { initializeGamepadStore } from '@/stores/gamepadStore'
import { initializeRobotStateStore } from '@/stores/robotStateStore'
import { initializeRosoutStore } from '@/stores/rosoutStore'
import { disposeRosStore } from '@/stores/rosStore'
import { disposeToastStore } from '@/stores/toastStore'

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
      disposeToastStore()
    }
  }, [])
}

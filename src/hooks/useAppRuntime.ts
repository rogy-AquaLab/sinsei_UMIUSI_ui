import { useEffect } from 'react'
import { initializeAppRuntime } from '@/runtime/appRuntime'

export const useAppRuntime = () => {
  useEffect(initializeAppRuntime, [])
}

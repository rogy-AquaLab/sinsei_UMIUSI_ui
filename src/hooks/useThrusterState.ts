import { useContext } from 'react'
import { ThrusterStateContext } from '@/contexts/ThrusterStateContext'

export const useThrusterState = () => {
  const context = useContext(ThrusterStateContext)
  if (!context) {
    throw new Error(
      'useThrusterState must be used within a ThrusterStateProvider',
    )
  }
  return context
}

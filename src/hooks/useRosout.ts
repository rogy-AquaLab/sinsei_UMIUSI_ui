import { useContext } from 'react'
import { RosoutContext } from '@/contexts/RosoutContext'

export const useRosout = () => {
  const context = useContext(RosoutContext)
  if (!context) {
    throw new Error('useRosout must be used within a RosoutProvider')
  }
  return context
}

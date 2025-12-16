import { useContext } from 'react'
import { RobotStateContext } from '@/contexts/RobotStateContext'

export const useRobotState = () => {
  const context = useContext(RobotStateContext)
  if (!context) {
    throw new Error('useRobotState must be used within a RobotStateProvider')
  }
  return context
}

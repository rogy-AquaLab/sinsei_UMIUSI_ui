import { useContext } from 'react'
import { RosContext } from '@/contexts/RosContext'

export const useRos = () => {
  const context = useContext(RosContext)
  if (!context) {
    throw new Error('useRos must be used within a RosProvider')
  }
  return context
}

import { useContext } from 'react'
import { GamepadContext } from '@/contexts/GamepadContext'

export const useGamepad = () => {
  const context = useContext(GamepadContext)
  if (!context) {
    throw new Error('useGamepad must be used within a GamepadProvider')
  }
  return context
}

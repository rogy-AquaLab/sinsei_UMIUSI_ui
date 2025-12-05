import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { ToastContext } from './ToastContext'

// ref: https://github.com/nogiszd/react-ts-gamepads/blob/main/src/GamepadContext.tsx

type Gamepads = Record<Gamepad['index'], Gamepad>

type GamepadContextValue = {
  gamepads: Gamepads
  selectedIndex: Gamepad['index'] | null
  selectGamepadByIndex: ((index: Gamepad['index'] | null) => void) | null
}

const GamepadContext = createContext<GamepadContextValue>({
  gamepads: {},
  selectedIndex: null,
  selectGamepadByIndex: null,
})

const GamepadProvider = ({ children }: PropsWithChildren) => {
  const [gamepads, setGamepads] = useState<Gamepads>({})
  const [selectedIndex, setSelectedIndex] = useState<Gamepad['index'] | null>(
    null,
  )

  const toast = useContext(ToastContext)

  const addGamepad = useCallback(
    (gamepad: Gamepad) => {
      setGamepads((prev) => ({ ...prev, [gamepad.index]: gamepad }))
      // If no gamepad is selected, select the newly added one
      setSelectedIndex((current) => current ?? gamepad.index)
      toast?.show(`Gamepad connected: ${gamepad.id}`, 'info')
    },
    [toast],
  )

  const removeGamepad = useCallback(
    (gamepad: Gamepad) => {
      setGamepads((prev) => {
        if (!(gamepad.index in prev)) return prev

        const next = { ...prev }
        delete next[gamepad.index]

        toast?.show(`Gamepad disconnected: ${gamepad.id}`, 'info')

        // If the removed gamepad was selected, select another one or null
        setSelectedIndex((currentIndex) => {
          if (currentIndex !== gamepad.index) return currentIndex
          const remaining = Object.values(next)
          return remaining.length > 0 ? remaining[0].index : null
        })

        return next
      })
    },
    [toast],
  )

  useEffect(() => {
    const detectedGamepads = navigator.getGamepads?.() ?? []
    setGamepads((prev) => {
      const next = { ...prev }

      // Add newly detected gamepads
      detectedGamepads.forEach((gamepad) => {
        if (gamepad && !(gamepad.index in next)) {
          next[gamepad.index] = gamepad
          addGamepad(gamepad)
        }
      })

      return next
    })

    const connectGamepadHandler = (e: GamepadEvent) => {
      addGamepad(e.gamepad)
    }

    const disconnectGamepadHandler = (e: GamepadEvent) => {
      removeGamepad(e.gamepad)
    }

    window.addEventListener('gamepadconnected', connectGamepadHandler)
    window.addEventListener('gamepaddisconnected', disconnectGamepadHandler)

    return () => {
      window.removeEventListener('gamepadconnected', connectGamepadHandler)
      window.removeEventListener(
        'gamepaddisconnected',
        disconnectGamepadHandler,
      )
    }
  }, [addGamepad, removeGamepad])

  const selectGamepadByIndex = useCallback(
    (index: Gamepad['index'] | null) => {
      if (index !== null && !(index in gamepads)) {
        console.warn(`Gamepad with index ${index} not found`)
        return
      }
      setSelectedIndex(index)
    },
    [gamepads],
  )

  const contextValue = useMemo<GamepadContextValue>(
    () => ({
      gamepads,
      selectedIndex,
      selectGamepadByIndex,
    }),
    [gamepads, selectedIndex, selectGamepadByIndex],
  )

  return <GamepadContext value={contextValue}>{children}</GamepadContext>
}

export { GamepadProvider, GamepadContext }

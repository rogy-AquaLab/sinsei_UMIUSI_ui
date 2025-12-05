import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { ToastContext } from './ToastContext'

// ref: https://github.com/nogiszd/react-ts-gamepads/blob/main/src/GamepadContext.tsx

type Gamepads = Record<Gamepad['index'], Gamepad>

type GamepadContextValue = {
  gamepadInUse: Gamepad | null
  gamepads: Gamepads
  setGamepadIndex?: (index: Gamepad['index'] | null) => void
}

const GamepadContext = createContext<GamepadContextValue>({
  gamepadInUse: null,
  gamepads: {},
  setGamepadIndex: () => {},
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
    // Add already connected gamepads (only ones not yet registered)
    const existingGamepads = navigator.getGamepads?.() ?? []
    setGamepads((prev) => {
      const next = { ...prev }

      existingGamepads.forEach((gp) => {
        if (gp && !(gp.index in next)) {
          next[gp.index] = gp
          addGamepad(gp)
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

  const contextValue = useMemo(
    () => ({
      gamepadInUse:
        selectedIndex !== null
          ? (Object.values(gamepads).find((g) => g.index === selectedIndex) ??
            null)
          : null,
      gamepads,
      setGamepadIndex: setSelectedIndex,
    }),
    [gamepads, selectedIndex],
  )

  return <GamepadContext value={contextValue}>{children}</GamepadContext>
}

export { GamepadProvider, GamepadContext }

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
      // 最初に接続されたゲームパッドを自動的に選択する
      setSelectedIndex((current) => current ?? gamepad.index)
      toast?.show(`Gamepad connected: ${gamepad.id}`, 'info')
    },
    [toast],
  )

  const removeGamepad = useCallback(
    (gamepad: Gamepad) => {
      let remainingIndexes: number[] = []

      setGamepads((prev) => {
        if (!(gamepad.index in prev)) return prev

        const next = { ...prev }
        delete next[gamepad.index]

        remainingIndexes = Object.keys(next).map((key) => Number(key))

        return next
      })

      // 選択されているゲームパッドが切断された場合、別のゲームパッドを選択する
      setSelectedIndex((current) => {
        if (current !== gamepad.index) return current
        if (remainingIndexes.length === 0) return null
        return remainingIndexes[0]
      })

      toast?.show(`Gamepad disconnected: ${gamepad.id}`, 'info')
    },
    [toast],
  )

  useEffect(() => {
    const detectedGamepads = navigator.getGamepads?.() ?? []
    const newlyAdded: Gamepad[] = []
    setGamepads((prev) => {
      const next = { ...prev }

      detectedGamepads.forEach((gamepad) => {
        if (gamepad && !(gamepad.index in next)) {
          next[gamepad.index] = gamepad
          newlyAdded.push(gamepad)
        }
      })

      return next
    })
    newlyAdded.forEach((gamepad) => {
      addGamepad(gamepad)
    })

    // イベントリスナーの作成
    const onConnect = (e: GamepadEvent) => addGamepad(e.gamepad)
    const onDisconnect = (e: GamepadEvent) => removeGamepad(e.gamepad)

    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)

    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
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

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
  selectGamepadByIndex: (index: Gamepad['index'] | null) => void
  /**
   * Reactのライフサイクル外からゲームパッドの状態を取得するために使用する
   */
  getLatestGamepadByIndex: (index: Gamepad['index']) => Gamepad | null
}

const GamepadContext = createContext<GamepadContextValue>({
  gamepads: {},
  selectedIndex: null,
  selectGamepadByIndex: () => {},
  getLatestGamepadByIndex: () => null,
})

const GamepadProvider = ({ children }: PropsWithChildren) => {
  const [gamepads, setGamepads] = useState<Gamepads>({})
  const gamepadsRef = useRef<Gamepads>(gamepads)
  const [selectedIndex, setSelectedIndex] = useState<Gamepad['index'] | null>(
    null,
  )
  const requestHandleRef = useRef<number | null>(null)

  const toast = useContext(ToastContext)

  const updateGamepad = useCallback((gamepad: Gamepad) => {
    setGamepads((prev) => {
      const next = { ...prev, [gamepad.index]: gamepad }
      gamepadsRef.current = next
      return next
    })
    // 最初に接続されたゲームパッドを自動的に選択する
    setSelectedIndex((current) => current ?? gamepad.index)
  }, [])

  const addGamepad = useCallback(
    (gamepad: Gamepad) => {
      updateGamepad(gamepad)
      toast?.show(`Gamepad connected: ${gamepad.id}`, 'info')
    },
    [toast, updateGamepad],
  )

  const removeGamepad = useCallback(
    (gamepad: Gamepad) => {
      let remainingIndexes: number[] = []

      setGamepads((prev) => {
        if (!(gamepad.index in prev)) return prev

        const next = { ...prev }
        delete next[gamepad.index]

        remainingIndexes = Object.keys(next).map((key) => Number(key))
        gamepadsRef.current = next

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

  const scanGamepads = useCallback(() => {
    const detectedGamepads = navigator.getGamepads?.() ?? []
    detectedGamepads.forEach((gamepad) => {
      if (gamepad) updateGamepad(gamepad)
    })
  }, [updateGamepad])

  const update = useCallback(() => {
    scanGamepads()

    requestHandleRef.current = requestAnimationFrame(update)
  }, [scanGamepads])

  useEffect(() => {
    scanGamepads()

    // イベントリスナーの作成
    const onConnect = (e: GamepadEvent) => addGamepad(e.gamepad)
    const onDisconnect = (e: GamepadEvent) => removeGamepad(e.gamepad)

    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)

    // 定期的にゲームパッドの状態をスキャンする
    requestHandleRef.current = requestAnimationFrame(update)

    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)

      if (requestHandleRef.current)
        cancelAnimationFrame(requestHandleRef.current)
    }
  }, [addGamepad, removeGamepad, scanGamepads, update])

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
      getLatestGamepadByIndex: (index: Gamepad['index']) => {
        return gamepadsRef.current[index] ?? null
      },
    }),
    [gamepads, selectedIndex, selectGamepadByIndex],
  )

  return <GamepadContext value={contextValue}>{children}</GamepadContext>
}

export { GamepadProvider, GamepadContext }

import { create } from 'zustand'
import { useNotificationStore } from '@/stores/notificationStore'

// ref: https://github.com/nogiszd/react-ts-gamepads/blob/main/src/GamepadContext.tsx

export type ConnectedGamepad = Pick<Gamepad, 'id' | 'index'>
type Gamepads = Record<Gamepad['index'], ConnectedGamepad>

type GamepadStore = {
  gamepads: Gamepads
  selectedIndex: Gamepad['index'] | null
  selectGamepadByIndex: (index: Gamepad['index'] | null) => void
}

const latestGamepads = new Map<Gamepad['index'], Gamepad>()

export const useGamepadStore = create<GamepadStore>((set, get) => ({
  gamepads: {},
  selectedIndex: null,

  selectGamepadByIndex: (index) => {
    if (index !== null && !(index in get().gamepads)) {
      console.warn(`Gamepad with index ${index} not found`)
      return
    }
    set({ selectedIndex: index })
  },
}))

/**
 * Reactのライフサイクル外からゲームパッドの状態を取得するために使用する
 */
export const getLatestGamepadByIndex = (index: Gamepad['index']) =>
  latestGamepads.get(index) ?? null

const registerGamepad = (gamepad: Gamepad, notify: boolean) => {
  latestGamepads.set(gamepad.index, gamepad)

  const { gamepads, selectedIndex } = useGamepadStore.getState()
  if (gamepad.index in gamepads) return

  useGamepadStore.setState({
    gamepads: {
      ...gamepads,
      [gamepad.index]: { id: gamepad.id, index: gamepad.index },
    },
    // 最初に接続されたゲームパッドを自動的に選択する
    selectedIndex: selectedIndex ?? gamepad.index,
  })

  if (notify) {
    useNotificationStore
      .getState()
      .notify(`Gamepad connected: ${gamepad.id}`, 'info')
  }
}

const unregisterGamepad = (index: Gamepad['index'], notify: boolean) => {
  latestGamepads.delete(index)

  const { gamepads, selectedIndex } = useGamepadStore.getState()
  const disconnected = gamepads[index]
  if (!disconnected) return

  const nextGamepads = { ...gamepads }
  delete nextGamepads[index]
  const remainingIndexes = Object.keys(nextGamepads).map(Number)

  useGamepadStore.setState({
    gamepads: nextGamepads,
    // 選択されているゲームパッドが切断された場合、別のゲームパッドを選択する
    selectedIndex:
      selectedIndex === index ? (remainingIndexes[0] ?? null) : selectedIndex,
  })

  if (notify) {
    useNotificationStore
      .getState()
      .notify(`Gamepad disconnected: ${disconnected.id}`, 'info')
  }
}

const scanGamepads = () => {
  const detectedGamepads = navigator.getGamepads?.() ?? []
  const detectedIndexes = new Set<number>()

  for (const gamepad of detectedGamepads) {
    if (!gamepad) continue
    detectedIndexes.add(gamepad.index)
    registerGamepad(gamepad, false)
  }

  for (const index of latestGamepads.keys()) {
    if (!detectedIndexes.has(index)) unregisterGamepad(index, false)
  }
}

/**
 * @param frequency ゲームパッドの状態をスキャンする頻度 frequency (Hz)
 */
export const initializeGamepadStore = (frequency = 30) => {
  const onConnect = (event: GamepadEvent) =>
    registerGamepad(event.gamepad, true)
  const onDisconnect = (event: GamepadEvent) =>
    unregisterGamepad(event.gamepad.index, true)

  scanGamepads()
  // イベントリスナーの作成
  window.addEventListener('gamepadconnected', onConnect)
  window.addEventListener('gamepaddisconnected', onDisconnect)
  const intervalId = window.setInterval(scanGamepads, 1000 / frequency)

  return () => {
    window.clearInterval(intervalId)
    window.removeEventListener('gamepadconnected', onConnect)
    window.removeEventListener('gamepaddisconnected', onDisconnect)
    latestGamepads.clear()
    useGamepadStore.setState({ gamepads: {}, selectedIndex: null })
  }
}

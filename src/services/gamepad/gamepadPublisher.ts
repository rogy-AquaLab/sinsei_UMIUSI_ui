import type * as Msgs from '@/msgs/OriginalMsgs'
import { mapGamepad } from '@/services/gamepad/gamepadMapping'
import type { Publisher } from '@/services/rosSession'
import { useDriveStore } from '@/stores/driveStore'
import { getLatestGamepadByIndex, useGamepadStore } from '@/stores/gamepadStore'
import { useRosStore } from '@/stores/rosStore'

type GamepadPublisherOptions = {
  /**
   * 更新頻度 frequency (Hz)
   */
  frequency?: number
}

// Alexandriteにはsinsei_umiusi_coreが無いため、コントローラのtopicへ直接送る
const TARGET_TOPIC = {
  name: '/cmd/target',
  messageType: 'sinsei_umiusi_msgs/msg/Target',
}
const CRAWLER_TARGET_TOPIC = {
  name: '/cmd/crawler_target',
  messageType: 'sinsei_umiusi_msgs/msg/Target',
}
const RUNNABLE_TOPIC = {
  name: '/cmd/thruster_runnable_all',
  messageType: 'sinsei_umiusi_msgs/msg/ThrusterRunnableAll',
}

// クローラーの前後・旋回の最大値（コントローラ側でもmax_dutyで制限される）
const CRAWLER_SCALE = 0.5

const ZERO_TARGET: Msgs.Target = {
  velocity: { x: 0, y: 0, z: 0 },
  orientation: { x: 0, y: 0, z: 0 },
}

const deadzone = (value: number, threshold = 0.1) =>
  Math.abs(value) < threshold ? 0 : value

const createTargetMessage = (gamepad: Gamepad): Msgs.Target => {
  const { axes, buttons } = mapGamepad(gamepad)

  return {
    velocity: {
      x: -1 * deadzone(axes.l.y),
      y: buttons.arrows.left.pressed
        ? 0.5
        : buttons.arrows.right.pressed
          ? -0.5
          : 0.0,
      z: buttons.l2.pressed
        ? 0.3 * deadzone(buttons.l2.value)
        : buttons.r2.pressed
          ? -0.3 * deadzone(buttons.r2.value)
          : 0.0,
    },
    orientation: {
      x: 0.3 * deadzone(axes.r.x),
      y: -0.3 * deadzone(axes.r.y),
      z: -0.2 * deadzone(axes.l.x),
    },
  }
}

/**
 * 左スティックの上下で前後、左右で旋回する
 */
const createCrawlerTargetMessage = (gamepad: Gamepad): Msgs.Target => {
  const { axes } = mapGamepad(gamepad)

  return {
    velocity: { x: -CRAWLER_SCALE * deadzone(axes.l.y), y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: -CRAWLER_SCALE * deadzone(axes.l.x) },
  }
}

const createRunnableMessage = (runnable: boolean): Msgs.ThrusterRunnableAll => {
  const thruster = { esc: runnable, servo: runnable }
  return { lf: thruster, lb: thruster, rb: thruster, rf: thruster }
}

/**
 * 更新頻度 frequency (Hz) でゲームパッドの状態をROSトピックへ送信する
 */
export const initializeGamepadPublisher = ({
  frequency = 30,
}: GamepadPublisherOptions = {}) => {
  let targetPublisher: Publisher<Msgs.Target> | null = null
  let crawlerTargetPublisher: Publisher<Msgs.Target> | null = null
  let runnablePublisher: Publisher<Msgs.ThrusterRunnableAll> | null = null
  let intervalId: number | null = null
  let driveModeButtonPressed = false

  const publish = () => {
    if (!targetPublisher || !crawlerTargetPublisher || !runnablePublisher) {
      return
    }

    const { selectedIndex } = useGamepadStore.getState()
    const gamepad =
      selectedIndex !== null ? getLatestGamepadByIndex(selectedIndex) : null

    // ゲームパッドが無いときは停止を送り続ける
    if (!gamepad) {
      targetPublisher.publish(ZERO_TARGET)
      crawlerTargetPublisher.publish(ZERO_TARGET)
      runnablePublisher.publish(createRunnableMessage(false))
      return
    }

    // Yボタンを押した瞬間に遊泳と走行を切り替える
    const pressed = mapGamepad(gamepad).buttons.y.pressed
    if (pressed && !driveModeButtonPressed) {
      useDriveStore.getState().toggleDriveMode()
    }
    driveModeButtonPressed = pressed

    const { armed, driveMode } = useDriveStore.getState()
    // 使っていない側には常に0を送り、切り替えた瞬間に止まるようにする
    const swimming = driveMode === 'swim'
    targetPublisher.publish(
      swimming ? createTargetMessage(gamepad) : ZERO_TARGET,
    )
    crawlerTargetPublisher.publish(
      swimming ? ZERO_TARGET : createCrawlerTargetMessage(gamepad),
    )
    runnablePublisher.publish(createRunnableMessage(armed))
  }

  const stopPublishing = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
    targetPublisher?.dispose()
    crawlerTargetPublisher?.dispose()
    runnablePublisher?.dispose()
    targetPublisher = null
    crawlerTargetPublisher = null
    runnablePublisher = null
  }

  const syncPublisher = () => {
    const { session, connectionState } = useRosStore.getState()
    stopPublishing()

    // rosbridgeへ接続中のときだけループを回す
    if (!session || connectionState !== 'connected' || frequency <= 0) return

    targetPublisher = session.publisher<Msgs.Target>(TARGET_TOPIC)
    crawlerTargetPublisher =
      session.publisher<Msgs.Target>(CRAWLER_TARGET_TOPIC)
    runnablePublisher =
      session.publisher<Msgs.ThrusterRunnableAll>(RUNNABLE_TOPIC)
    intervalId = window.setInterval(publish, 1000 / frequency)
  }

  syncPublisher()
  const unsubscribeRosStore = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }
    syncPublisher()
  })

  return () => {
    unsubscribeRosStore()
    stopPublishing()
  }
}

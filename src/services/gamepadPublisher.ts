import type * as Msgs from '@/msgs/OriginalMsgs'
import type { Publisher } from '@/services/rosSession'
import { getLatestGamepadByIndex, useGamepadStore } from '@/stores/gamepadStore'
import { useRosStore } from '@/stores/rosStore'
import { mapGamepad } from '@/utils/gamepadMapping'

type GamepadPublisherOptions = {
  /**
   * 更新頻度 frequency (Hz)
   */
  frequency?: number
}

const TARGET_TOPIC = {
  name: '/user_input/target',
  messageType: 'sinsei_umiusi_msgs/msg/Target',
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
 * 更新頻度 frequency (Hz) でゲームパッドの状態をROSトピックへ送信する
 */
export const initializeGamepadPublisher = ({
  frequency = 30,
}: GamepadPublisherOptions = {}) => {
  let targetPublisher: Publisher<Msgs.Target> | null = null
  let intervalId: number | null = null

  const publish = () => {
    if (!targetPublisher) return

    const { selectedIndex } = useGamepadStore.getState()
    if (selectedIndex === null) return

    const gamepad = getLatestGamepadByIndex(selectedIndex)
    if (!gamepad) return

    targetPublisher.publish(createTargetMessage(gamepad))
  }

  const stopPublishing = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
    targetPublisher?.dispose()
    targetPublisher = null
  }

  const syncPublisher = () => {
    const { session, connectionState } = useRosStore.getState()
    stopPublishing()

    // rosbridgeへ接続中のときだけループを回す
    if (!session || connectionState !== 'connected' || frequency <= 0) return

    targetPublisher = session.publisher<Msgs.Target>(TARGET_TOPIC)
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

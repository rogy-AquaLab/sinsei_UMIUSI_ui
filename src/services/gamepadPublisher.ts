import { Topic } from 'roslib'
import type * as Msgs from '@/msgs/OriginalMsgs'
import { getLatestGamepadByIndex, useGamepadStore } from '@/stores/gamepadStore'
import { useRosStore } from '@/stores/rosStore'
import { mapGamepad } from '@/utils/gamepadMapping'

type GamepadPublisherOptions = {
  /**
   * 更新頻度 frequency (Hz)
   */
  frequency?: number
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
  let targetTopic: Topic<Msgs.Target> | null = null
  let intervalId: number | null = null

  const publish = () => {
    if (!targetTopic) return

    const { selectedIndex } = useGamepadStore.getState()
    if (selectedIndex === null) return

    const gamepad = getLatestGamepadByIndex(selectedIndex)
    if (!gamepad) return

    targetTopic.publish(createTargetMessage(gamepad))
  }

  const stopPublishing = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
    targetTopic?.unadvertise()
    targetTopic = null
  }

  const syncPublisher = () => {
    const { ros, connectionState } = useRosStore.getState()
    stopPublishing()

    // rosオブジェクトが存在し、rosbridgeへ接続中のときだけループを回す
    if (!ros || connectionState !== 'connected' || frequency <= 0) return

    targetTopic = new Topic<Msgs.Target>({
      ros,
      name: '/user_input/target',
      messageType: 'sinsei_umiusi_msgs/msg/Target',
      reconnect_on_close: false,
    })
    intervalId = window.setInterval(publish, 1000 / frequency)
  }

  syncPublisher()
  const unsubscribeRosStore = useRosStore.subscribe((state, previousState) => {
    if (
      state.ros === previousState.ros &&
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

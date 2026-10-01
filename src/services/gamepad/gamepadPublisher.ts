import type * as GeometryMsgs from '@/msgs/GeometryMsgs'
import type * as Msgs from '@/msgs/OriginalMsgs'
import { mapGamepad } from '@/services/gamepad/gamepadMapping'
import type { Publisher } from '@/services/rosSession'
import { getLatestGamepadByIndex, useGamepadStore } from '@/stores/gamepadStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

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

const ATTITUDE_TARGET_TOPIC = {
  name: '/user_input/attitude_target',
  messageType: 'sinsei_umiusi_msgs/msg/AttitudeTarget',
}

// 目標roll/pitch角の最大値 [rad] (~17deg)
const MAX_ROLL = 0.3
const MAX_PITCH = 0.3
// 目標yawレートの最大値 [rad/s]
const MAX_YAW_RATE = 1.0

const deadzone = (value: number, threshold = 0.1) =>
  Math.abs(value) < threshold ? 0 : value

// yaw成分を持たないroll/pitchの姿勢quaternionを組み立てる
const rollPitchToQuaternion = (
  roll: number,
  pitch: number,
): GeometryMsgs.Quaternion => ({
  x: Math.cos(pitch / 2) * Math.sin(roll / 2),
  y: Math.sin(pitch / 2) * Math.cos(roll / 2),
  z: 0,
  w: Math.cos(pitch / 2) * Math.cos(roll / 2),
})

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
  }
}

const createAttitudeTargetMessage = (
  gamepad: Gamepad,
  holdYaw: boolean,
): Msgs.AttitudeTarget => {
  const { axes } = mapGamepad(gamepad)

  const roll = MAX_ROLL * deadzone(axes.r.x)
  const pitch = -MAX_PITCH * deadzone(axes.r.y)
  const yawRate = -MAX_YAW_RATE * deadzone(axes.l.x)

  return {
    attitude: rollPitchToQuaternion(roll, pitch),
    yaw_rate: yawRate,
    hold_yaw: holdYaw,
  }
}

/**
 * 更新頻度 frequency (Hz) でゲームパッドの状態をROSトピックへ送信する
 */
export const initializeGamepadPublisher = ({
  frequency = 30,
}: GamepadPublisherOptions = {}) => {
  let targetPublisher: Publisher<Msgs.Target> | null = null
  let attitudeTargetPublisher: Publisher<Msgs.AttitudeTarget> | null = null
  let intervalId: number | null = null
  // R1 で方位保持をトグルする。押しっぱなしで切り替わり続けないよう立ち上がりだけ見る
  let holdYaw = false
  let holdButtonWasPressed = false

  const publish = () => {
    if (!targetPublisher || !attitudeTargetPublisher) return

    const { selectedIndex } = useGamepadStore.getState()
    if (selectedIndex === null) return

    const gamepad = getLatestGamepadByIndex(selectedIndex)
    if (!gamepad) return

    const holdButtonPressed = mapGamepad(gamepad).buttons.r1.pressed
    if (holdButtonPressed && !holdButtonWasPressed) {
      holdYaw = !holdYaw
      useNotificationStore
        .getState()
        .notify(`方位保持: ${holdYaw ? 'ON' : 'OFF'}`, 'info')
    }
    holdButtonWasPressed = holdButtonPressed

    targetPublisher.publish(createTargetMessage(gamepad))
    attitudeTargetPublisher.publish(createAttitudeTargetMessage(gamepad, holdYaw))
  }

  const stopPublishing = () => {
    // 接続し直したときに前回の保持を黙って持ち越さない
    holdYaw = false
    holdButtonWasPressed = false
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
    targetPublisher?.dispose()
    targetPublisher = null
    attitudeTargetPublisher?.dispose()
    attitudeTargetPublisher = null
  }

  const syncPublisher = () => {
    const { session, connectionState } = useRosStore.getState()
    stopPublishing()

    // rosbridgeへ接続中のときだけループを回す
    if (!session || connectionState !== 'connected' || frequency <= 0) return

    targetPublisher = session.publisher<Msgs.Target>(TARGET_TOPIC)
    attitudeTargetPublisher = session.publisher<Msgs.AttitudeTarget>(
      ATTITUDE_TARGET_TOPIC,
    )
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

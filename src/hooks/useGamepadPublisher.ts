import { useCallback, useContext, useMemo } from 'react'
import { Ros, Topic } from 'roslib'
import { mapGamepad } from '../utils/gamepadMapping'
import { GamepadContext } from '../contexts/GamepadContext'
import * as SinseiUmiusiMsgs from '../msgs/SinseiUmiusiMsgs'
import { useLoop } from './useLoop'

type GamepadPublisherOptions = {
  ros: Ros | null
  frequency?: number
}

const deadzone = (value: number, threshold = 0.1) =>
  Math.abs(value) < threshold ? 0 : value

export const useGamepadPublisher = ({
  ros,
  frequency = 30,
}: GamepadPublisherOptions) => {
  const { selectedIndex, getLatestGamepadByIndex } = useContext(GamepadContext)

  const targetTopic = useMemo(() => {
    if (!ros) return null
    return new Topic({
      ros,
      name: '/user_input/target',
      messageType: 'sinsei_umiusi_msgs/msg/Target',
    })
  }, [ros])

  const loop = useCallback(() => {
    if (selectedIndex !== null) {
      const gamepad = getLatestGamepadByIndex(selectedIndex)
      if (!gamepad) return
      const { axes, buttons } = mapGamepad(gamepad)
      const message: SinseiUmiusiMsgs.Target = {
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
          y: 0.3 * deadzone(axes.r.y),
          z: 0.2 * deadzone(axes.l.x),
        },
      }

      targetTopic?.publish(message)
    }
  }, [selectedIndex, getLatestGamepadByIndex, targetTopic])

  // rosオブジェクトが存在するときだけループを回す
  useLoop({ callback: loop, frequency: ros ? frequency : null })
}

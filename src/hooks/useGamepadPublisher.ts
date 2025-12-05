import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { Ros, Topic } from 'roslib'
import { mapGamepad } from '../utils/gamepadMapping'
import { GamepadContext } from '../contexts/GamepadContext'

type GamepadPublisherOptions = {
  ros: Ros | null
  frameRate?: number
}

// ref: https://github.com/rogy-AquaLab/sinsei_UMIUSI_msgs/blob/main/msg/Target.msg
type Vector3 = {
  x: number
  y: number
  z: number
}
type TargetMessage = {
  velocity: Vector3
  orientation: Vector3
}

const deadzone = (value: number, threshold = 0.1) =>
  Math.abs(value) < threshold ? 0 : value

export const useGamepadPublisher = ({
  ros,
  frameRate = 30,
}: GamepadPublisherOptions) => {
  const { gamepadInUse } = useContext(GamepadContext)
  const intervalRef = useRef<number | null>(null)

  const targetTopic = useMemo(() => {
    if (!ros) return null
    return new Topic({
      ros,
      name: '/user_input/target',
      messageType: 'sinsei_umiusi_msgs/msg/Target',
    })
  }, [ros])

  const loop = useCallback(() => {
    if (gamepadInUse) {
      const { axes, buttons } = mapGamepad(gamepadInUse)
      const msg: TargetMessage = {
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

      targetTopic?.publish(msg)
    }
  }, [gamepadInUse, targetTopic])

  useEffect(() => {
    if (!ros) return

    const interval = setInterval(loop, 1000 / frameRate)
    intervalRef.current = interval

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [ros, frameRate, loop])
}

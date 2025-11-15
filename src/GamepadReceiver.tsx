import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Message, Topic } from 'roslib'
import { type GamepadRef, useGamepads } from 'react-ts-gamepads'
import { RosContext } from './RosProvider'

const GamepadReceiver = () => {
  const [gamepads, setGamepads] = useState<GamepadRef>({})
  useGamepads((gp) => setGamepads(gp))
  const ros = useContext(RosContext)
  const lastPublished = useRef<string>('')

  const firstPad = useMemo(() => {
    const firstId = Object.keys(gamepads)[0]
    return firstId ? gamepads[Number(firstId)] : null
  }, [gamepads])

  const targetTopic = useMemo(() => {
    if (!ros) return null
    return new Topic({
      ros,
      name: '/cmd/target',
      messageType: 'sinsei_umiusi_control/msg/Target',
    })
  }, [ros])

  const targetPayload = useMemo(() => {
    if (!firstPad) return null
    const axes = firstPad.axes ?? []
    return {
      velocity: {
        x: axes[0] ?? 0,
        y: -1 * (axes[1] ?? 0),
        z: axes[4] ?? 0,
      },
      orientation: {
        x: axes[2] ?? 0,
        y: -1 * (axes[3] ?? 0),
        z: axes[5] ?? 0,
      },
    }
  }, [firstPad])

  useEffect(() => {
    if (!(targetTopic && targetPayload)) return
    const serialized = JSON.stringify(targetPayload)
    if (serialized === lastPublished.current) return
    lastPublished.current = serialized
    targetTopic.publish(new Message(targetPayload))
  }, [targetPayload, targetTopic])

  return (
    <div className="Gamepads">
      <h1>Gamepads</h1>

      {Object.keys(gamepads).map((idStr) => {
        const id = Number(idStr)
        const pad = gamepads[id]
        const axes = pad.axes ?? []
        const sticks = [
          { label: 'Left Stick', x: axes[0] ?? 0, y: axes[1] ?? 0 },
          { label: 'Right Stick', x: axes[2] ?? 0, y: axes[3] ?? 0 },
        ]

        return (
          <div key={id}>
            <h2>{pad.id}</h2>

            {(pad.buttons ?? []).map((button, index) => (
              <div key={index}>
                {index}: {button.pressed ? 'True' : 'False'}
              </div>
            ))}

            <h3>Sticks</h3>
            {sticks.map((stick) => {
              const magnitude = Math.min(
                1,
                Math.hypot(stick.x, stick.y),
              ).toFixed(2)
              return (
                <div key={stick.label}>
                  {stick.label}: x={stick.x.toFixed(2)} y={stick.y.toFixed(2)}{' '}
                  strength={magnitude}
                </div>
              )
            })}

            {firstPad === pad && targetPayload && (
              <div>
                <h3>Publishing to /cmd/target</h3>
                <div>
                  velocity: x={targetPayload.velocity.x.toFixed(2)} y=
                  {targetPayload.velocity.y.toFixed(2)} z=
                  {targetPayload.velocity.z.toFixed(2)}
                </div>
                <div>
                  orientation: x={targetPayload.orientation.x.toFixed(2)} y=
                  {targetPayload.orientation.y.toFixed(2)} z=
                  {targetPayload.orientation.z.toFixed(2)}
                </div>
              </div>
            )}

            <h3>Axes</h3>
            {axes.map((axis, axisIndex) => (
              <div key={axisIndex}>
                Axis {axisIndex}: {axis.toFixed(2)}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default GamepadReceiver

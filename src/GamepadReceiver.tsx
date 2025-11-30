import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Topic } from 'roslib'
import { type GamepadRef, useGamepads } from 'react-ts-gamepads'
import { RosContext } from './providers/RosProvider'
import { ToastContext } from './providers/ToastProvider'

const applyDeadzone = (value: number, threshold = 0.1) =>
  Math.abs(value) <= threshold ? 0 : value

const GamepadReceiver = () => {
  const [gamepads, setGamepads] = useState<GamepadRef>({})
  const [autoGateState, setAutoGateState] = useState<
    'idle' | 'phase1' | 'phase2' | 'phase3'
  >('idle')
  const [autoSlalomState, setAutoSlalomState] = useState<
    | 'idle'
    | 'phase1' // 直進
    | 'phase2' // 右並進
    | 'phase3' // 直進
    | 'phase4' // 左並進
    | 'phase5' // 直進
    | 'phase6' // 右並進
  >('idle')
  useGamepads((gp) => setGamepads(gp))
  const { ros } = useContext(RosContext)
  const lastPublished = useRef<string>('')
  const autoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevButtons = useRef({ a: false, b: false, x: false, y: false })
  const zeroPayload = useMemo(
    () => ({
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0 },
    }),
    [],
  )

  const toast = useContext(ToastContext)

  const firstPad = useMemo(() => {
    const firstId = Object.keys(gamepads)[0]
    return firstId ? gamepads[Number(firstId)] : null
  }, [gamepads])

  const targetTopic = useMemo(() => {
    if (!ros) return null
    return new Topic({
      ros,
      name: '/user_input/target',
      messageType: 'sinsei_umiusi_msgs/msg/Target',
    })
  }, [ros])

  const targetPayload = useMemo(() => {
    if (!firstPad) return zeroPayload

    if (autoGateState === 'phase1') {
      return {
        velocity: { x: 0, y: 0, z: 0.5 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    if (autoGateState === 'phase2') {
      return {
        velocity: { x: 0.3, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    if (autoGateState === 'phase3') {
      return {
        velocity: { x: 0, y: 0, z: 0.3 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    // 直進
    if (
      autoSlalomState === 'phase1' ||
      autoSlalomState === 'phase3' ||
      autoSlalomState === 'phase5'
    ) {
      return {
        velocity: { x: 0.2, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    // 右並進
    if (autoSlalomState === 'phase2') {
      return {
        velocity: { x: 0, y: -0.2, z: 0 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    // 左並進
    if (autoSlalomState === 'phase4') {
      return {
        velocity: { x: 0, y: 0.2, z: 0 },
        orientation: { x: 0, y: 0, z: 0 },
      }
    }

    const axes = firstPad.axes ?? []
    const getAxis = (index: number) => applyDeadzone(axes[index] ?? 0)
    const lStickX = getAxis(0)
    const lStickY = getAxis(1)
    const rStickX = getAxis(2)
    const rStickY = getAxis(3)

    const buttons = firstPad.buttons ?? []
    const lButtonPressed = (buttons[6]?.pressed ?? false) ? 1 : 0
    const rButtonPressed = (buttons[7]?.pressed ?? false) ? 1 : 0
    const leftButtonPressed = (buttons[14]?.pressed ?? false) ? 1 : 0
    const rightButtonPressed = (buttons[15]?.pressed ?? false) ? 1 : 0

    return {
      velocity: {
        x: -1 * lStickY,
        y: leftButtonPressed ? 0.5 : rightButtonPressed ? -0.5 : 0.0,
        z: lButtonPressed ? 0.3 : rButtonPressed ? -0.3 : 0.0,
      },
      orientation: {
        x: 0.3 * rStickX,
        y: -0.3 * rStickY,
        z: -0.2 * lStickX,
      },
    }
  }, [autoGateState, autoSlalomState, firstPad, zeroPayload])

  const clearAutoGateTimeout = () => {
    if (autoTimeout.current) {
      clearTimeout(autoTimeout.current)
      autoTimeout.current = null
    }
  }

  const clearAutoSlalomTimeout = () => {
    if (autoTimeout.current) {
      clearTimeout(autoTimeout.current)
      autoTimeout.current = null
    }
  }

  useEffect(() => {
    if (!firstPad) return

    const buttons = firstPad.buttons ?? []
    const aPressed = buttons[0]?.pressed ?? false
    const bPressed = buttons[1]?.pressed ?? false
    const xPressed = buttons[2]?.pressed ?? false
    const yPressed = buttons[3]?.pressed ?? false

    const stopAutoGate = () => {
      if (autoGateState === 'idle') {
        toast?.show('自動ゲート操作は実行中ではありません。', 'info')
        return
      }
      clearAutoGateTimeout()
      setAutoGateState('idle')
      toast?.show('自動ゲート操作を停止しました。', 'info')
    }

    const startAutoGate = () => {
      if (autoGateState !== 'idle') {
        toast?.show('自動ゲート操作は既に実行中です。', 'info')
        return
      }

      toast?.show('自動ゲート操作を開始します。', 'info')

      clearAutoGateTimeout()
      setAutoGateState('phase1')

      autoTimeout.current = setTimeout(() => {
        setAutoGateState('phase2')
        autoTimeout.current = setTimeout(() => {
          setAutoGateState('phase3')
          autoTimeout.current = setTimeout(() => {
            setAutoGateState('idle')
            autoTimeout.current = null
            toast?.show('自動ゲート操作を終了しました。', 'success')
          }, 10000)
        }, 6000)
      }, 0)
    }

    const startAutoSlalom = () => {
      if (autoSlalomState !== 'idle') {
        toast?.show('自動スラローム操作は既に実行中です。', 'info')
        return
      }

      toast?.show('自動スラローム操作を開始します。', 'info')

      const phase1Duration = 8000
      const phase2Duration = 25000
      const phase3Duration = 8000
      const phase4Duration = 30000
      const phase5Duration = 8000
      const phase6Duration = 15000

      clearAutoGateTimeout()
      setAutoSlalomState('phase1')
      autoTimeout.current = setTimeout(() => {
        setAutoSlalomState('phase2')
        autoTimeout.current = setTimeout(() => {
          setAutoSlalomState('phase3')
          autoTimeout.current = setTimeout(() => {
            setAutoSlalomState('phase4')
            autoTimeout.current = setTimeout(() => {
              setAutoSlalomState('phase5')
              autoTimeout.current = setTimeout(() => {
                setAutoSlalomState('phase6')
                autoTimeout.current = setTimeout(() => {
                  setAutoSlalomState('idle')
                  autoTimeout.current = null
                  toast?.show('自動スラローム操作を終了しました。', 'success')
                }, phase6Duration)
              }, phase5Duration)
            }, phase4Duration)
          }, phase3Duration)
        }, phase2Duration)
      }, phase1Duration)
    }

    const stopAutoSlalom = () => {
      if (autoSlalomState === 'idle') {
        toast?.show('自動スラローム操作は実行中ではありません。', 'info')
        return
      }
      clearAutoSlalomTimeout()
      setAutoSlalomState('idle')
      toast?.show('自動スラローム操作を停止しました。', 'info')
    }

    if (aPressed && !prevButtons.current.a) startAutoGate()
    if (bPressed && !prevButtons.current.b) startAutoSlalom()
    if (xPressed && !prevButtons.current.x) {
      if (autoGateState !== 'idle') stopAutoGate()
      if (autoSlalomState !== 'idle') stopAutoSlalom()
    }

    prevButtons.current = { a: aPressed, b: bPressed, x: xPressed, y: yPressed }
  }, [autoGateState, autoSlalomState, firstPad, firstPad?.buttons, toast])

  useEffect(() => {
    return () => {
      clearAutoGateTimeout()
    }
  }, [])

  useEffect(() => {
    if (!(targetTopic && targetPayload)) return
    const serialized = JSON.stringify(targetPayload)
    if (serialized === lastPublished.current) return
    lastPublished.current = serialized
    targetTopic.publish(targetPayload)
  }, [targetPayload, targetTopic])

  return (
    <div className="Gamepads">
      <h1>Gamepads</h1>
      <div
        className={autoGateState === 'idle' ? '' : 'font-bold text-green-600'}
      >
        自動ゲート操作: {autoGateState === 'idle' ? '停止中' : '実行中'}
      </div>
      {autoGateState !== 'idle' && (
        <div>
          状態:{' '}
          {autoGateState === 'phase1'
            ? '下降中 (10秒)'
            : autoGateState === 'phase2'
              ? '前進中 (10秒)'
              : '上昇中 (10秒)'}
        </div>
      )}

      <div
        className={autoSlalomState === 'idle' ? '' : 'font-bold text-green-600'}
      >
        自動スラローム操作: {autoSlalomState === 'idle' ? '停止中' : '実行中'}
      </div>
      {autoSlalomState !== 'idle' && (
        <div>
          状態:{' '}
          {autoSlalomState === 'phase1'
            ? '直進:1'
            : autoSlalomState === 'phase2'
              ? '右並進:2'
              : autoSlalomState === 'phase3'
                ? '直進:3'
                : autoSlalomState === 'phase4'
                  ? '左並進:4'
                  : autoSlalomState === 'phase5'
                    ? '直進:5'
                    : autoSlalomState === 'phase6'
                      ? '右並進:6'
                      : ''}
        </div>
      )}

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
                <h3>Publishing to /user_input/target</h3>
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

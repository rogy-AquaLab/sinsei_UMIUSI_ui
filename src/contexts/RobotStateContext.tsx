import {
  createContext,
  useMemo,
  useEffect,
  useState,
  type PropsWithChildren,
  useCallback,
} from 'react'
import { Service, Topic } from 'roslib'
import { useRos } from '@/hooks/useRos'
import { useToast } from '@/hooks/useToast'
import type { RobotState } from '@/msgs/OriginalMsgs'
import type {
  PowerOnResponce,
  PowerOffResponce,
  SetModeRequest,
  SetModeResponse,
} from '@/msgs/OriginalServices'
import {
  numToRobotMode,
  type RobotMode,
  type OperationMode,
  RobotModeMap,
  robotModeToNum,
  robotModeToString,
} from '@/msgs/utils/RobotMode'

type MainPowerState = 'unknown' | 'off' | 'on' | 'poweringOn' | 'poweringOff'

type ModeTransitionState = 'idle' | 'transitioning'

type RobotStateContextValue = {
  mainPowerState: MainPowerState
  setMainPower: (on: boolean) => void
  /**
   * ロボットの動作モード。rosbridgeが未接続の場合はnull
   */
  mode: RobotMode | null
  /**
   * 動作モードが移行中かどうか
   */
  modeTransitionState: ModeTransitionState
  /**
   * UIで選択された動作モード
   */
  operationMode: OperationMode
  /**
   * UIで選択された動作モードをセットする関数
   * @param mode
   * @returns
   */
  setOperationMode: (mode: OperationMode) => void
  /**
   * スタンバイからUIで選択された動作モードに移行する
   */
  enterOperation: () => void
  /**
   * 任意の動作モードからスタンバイに移行する
   */
  enterStandby: () => void
}

const RobotStateContext = createContext<RobotStateContextValue>({
  mainPowerState: 'unknown',
  setMainPower: () => {},
  mode: null,
  modeTransitionState: 'idle',
  operationMode: 'MANUAL',
  setOperationMode: () => {},
  enterOperation: () => {},
  enterStandby: () => {},
})

const RobotStateProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useRos()

  const [mainPowerState, setMainPowerState] =
    useState<MainPowerState>('unknown')
  const [mode, _setMode] = useState<RobotMode | null>(null)
  const [modeTransitionState, setModeTransitionState] =
    useState<ModeTransitionState>('idle')
  const [operationMode, setOperationMode] = useState<OperationMode>('MANUAL')

  const toast = useToast()

  const powerOnService = useMemo(() => {
    if (!ros) return null
    return new Service({
      ros,
      name: '/user_input/power_on',
      serviceType: 'sinsei_umiusi_msgs/srv/PowerOn',
    })
  }, [ros])

  const powerOffService = useMemo(() => {
    if (!ros) return null
    return new Service({
      ros,
      name: '/user_input/power_off',
      serviceType: 'sinsei_umiusi_msgs/srv/PowerOff',
    })
  }, [ros])

  const setModeService = useMemo(() => {
    if (!ros) return null
    return new Service({
      ros,
      name: '/user_input/set_mode',
      serviceType: 'sinsei_umiusi_msgs/srv/SetMode',
    })
  }, [ros])

  const robotStateTopic = useMemo(() => {
    if (!ros) return null
    return new Topic({
      ros,
      name: '/robot_state',
      messageType: 'sinsei_umiusi_msgs/msg/RobotState',
    })
  }, [ros])

  useEffect(() => {
    if (!robotStateTopic) return

    robotStateTopic.subscribe((_message) => {
      const message = _message as RobotState
      const isOn = message.state !== RobotModeMap.POWERED_OFF
      const newMode = numToRobotMode(message.state) ?? null

      setMainPowerState(isOn ? 'on' : 'off')
      _setMode((prev) => {
        // モードが変化したらmodeTransitionStateを'idle'に戻す
        if (prev !== newMode) {
          setModeTransitionState('idle')
        }
        return newMode
      })
    })

    return () => robotStateTopic.unsubscribe()
  }, [robotStateTopic])

  const setMainPower = useCallback(
    (on: boolean) => {
      if (mainPowerState === 'poweringOn' || mainPowerState === 'poweringOff') {
        console.warn('Power transition already in progress')
        return
      }
      setMainPowerState(on ? 'poweringOn' : 'poweringOff')

      const service = on ? powerOnService : powerOffService
      service?.callService(
        null,
        (_res) => {
          const res = _res as PowerOnResponce | PowerOffResponce
          if (res.success) {
            console.log(`Power ${on ? 'ON' : 'OFF'} requested`)
            toast?.show(`Power ${on ? 'ON' : 'OFF'} requested`, 'success')
          } else {
            console.error(`Power ${on ? 'ON' : 'OFF'} failed:`, res.error_msg)
            toast?.show(
              `Power ${on ? 'ON' : 'OFF'} failed: ${res.error_msg}`,
              'error',
            )
            // 状態を元に戻す
            setMainPowerState(on ? 'off' : 'on')
          }
        },
        () => {
          console.error(`Power ${on ? 'ON' : 'OFF'} service call failed`)
          toast?.show(`Power ${on ? 'ON' : 'OFF'} service call failed`, 'error')
          // 状態を元に戻す
          setMainPowerState(on ? 'off' : 'on')
        },
      )
    },
    [mainPowerState, powerOnService, powerOffService, toast],
  )

  const requestSetMode = useCallback(
    (mode: RobotMode) => {
      if (modeTransitionState === 'transitioning') {
        console.warn('Mode transition already in progress')
        return
      }

      setModeTransitionState('transitioning')

      const request: SetModeRequest = {
        mode: robotModeToNum(mode),
      }
      setModeService?.callService(
        request,
        (_res) => {
          const res = _res as SetModeResponse
          if (res.success) {
            console.log(`Set Mode to ${robotModeToString(mode)} requested`)
            toast?.show(
              `Set Mode to ${robotModeToString(mode)} requested`,
              'success',
            )
          } else {
            console.error('Set Mode failed:', res.error_msg)
            toast?.show(`Set Mode failed: ${res.error_msg}`, 'error')
            setModeTransitionState('idle')
          }
        },
        (err) => {
          console.error('Set Mode service call failed', err)
          toast?.show('Set Mode service call failed', 'error')
          setModeTransitionState('idle')
        },
      )
    },
    [modeTransitionState, setModeService, toast],
  )

  const enterOperation = useCallback(() => {
    if (mode !== 'STANDBY') {
      console.warn('Robot is not in STANDBY')
      return
    }
    requestSetMode(operationMode)
  }, [mode, operationMode, requestSetMode])

  const enterStandby = useCallback(() => {
    if (mode === 'STANDBY') return
    requestSetMode('STANDBY')
  }, [mode, requestSetMode])

  useEffect(() => {
    // 接続が切れたら状態をリセット
    if (connectionState !== 'connected') {
      setMainPowerState('unknown')
      _setMode(null)
      setModeTransitionState('idle')
    }
  }, [connectionState])

  const contextValue: RobotStateContextValue = useMemo(() => {
    return {
      mainPowerState,
      setMainPower,
      mode,
      modeTransitionState,
      operationMode,
      setOperationMode,
      enterOperation,
      enterStandby,
    }
  }, [
    mainPowerState,
    setMainPower,
    mode,
    modeTransitionState,
    operationMode,
    setOperationMode,
    enterOperation,
    enterStandby,
  ])

  return <RobotStateContext value={contextValue}>{children}</RobotStateContext>
}

export { RobotStateProvider, RobotStateContext }

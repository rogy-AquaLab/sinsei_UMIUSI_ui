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
  RobotModeMap,
  robotModeToNum,
  robotModeToString,
} from '@/msgs/utils/RobotMode'

type MainPowerState = 'unknown' | 'off' | 'on' | 'poweringOn' | 'poweringOff'

type RobotStateContextValue = {
  mainPowerState: MainPowerState
  setMainPower: (on: boolean) => void
  /**
   * ロボットの動作モード。rosbridgeが未接続の場合はnull
   */
  mode: RobotMode | null
  setMode: (mode: RobotMode) => void
}

const RobotStateContext = createContext<RobotStateContextValue>({
  mainPowerState: 'unknown',
  setMainPower: () => {},
  mode: null,
  setMode: () => {},
})

const RobotStateProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useRos()

  const [mainPowerState, setMainPowerState] =
    useState<MainPowerState>('unknown')
  const [mode, _setMode] = useState<RobotMode | null>(null)

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

      setMainPowerState(isOn ? 'on' : 'off')
      _setMode(numToRobotMode(message.state) ?? null)
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

  const setMode = useCallback(
    (mode: RobotMode) => {
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
          }
        },
        (err) => {
          console.error('Set Mode service call failed', err)
          toast?.show('Set Mode service call failed', 'error')
        },
      )
    },
    [setModeService, toast],
  )

  useEffect(() => {
    // 接続が切れたら状態をリセット
    if (connectionState !== 'connected') {
      setMainPowerState('unknown')
      _setMode(null)
    }
  }, [connectionState])

  const contextValue = useMemo(() => {
    return {
      mainPowerState,
      setMainPower,
      mode,
      setMode,
    }
  }, [mainPowerState, setMainPower, mode, setMode])

  return <RobotStateContext value={contextValue}>{children}</RobotStateContext>
}

export { RobotStateProvider, RobotStateContext }

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
import { RobotMode, robotModeToString } from '@/msgs/utils/RobotMode'

type RobotStateContextValue = {
  /**
   * 強電のON/OFF。rosbridgeが未接続の場合はnull
   */
  isPoweredOn: boolean | null
  setIsPoweredOn: (poweredOn: boolean) => void
  /**
   * 強電のON/OFFが遷移中かどうか
   */
  isPowerTransitioning: boolean
  /**
   * ロボットの動作モード。rosbridgeが未接続の場合はnull
   */
  mode: RobotMode | null
  setMode: (mode: RobotMode) => void
}

const RobotStateContext = createContext<RobotStateContextValue>({
  isPoweredOn: null,
  setIsPoweredOn: () => {},
  isPowerTransitioning: false,
  mode: null,
  setMode: () => {},
})

const RobotStateProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useRos()

  const [isPoweredOn, _setIsPoweredOn] = useState<boolean | null>(null)
  const [isPowerTransitioning, setIsPowerTransitioning] =
    useState<boolean>(false)
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

      _setMode(message.state)

      // 強電状態が変化したら遷移中フラグを下ろす
      _setIsPoweredOn((prev) => {
        const next = message.state !== RobotMode.POWERED_OFF
        if (prev !== next) setIsPowerTransitioning(false)
        return next
      })
    })

    return () => robotStateTopic.unsubscribe()
  }, [robotStateTopic])

  const setIsPoweredOn = useCallback(
    (val: boolean) => {
      if (isPowerTransitioning) {
        console.warn('Power transition already in progress')
        return
      }
      setIsPowerTransitioning(true)

      if (val) {
        powerOnService?.callService(
          null,
          (_res) => {
            const res = _res as PowerOnResponce
            if (res.success) {
              console.log('Power ON requested')
              toast?.show('Power ON requested', 'success')
            } else {
              console.error('Power ON failed:', res.error_msg)
              toast?.show(`Power ON failed: ${res.error_msg}`, 'error')
              setIsPowerTransitioning(false)
            }
          },
          (err) => {
            console.error('Power ON service call failed', err)
            toast?.show('Power ON service call failed', 'error')
            setIsPowerTransitioning(false)
          },
        )
      } else {
        powerOffService?.callService(
          null,
          (_res) => {
            const res = _res as PowerOffResponce
            if (res.success) {
              console.log('Power OFF requested')
              toast?.show('Power OFF requested', 'success')
            } else {
              console.error('Power OFF failed:', res.error_msg)
              toast?.show(`Power OFF failed: ${res.error_msg}`, 'error')
              setIsPowerTransitioning(false)
            }
          },
          (err) => {
            console.error('Power OFF service call failed', err)
            toast?.show('Power OFF service call failed', 'error')
            setIsPowerTransitioning(false)
          },
        )
      }
    },
    [isPowerTransitioning, powerOnService, powerOffService, toast],
  )

  const setMode = useCallback(
    (mode: RobotMode) => {
      const request: SetModeRequest = {
        mode,
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
      _setIsPoweredOn(null)
      _setMode(null)
      setIsPowerTransitioning(false)
    }
  }, [connectionState])

  const contextValue = useMemo(() => {
    return {
      isPoweredOn,
      setIsPoweredOn,
      isPowerTransitioning,
      mode,
      setMode,
    }
  }, [isPoweredOn, isPowerTransitioning, mode, setIsPoweredOn, setMode])

  return <RobotStateContext value={contextValue}>{children}</RobotStateContext>
}

export { RobotStateProvider, RobotStateContext }

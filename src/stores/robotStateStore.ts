import { type Ros, Service, Topic } from 'roslib'
import { create } from 'zustand'
import type { RobotState } from '@/msgs/OriginalMsgs'
import type {
  PowerOffResponce,
  PowerOnResponce,
  SetModeRequest,
  SetModeResponse,
} from '@/msgs/OriginalServices'
import {
  numToRobotMode,
  type OperationMode,
  type RobotMode,
  RobotModeMap,
  robotModeToNum,
  robotModeToString,
} from '@/msgs/utils/RobotMode'
import { useRosStore } from '@/stores/rosStore'
import { useToastStore } from '@/stores/toastStore'

export type MainPowerState =
  | 'unknown'
  | 'off'
  | 'on'
  | 'poweringOn'
  | 'poweringOff'
export type ModeTransitionState = 'idle' | 'transitioning'

type RobotStateStore = {
  mainPowerState: MainPowerState
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
  setMainPower: (on: boolean) => void
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

let activeRos: Ros | null = null
let powerOnService: Service | null = null
let powerOffService: Service | null = null
let setModeService: Service | null = null
let robotStateTopic: Topic | null = null

const resetRemoteState = () => {
  useRobotStateStore.setState({
    mainPowerState: 'unknown',
    mode: null,
    modeTransitionState: 'idle',
  })
}

const requestSetMode = (requestedMode: RobotMode) => {
  const { modeTransitionState } = useRobotStateStore.getState()
  if (modeTransitionState === 'transitioning') {
    console.warn('Mode transition already in progress')
    return
  }
  if (!setModeService) {
    useToastStore.getState().show('Set Mode service is unavailable', 'error')
    return
  }

  useRobotStateStore.setState({ modeTransitionState: 'transitioning' })
  const request: SetModeRequest = { mode: robotModeToNum(requestedMode) }

  setModeService.callService(
    request,
    (_response) => {
      const response = _response as SetModeResponse
      if (response.success) {
        console.log(`Set Mode to ${robotModeToString(requestedMode)} requested`)
        // useToastStore
        //   .getState()
        //   .show(
        //     `Set Mode to ${robotModeToString(requestedMode)} requested`,
        //     'success',
        //   )
        return
      }

      console.error('Set Mode failed:', response.error_msg)
      useToastStore
        .getState()
        .show(`Set Mode failed: ${response.error_msg}`, 'error')
      useRobotStateStore.setState({ modeTransitionState: 'idle' })
    },
    (error) => {
      console.error('Set Mode service call failed', error)
      useToastStore.getState().show('Set Mode service call failed', 'error')
      useRobotStateStore.setState({ modeTransitionState: 'idle' })
    },
  )
}

export const useRobotStateStore = create<RobotStateStore>((set, get) => ({
  mainPowerState: 'unknown',
  mode: null,
  modeTransitionState: 'idle',
  operationMode: 'MANUAL',

  setMainPower: (on) => {
    const { mainPowerState } = get()
    if (mainPowerState === 'poweringOn' || mainPowerState === 'poweringOff') {
      console.warn('Power transition already in progress')
      return
    }

    const service = on ? powerOnService : powerOffService
    if (!service) {
      useToastStore
        .getState()
        .show(`Power ${on ? 'ON' : 'OFF'} service is unavailable`, 'error')
      return
    }

    set({ mainPowerState: on ? 'poweringOn' : 'poweringOff' })
    service.callService(
      null,
      (_response) => {
        const response = _response as PowerOnResponce | PowerOffResponce
        if (response.success) {
          console.log(`Power ${on ? 'ON' : 'OFF'} requested`)
          useToastStore
            .getState()
            .show(`Power ${on ? 'ON' : 'OFF'} requested`, 'success')
          return
        }

        console.error(`Power ${on ? 'ON' : 'OFF'} failed:`, response.error_msg)
        useToastStore
          .getState()
          .show(
            `Power ${on ? 'ON' : 'OFF'} failed: ${response.error_msg}`,
            'error',
          )
        // 状態を元に戻す
        set({ mainPowerState: on ? 'off' : 'on' })
      },
      () => {
        console.error(`Power ${on ? 'ON' : 'OFF'} service call failed`)
        useToastStore
          .getState()
          .show(`Power ${on ? 'ON' : 'OFF'} service call failed`, 'error')
        // 状態を元に戻す
        set({ mainPowerState: on ? 'off' : 'on' })
      },
    )
  },

  setOperationMode: (operationMode) => set({ operationMode }),

  enterOperation: () => {
    const { mode, operationMode } = get()
    if (mode !== 'STANDBY') {
      console.warn('Robot is not in STANDBY')
      return
    }
    requestSetMode(operationMode)
  },

  enterStandby: () => {
    if (get().mode === 'STANDBY') return
    requestSetMode('STANDBY')
  },
}))

const configureRos = (ros: Ros | null) => {
  if (activeRos === ros) return

  robotStateTopic?.unsubscribe()
  activeRos = ros
  powerOnService = null
  powerOffService = null
  setModeService = null
  robotStateTopic = null

  if (!ros) return

  powerOnService = new Service({
    ros,
    name: '/user_input/power_on',
    serviceType: 'sinsei_umiusi_msgs/srv/PowerOn',
  })
  powerOffService = new Service({
    ros,
    name: '/user_input/power_off',
    serviceType: 'sinsei_umiusi_msgs/srv/PowerOff',
  })
  setModeService = new Service({
    ros,
    name: '/user_input/set_mode',
    serviceType: 'sinsei_umiusi_msgs/srv/SetMode',
  })
  robotStateTopic = new Topic({
    ros,
    name: '/robot_state',
    messageType: 'sinsei_umiusi_msgs/msg/RobotState',
  })

  robotStateTopic.subscribe((_message) => {
    const message = _message as RobotState
    const mode = numToRobotMode(message.state) ?? null
    const previousMode = useRobotStateStore.getState().mode

    useRobotStateStore.setState({
      mainPowerState: message.state === RobotModeMap.POWERED_OFF ? 'off' : 'on',
      mode,
      // モードが変化したらmodeTransitionStateを'idle'に戻す
      modeTransitionState:
        previousMode !== mode
          ? 'idle'
          : useRobotStateStore.getState().modeTransitionState,
    })
  })
}

export const initializeRobotStateStore = () => {
  const initialRosState = useRosStore.getState()
  configureRos(initialRosState.ros)
  if (initialRosState.connectionState !== 'connected') resetRemoteState()

  const unsubscribe = useRosStore.subscribe((state, previousState) => {
    if (state.ros !== previousState.ros) configureRos(state.ros)
    if (
      state.connectionState !== previousState.connectionState &&
      state.connectionState !== 'connected'
    ) {
      // 接続が切れたら状態をリセット
      resetRemoteState()
    }
  })

  return () => {
    unsubscribe()
    configureRos(null)
    resetRemoteState()
  }
}

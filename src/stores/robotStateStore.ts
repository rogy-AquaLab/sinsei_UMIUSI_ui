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
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

export type MainPowerState =
  | 'unknown'
  | 'off'
  | 'on'
  | 'poweringOn'
  | 'poweringOff'
export type ModeTransitionState = 'idle' | 'transitioning'

const POWER_ON_SERVICE = {
  name: '/user_input/power_on',
  serviceType: 'sinsei_umiusi_msgs/srv/PowerOn',
}
const POWER_OFF_SERVICE = {
  name: '/user_input/power_off',
  serviceType: 'sinsei_umiusi_msgs/srv/PowerOff',
}
const SET_MODE_SERVICE = {
  name: '/user_input/set_mode',
  serviceType: 'sinsei_umiusi_msgs/srv/SetMode',
}
const ROBOT_STATE_TOPIC = {
  name: '/robot_state',
  messageType: 'sinsei_umiusi_msgs/msg/RobotState',
}

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

let disposeRobotStateSubscription: (() => void) | null = null

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
  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') {
    useNotificationStore
      .getState()
      .notify('Set Mode service is unavailable', 'error')
    return
  }

  const request: SetModeRequest = { mode: robotModeToNum(requestedMode) }
  const serviceCall = session.call<SetModeRequest, SetModeResponse>(
    SET_MODE_SERVICE,
    request,
  )

  useRobotStateStore.setState({ modeTransitionState: 'transitioning' })
  void serviceCall
    .then((response) => {
      if (response.success) {
        console.log(`Set Mode to ${robotModeToString(requestedMode)} requested`)
        // useNotificationStore
        //   .getState()
        //   .notify(
        //     `Set Mode to ${robotModeToString(requestedMode)} requested`,
        //     'success',
        //   )
        return
      }

      console.error('Set Mode failed:', response.error_msg)
      useNotificationStore
        .getState()
        .notify(`Set Mode failed: ${response.error_msg}`, 'error')
      useRobotStateStore.setState({ modeTransitionState: 'idle' })
    })
    .catch((error) => {
      console.error('Set Mode service call failed', error)
      useNotificationStore
        .getState()
        .notify('Set Mode service call failed', 'error')
      useRobotStateStore.setState({ modeTransitionState: 'idle' })
    })
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

    const { session, connectionState } = useRosStore.getState()
    if (!session || connectionState !== 'connected') {
      useNotificationStore
        .getState()
        .notify(`Power ${on ? 'ON' : 'OFF'} service is unavailable`, 'error')
      return
    }

    const serviceOptions = on ? POWER_ON_SERVICE : POWER_OFF_SERVICE
    const serviceCall = session.call<null, PowerOnResponce | PowerOffResponce>(
      serviceOptions,
      null,
    )
    const isCurrentSessionConnected = () => {
      const current = useRosStore.getState()
      return (
        current.session === session && current.connectionState === 'connected'
      )
    }

    set({ mainPowerState: on ? 'poweringOn' : 'poweringOff' })
    void serviceCall
      .then((response) => {
        if (!isCurrentSessionConnected()) return

        if (response.success) {
          console.log(`Power ${on ? 'ON' : 'OFF'} requested`)
          useNotificationStore
            .getState()
            .notify(`Power ${on ? 'ON' : 'OFF'} requested`, 'success')
          return
        }

        console.error(`Power ${on ? 'ON' : 'OFF'} failed:`, response.error_msg)
        useNotificationStore
          .getState()
          .notify(
            `Power ${on ? 'ON' : 'OFF'} failed: ${response.error_msg}`,
            'error',
          )
        // 状態を元に戻す
        set({ mainPowerState: on ? 'off' : 'on' })
      })
      .catch(() => {
        if (!isCurrentSessionConnected()) return

        console.error(`Power ${on ? 'ON' : 'OFF'} service call failed`)
        useNotificationStore
          .getState()
          .notify(`Power ${on ? 'ON' : 'OFF'} service call failed`, 'error')
        // 状態を元に戻す
        set({ mainPowerState: on ? 'off' : 'on' })
      })
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

const handleRobotStateMessage = (message: RobotState) => {
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
}

const syncRobotStateSubscription = () => {
  disposeRobotStateSubscription?.()
  disposeRobotStateSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeRobotStateSubscription = session.subscribe<RobotState>(
    ROBOT_STATE_TOPIC,
    handleRobotStateMessage,
  )
}

export const initializeRobotStateStore = () => {
  const initialRosState = useRosStore.getState()
  syncRobotStateSubscription()
  if (initialRosState.connectionState !== 'connected') resetRemoteState()

  const unsubscribe = useRosStore.subscribe((state, previousState) => {
    if (
      state.session !== previousState.session ||
      state.connectionState !== previousState.connectionState
    ) {
      syncRobotStateSubscription()
      if (state.connectionState !== 'connected') {
        // 接続が切れたら状態をリセット
        resetRemoteState()
      }
    }
  })

  return () => {
    unsubscribe()
    disposeRobotStateSubscription?.()
    disposeRobotStateSubscription = null
    resetRemoteState()
  }
}

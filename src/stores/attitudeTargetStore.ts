import { create } from 'zustand'
import type { AttitudeTarget } from '@/msgs/OriginalMsgs'
import type {
  GetParametersRequest,
  GetParametersResponse,
} from '@/msgs/RclInterfacesMsgs'
import { useRosStore } from '@/stores/rosStore'

export type ControlMode = 'ff' | 'fb'

type AttitudeTargetStore = {
  /**
   * control が受け取っている hold_yaw。指令が途切れている間は null
   */
  holdYaw: boolean | null
  /**
   * attitude_controller の control_mode。取得できなければ null。
   * hold_yaw は fb でしか効かない
   */
  controlMode: ControlMode | null
}

// UI が出す /user_input ではなく、MANUAL / AUTO を問わず control に届く指令を見る
const ATTITUDE_TARGET_TOPIC = {
  name: '/cmd/attitude_target',
  messageType: 'sinsei_umiusi_msgs/msg/AttitudeTarget',
}
const GET_ATTITUDE_CONTROLLER_PARAMS = {
  name: '/attitude_controller/get_parameters',
  serviceType: 'rcl_interfaces/srv/GetParameters',
}
const STALE_MS = 1_000

const initialState: AttitudeTargetStore = {
  holdYaw: null,
  controlMode: null,
}

export const useAttitudeTargetStore = create<AttitudeTargetStore>(
  () => initialState,
)

let receivedAt: number | null = null
let disposeSubscription: (() => void) | null = null

const reset = () => {
  receivedAt = null
  useAttitudeTargetStore.setState(initialState)
}

const refreshStale = () => {
  if (receivedAt !== null && Date.now() - receivedAt > STALE_MS) {
    receivedAt = null
    useAttitudeTargetStore.setState({ holdYaw: null })
  }
}

const fetchControlMode = () => {
  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  void session
    .call<GetParametersRequest, GetParametersResponse>(
      GET_ATTITUDE_CONTROLLER_PARAMS,
      { names: ['control_mode'] },
    )
    .then((response) => {
      const value = response.values[0]?.string_value
      useAttitudeTargetStore.setState({
        controlMode: value === 'ff' || value === 'fb' ? value : null,
      })
    })
    .catch(() => useAttitudeTargetStore.setState({ controlMode: null }))
}

const syncSubscription = () => {
  disposeSubscription?.()
  disposeSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeSubscription = session.subscribe<AttitudeTarget>(
    ATTITUDE_TARGET_TOPIC,
    (message) => {
      receivedAt = Date.now()
      const holdYaw = message.hold_yaw ?? false
      // 50 Hz で届くので、値が変わったときだけ更新する
      if (useAttitudeTargetStore.getState().holdYaw !== holdYaw) {
        useAttitudeTargetStore.setState({ holdYaw })
      }
    },
  )
}

export const initializeAttitudeTargetStore = () => {
  syncSubscription()
  fetchControlMode()
  if (useRosStore.getState().connectionState !== 'connected') reset()

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncSubscription()
    if (state.connectionState !== 'connected') reset()
    else fetchControlMode()
  })
  const refreshTimer = window.setInterval(refreshStale, 500)
  // control は再起動されることがあるので、モードは定期的に取り直す
  const controlModeTimer = window.setInterval(fetchControlMode, 10_000)

  return () => {
    window.clearInterval(refreshTimer)
    window.clearInterval(controlModeTimer)
    unsubscribeRos()
    disposeSubscription?.()
    disposeSubscription = null
    reset()
  }
}

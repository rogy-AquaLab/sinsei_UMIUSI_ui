import { create } from 'zustand'
import type { ThrusterStateAll } from '@/msgs/OriginalMsgs'
import { useRosStore } from '@/stores/rosStore'

export type ThrusterTelemetryStatus = 'unknown' | 'fresh' | 'stale'

type ThrusterStateStore = {
  thrusters: ThrusterStateAll | null
  receivedAt: number | null
  telemetryStatus: ThrusterTelemetryStatus
}

const THRUSTER_TIMEOUT_MS = 2_000
const THRUSTER_STATE_TOPIC = {
  name: '/state/thruster_state_all',
  messageType: 'sinsei_umiusi_msgs/msg/ThrusterStateAll',
}

const initialState: ThrusterStateStore = {
  thrusters: null,
  receivedAt: null,
  telemetryStatus: 'unknown',
}

export const useThrusterStateStore = create<ThrusterStateStore>(
  () => initialState,
)

const refreshTelemetryStatus = () => {
  const state = useThrusterStateStore.getState()
  const connected = useRosStore.getState().connectionState === 'connected'
  const telemetryStatus =
    connected && state.thrusters && state.receivedAt !== null
      ? Date.now() - state.receivedAt > THRUSTER_TIMEOUT_MS
        ? 'stale'
        : 'fresh'
      : 'unknown'

  if (telemetryStatus !== state.telemetryStatus) {
    useThrusterStateStore.setState({ telemetryStatus })
  }
}

const resetThrusterState = () => useThrusterStateStore.setState(initialState)

let disposeThrusterSubscription: (() => void) | null = null

const syncThrusterSubscription = () => {
  disposeThrusterSubscription?.()
  disposeThrusterSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeThrusterSubscription = session.subscribe<ThrusterStateAll>(
    THRUSTER_STATE_TOPIC,
    (thrusters) => {
      useThrusterStateStore.setState({
        thrusters,
        receivedAt: Date.now(),
        telemetryStatus: 'fresh',
      })
    },
  )
}

export const initializeThrusterStateStore = () => {
  syncThrusterSubscription()
  if (useRosStore.getState().connectionState !== 'connected') {
    resetThrusterState()
  }

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncThrusterSubscription()
    if (state.connectionState !== 'connected') resetThrusterState()
  })
  const refreshTimer = window.setInterval(refreshTelemetryStatus, 1_000)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    disposeThrusterSubscription?.()
    disposeThrusterSubscription = null
    resetThrusterState()
  }
}

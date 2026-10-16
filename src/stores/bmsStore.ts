import { create } from 'zustand'
import type { BmsState } from '@/msgs/OriginalMsgs'
import type { BatteryState } from '@/msgs/SensorMsgs'
import { useRosStore } from '@/stores/rosStore'

export type BmsTelemetryStatus = 'unknown' | 'fresh' | 'stale'

type BmsStore = {
  battery: BatteryState | null
  bms: BmsState | null
  receivedAt: number | null
  telemetryStatus: BmsTelemetryStatus
}

const BMS_TIMEOUT_MS = 2_000
const BATTERY_STATE_TOPIC = {
  name: '/state/power/battery',
  messageType: 'sensor_msgs/msg/BatteryState',
}
const BMS_STATE_TOPIC = {
  name: '/state/power/bms',
  messageType: 'sinsei_umiusi_msgs/msg/BmsState',
}

const initialState: BmsStore = {
  battery: null,
  bms: null,
  receivedAt: null,
  telemetryStatus: 'unknown',
}

export const useBmsStore = create<BmsStore>(() => initialState)

const refreshTelemetryStatus = () => {
  const state = useBmsStore.getState()
  const connected = useRosStore.getState().connectionState === 'connected'
  const telemetryStatus =
    connected && state.receivedAt !== null
      ? Date.now() - state.receivedAt > BMS_TIMEOUT_MS
        ? 'stale'
        : 'fresh'
      : 'unknown'

  if (telemetryStatus !== state.telemetryStatus) {
    useBmsStore.setState({ telemetryStatus })
  }
}

const resetBmsState = () => useBmsStore.setState(initialState)

let disposeBmsSubscriptions: (() => void)[] = []

const syncBmsSubscriptions = () => {
  for (const dispose of disposeBmsSubscriptions) dispose()
  disposeBmsSubscriptions = []

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  // 2つのtopicは同じ周期でpublishされるため、受信時刻はまとめて扱う
  disposeBmsSubscriptions = [
    session.subscribe<BatteryState>(BATTERY_STATE_TOPIC, (battery) => {
      useBmsStore.setState({
        battery,
        receivedAt: Date.now(),
        telemetryStatus: 'fresh',
      })
    }),
    session.subscribe<BmsState>(BMS_STATE_TOPIC, (bms) => {
      useBmsStore.setState({
        bms,
        receivedAt: Date.now(),
        telemetryStatus: 'fresh',
      })
    }),
  ]
}

export const initializeBmsStore = () => {
  syncBmsSubscriptions()
  if (useRosStore.getState().connectionState !== 'connected') {
    resetBmsState()
  }

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncBmsSubscriptions()
    if (state.connectionState !== 'connected') resetBmsState()
  })
  const refreshTimer = window.setInterval(refreshTelemetryStatus, 1_000)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    for (const dispose of disposeBmsSubscriptions) dispose()
    disposeBmsSubscriptions = []
    resetBmsState()
  }
}

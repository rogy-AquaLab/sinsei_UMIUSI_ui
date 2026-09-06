import { create } from 'zustand'
import type {
  HealthCheckResult,
  HighPowerCircuitInfo,
  LowPowerCircuitInfo,
} from '@/msgs/OriginalMsgs'
import { useRosStore } from '@/stores/rosStore'

export type HealthStatus = 'unknown' | 'ok' | 'error' | 'stale'

export type HealthReading = {
  isOk: boolean
  receivedAt: number
}

export type CircuitInfoReading<T> = {
  value: T
  receivedAt: number
}

type HealthStore = {
  lowPower: HealthReading | null
  highPower: HealthReading | null
  lowPowerInfo: CircuitInfoReading<LowPowerCircuitInfo> | null
  highPowerInfo: CircuitInfoReading<HighPowerCircuitInfo> | null
  lowPowerStatus: HealthStatus
  highPowerStatus: HealthStatus
  overallStatus: HealthStatus
}

const HEALTH_TIMEOUT_MS = 2_000

const LOW_POWER_HEALTH_TOPIC = {
  name: '/low_power_health_check_result',
  messageType: 'sinsei_umiusi_msgs/msg/HealthCheckResult',
}
const HIGH_POWER_HEALTH_TOPIC = {
  name: '/high_power_health_check_result',
  messageType: 'sinsei_umiusi_msgs/msg/HealthCheckResult',
}
const LOW_POWER_INFO_TOPIC = {
  name: '/state/low_power_circuit_info',
  messageType: 'sinsei_umiusi_msgs/msg/LowPowerCircuitInfo',
}
const HIGH_POWER_INFO_TOPIC = {
  name: '/state/high_power_circuit_info',
  messageType: 'sinsei_umiusi_msgs/msg/HighPowerCircuitInfo',
}

const initialState: HealthStore = {
  lowPower: null,
  highPower: null,
  lowPowerInfo: null,
  highPowerInfo: null,
  lowPowerStatus: 'unknown',
  highPowerStatus: 'unknown',
  overallStatus: 'unknown',
}

export const useHealthStore = create<HealthStore>(() => initialState)

const resolveStatus = (
  reading: HealthReading | null,
  now: number,
  connected: boolean,
): HealthStatus => {
  if (!connected || !reading) return 'unknown'
  if (now - reading.receivedAt > HEALTH_TIMEOUT_MS) return 'stale'
  return reading.isOk ? 'ok' : 'error'
}

const resolveOverallStatus = (
  lowPowerStatus: HealthStatus,
  highPowerStatus: HealthStatus,
): HealthStatus => {
  const statuses = [lowPowerStatus, highPowerStatus]
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('stale')) return 'stale'
  if (statuses.includes('unknown')) return 'unknown'
  return 'ok'
}

const refreshHealthStatuses = () => {
  const state = useHealthStore.getState()
  const connected = useRosStore.getState().connectionState === 'connected'
  const now = Date.now()
  const lowPowerStatus = resolveStatus(state.lowPower, now, connected)
  const highPowerStatus = resolveStatus(state.highPower, now, connected)
  const overallStatus = resolveOverallStatus(lowPowerStatus, highPowerStatus)

  if (
    lowPowerStatus === state.lowPowerStatus &&
    highPowerStatus === state.highPowerStatus &&
    overallStatus === state.overallStatus
  ) {
    return
  }

  useHealthStore.setState({
    lowPowerStatus,
    highPowerStatus,
    overallStatus,
  })
}

const resetHealthState = () => useHealthStore.setState(initialState)

let disposeHealthSubscriptions: (() => void)[] = []

const syncHealthSubscriptions = () => {
  for (const dispose of disposeHealthSubscriptions) dispose()
  disposeHealthSubscriptions = []

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeHealthSubscriptions = [
    session.subscribe<HealthCheckResult>(LOW_POWER_HEALTH_TOPIC, (message) => {
      useHealthStore.setState({
        lowPower: { isOk: message.is_ok, receivedAt: Date.now() },
      })
      refreshHealthStatuses()
    }),
    session.subscribe<HealthCheckResult>(HIGH_POWER_HEALTH_TOPIC, (message) => {
      useHealthStore.setState({
        highPower: { isOk: message.is_ok, receivedAt: Date.now() },
      })
      refreshHealthStatuses()
    }),
    session.subscribe<LowPowerCircuitInfo>(LOW_POWER_INFO_TOPIC, (message) => {
      useHealthStore.setState({
        lowPowerInfo: { value: message, receivedAt: Date.now() },
      })
    }),
    session.subscribe<HighPowerCircuitInfo>(
      HIGH_POWER_INFO_TOPIC,
      (message) => {
        useHealthStore.setState({
          highPowerInfo: { value: message, receivedAt: Date.now() },
        })
      },
    ),
  ]
}

export const initializeHealthStore = () => {
  syncHealthSubscriptions()
  if (useRosStore.getState().connectionState !== 'connected') {
    resetHealthState()
  }

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncHealthSubscriptions()
    if (state.connectionState !== 'connected') resetHealthState()
  })
  const refreshTimer = window.setInterval(refreshHealthStatuses, 1_000)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    for (const dispose of disposeHealthSubscriptions) dispose()
    disposeHealthSubscriptions = []
    resetHealthState()
  }
}

import { create } from 'zustand'
import type { ThrusterState, ThrusterStateAll } from '@/msgs/OriginalMsgs'
import { useRosStore } from '@/stores/rosStore'

export type ActuatorName =
  | 'thruster1'
  | 'thruster2'
  | 'thruster3'
  | 'crawler_left'
  | 'crawler_right'

export type ActuatorTelemetryStatus = 'unknown' | 'fresh' | 'stale'

export type ActuatorReading = {
  state: ThrusterState
  receivedAt: number
}

type ActuatorStateStore = {
  actuators: Record<ActuatorName, ActuatorReading | null>
  telemetryStatus: Record<ActuatorName, ActuatorTelemetryStatus>
}

const ACTUATOR_TIMEOUT_MS = 2_000
const ACTUATOR_NAMES: ActuatorName[] = [
  'thruster1',
  'thruster2',
  'thruster3',
  'crawler_left',
  'crawler_right',
]

const THRUSTER_STATE_TOPIC = {
  name: '/state/thruster_state_all',
  messageType: 'sinsei_umiusi_msgs/msg/ThrusterStateAll',
}
const crawlerStateTopic = (name: 'crawler_left' | 'crawler_right') => ({
  name: `/state/${name}`,
  messageType: 'sinsei_umiusi_msgs/msg/ThrusterState',
})

const createInitialState = (): ActuatorStateStore => ({
  actuators: {
    thruster1: null,
    thruster2: null,
    thruster3: null,
    crawler_left: null,
    crawler_right: null,
  },
  telemetryStatus: {
    thruster1: 'unknown',
    thruster2: 'unknown',
    thruster3: 'unknown',
    crawler_left: 'unknown',
    crawler_right: 'unknown',
  },
})

export const useActuatorStateStore =
  create<ActuatorStateStore>(createInitialState)

const updateActuators = (
  readings: Partial<Record<ActuatorName, ThrusterState>>,
) => {
  const receivedAt = Date.now()
  useActuatorStateStore.setState((store) => {
    const actuators = { ...store.actuators }
    const telemetryStatus = { ...store.telemetryStatus }
    for (const [name, state] of Object.entries(readings)) {
      actuators[name as ActuatorName] = { state, receivedAt }
      telemetryStatus[name as ActuatorName] = 'fresh'
    }
    return { actuators, telemetryStatus }
  })
}

const refreshTelemetryStatus = () => {
  const { actuators, telemetryStatus } = useActuatorStateStore.getState()
  const connected = useRosStore.getState().connectionState === 'connected'
  const now = Date.now()

  let changed = false
  const next = { ...telemetryStatus }
  for (const name of ACTUATOR_NAMES) {
    const reading = actuators[name]
    const status: ActuatorTelemetryStatus =
      connected && reading
        ? now - reading.receivedAt > ACTUATOR_TIMEOUT_MS
          ? 'stale'
          : 'fresh'
        : 'unknown'
    if (status !== telemetryStatus[name]) {
      next[name] = status
      changed = true
    }
  }
  if (changed) useActuatorStateStore.setState({ telemetryStatus: next })
}

const resetActuatorState = () =>
  useActuatorStateStore.setState(createInitialState())

let disposeActuatorSubscriptions: (() => void)[] = []

const syncActuatorSubscriptions = () => {
  for (const dispose of disposeActuatorSubscriptions) dispose()
  disposeActuatorSubscriptions = []

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeActuatorSubscriptions = [
    // 左前から反時計回りに thruster1〜3 = 左前、後ろ、右前 = lf、lb、rf（rbは無い）
    session.subscribe<ThrusterStateAll>(THRUSTER_STATE_TOPIC, (message) =>
      updateActuators({
        thruster1: message.lf,
        thruster2: message.lb,
        thruster3: message.rf,
      }),
    ),
    session.subscribe<ThrusterState>(
      crawlerStateTopic('crawler_left'),
      (message) => updateActuators({ crawler_left: message }),
    ),
    session.subscribe<ThrusterState>(
      crawlerStateTopic('crawler_right'),
      (message) => updateActuators({ crawler_right: message }),
    ),
  ]
}

export const initializeActuatorStateStore = () => {
  syncActuatorSubscriptions()
  if (useRosStore.getState().connectionState !== 'connected') {
    resetActuatorState()
  }

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncActuatorSubscriptions()
    if (state.connectionState !== 'connected') resetActuatorState()
  })
  const refreshTimer = window.setInterval(refreshTelemetryStatus, 1_000)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    for (const dispose of disposeActuatorSubscriptions) dispose()
    disposeActuatorSubscriptions = []
    resetActuatorState()
  }
}

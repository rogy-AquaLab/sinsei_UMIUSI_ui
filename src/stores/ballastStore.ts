import { create } from 'zustand'
import type * as StdMsgs from '@/msgs/StdMsgs'
import type { Publisher, RosSession } from '@/services/rosSession'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

export const BALLAST_NAMES = ['ballast1', 'ballast2'] as const
export type BallastName = (typeof BALLAST_NAMES)[number]

export type BallastTelemetryStatus = 'unknown' | 'fresh' | 'stale'

/**
 * SteppingMotorDriver基板の各軸の状態
 * ref: https://github.com/rogy-AquaLab/SteppingMotorDriver/blob/main/docs/can_protocol.md
 */
export const BALLAST_STATE = {
  UNCALIBRATED: 0,
  APPROACHING_MIN_FAST: 1,
  LEAVING_MIN: 2,
  APPROACHING_MIN_SLOW: 3,
  MEASURING_TRAVEL: 4,
  READY: 5,
  FAULT: 6,
} as const

export type BallastState = {
  /**
   * 取り込んだ水の量（0.0 = 排水、1.0 = 注水）。不明ならnull
   */
  position: number | null
  state: number | null
  faultReason: number | null
  receivedAt: number | null
  telemetryStatus: BallastTelemetryStatus
}

type BallastStore = {
  ballasts: Record<BallastName, BallastState>
  /**
   * 目標（0.0〜1.0）を送る
   */
  setTarget: (name: BallastName, target: number) => void
  /**
   * ゼロ点を取り直す
   */
  calibrate: (name: BallastName) => void
}

const BALLAST_TIMEOUT_MS = 2_000

const initialBallastState: BallastState = {
  position: null,
  state: null,
  faultReason: null,
  receivedAt: null,
  telemetryStatus: 'unknown',
}

const createInitialBallasts = (): Record<BallastName, BallastState> => ({
  ballast1: { ...initialBallastState },
  ballast2: { ...initialBallastState },
})

type BallastPublishers = {
  target: Publisher<StdMsgs.Float64>
  calibrate: Publisher<StdMsgs.Empty>
}

let publishers: Partial<Record<BallastName, BallastPublishers>> = {}

const notifyNotConnected = () =>
  useNotificationStore
    .getState()
    .notify('Connect to ROS before operating the ballast', 'warning')

export const useBallastStore = create<BallastStore>(() => ({
  ballasts: createInitialBallasts(),

  setTarget: (name, target) => {
    const publisher = publishers[name]?.target
    if (!publisher) {
      notifyNotConnected()
      return
    }
    publisher.publish({ data: Math.min(Math.max(target, 0), 1) })
  },

  calibrate: (name) => {
    const publisher = publishers[name]?.calibrate
    if (!publisher) {
      notifyNotConnected()
      return
    }
    publisher.publish({})
    useNotificationStore.getState().notify(`Calibrating ${name}`, 'info')
  },
}))

const updateBallast = (name: BallastName, update: Partial<BallastState>) =>
  useBallastStore.setState((store) => ({
    ballasts: {
      ...store.ballasts,
      [name]: {
        ...store.ballasts[name],
        ...update,
        receivedAt: Date.now(),
        telemetryStatus: 'fresh',
      },
    },
  }))

const refreshTelemetryStatus = () => {
  const connected = useRosStore.getState().connectionState === 'connected'
  const { ballasts } = useBallastStore.getState()

  let changed = false
  const next = { ...ballasts }
  for (const name of BALLAST_NAMES) {
    const { receivedAt, telemetryStatus } = ballasts[name]
    const status: BallastTelemetryStatus =
      connected && receivedAt !== null
        ? Date.now() - receivedAt > BALLAST_TIMEOUT_MS
          ? 'stale'
          : 'fresh'
        : 'unknown'
    if (status !== telemetryStatus) {
      next[name] = { ...ballasts[name], telemetryStatus: status }
      changed = true
    }
  }
  if (changed) useBallastStore.setState({ ballasts: next })
}

const resetBallasts = () =>
  useBallastStore.setState({ ballasts: createInitialBallasts() })

const subscribeBallast = (session: RosSession, name: BallastName) => {
  const prefix = `/state/${name}/`
  const disposers = [
    session.subscribe<StdMsgs.Float64>(
      { name: `${prefix}position`, messageType: 'std_msgs/msg/Float64' },
      // NaNはrosbridgeでnullとして届く
      ({ data }) =>
        updateBallast(name, {
          position:
            typeof data === 'number' && Number.isFinite(data) ? data : null,
        }),
    ),
    session.subscribe<StdMsgs.UInt8>(
      { name: `${prefix}state`, messageType: 'std_msgs/msg/UInt8' },
      ({ data }) => updateBallast(name, { state: data }),
    ),
    session.subscribe<StdMsgs.UInt8>(
      { name: `${prefix}fault_reason`, messageType: 'std_msgs/msg/UInt8' },
      ({ data }) => updateBallast(name, { faultReason: data }),
    ),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}

let disposeSession: (() => void) | null = null

const syncBallastSession = () => {
  disposeSession?.()
  disposeSession = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  const disposers: (() => void)[] = []
  for (const name of BALLAST_NAMES) {
    const prefix = `/cmd/${name}/`
    const target = session.publisher<StdMsgs.Float64>({
      name: `${prefix}target`,
      messageType: 'std_msgs/msg/Float64',
    })
    const calibrate = session.publisher<StdMsgs.Empty>({
      name: `${prefix}calibrate`,
      messageType: 'std_msgs/msg/Empty',
    })
    publishers[name] = { target, calibrate }
    disposers.push(target.dispose, calibrate.dispose)
    disposers.push(subscribeBallast(session, name))
  }

  disposeSession = () => {
    publishers = {}
    for (const dispose of disposers) dispose()
  }
}

export const initializeBallastStore = () => {
  syncBallastSession()
  if (useRosStore.getState().connectionState !== 'connected') resetBallasts()

  const unsubscribeRos = useRosStore.subscribe((state, previousState) => {
    if (
      state.session === previousState.session &&
      state.connectionState === previousState.connectionState
    ) {
      return
    }

    syncBallastSession()
    if (state.connectionState !== 'connected') resetBallasts()
  })
  const refreshTimer = window.setInterval(refreshTelemetryStatus, 1_000)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    disposeSession?.()
    disposeSession = null
    resetBallasts()
  }
}

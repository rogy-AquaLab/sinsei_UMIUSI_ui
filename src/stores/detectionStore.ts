import { create } from 'zustand'
import type {
  BalloonDetection,
  BalloonDetectionArray,
} from '@/msgs/AutonomyMsgs'
import { useRosStore } from '@/stores/rosStore'

export type DetectionStatus = 'never' | 'live' | 'stale'

type DetectionStore = {
  /**
   * never: 一度も届いていない (perception が居ない) / stale: 途絶えた
   */
  status: DetectionStatus
  detections: BalloonDetection[]
  /** 直近の受信周期 [Hz]。不明なら null */
  rateHz: number | null
}

// perception は最大 10 Hz。auto_target_generator の detections_timeout_s (0.5 s) より長めに取る
const DETECTIONS_TOPIC = {
  name: '/perception_node/detections',
  messageType: 'umiusi_autonomy_msgs/msg/BalloonDetectionArray',
}
const STALE_MS = 1_000
const RATE_WINDOW_MS = 2_000

const initialState: DetectionStore = {
  status: 'never',
  detections: [],
  rateHz: null,
}

export const useDetectionStore = create<DetectionStore>(() => initialState)

let receivedAt: number[] = []
let disposeSubscription: (() => void) | null = null

const reset = () => {
  receivedAt = []
  useDetectionStore.setState(initialState)
}

const refresh = () => {
  const now = Date.now()
  receivedAt = receivedAt.filter((t) => now - t <= RATE_WINDOW_MS)
  const last = receivedAt.at(-1)
  const { status } = useDetectionStore.getState()
  if (status === 'live' && (last === undefined || now - last > STALE_MS)) {
    useDetectionStore.setState({ status: 'stale', detections: [] })
  }
  useDetectionStore.setState({
    rateHz:
      receivedAt.length >= 2
        ? receivedAt.length / (RATE_WINDOW_MS / 1000)
        : null,
  })
}

const syncSubscription = () => {
  disposeSubscription?.()
  disposeSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeSubscription = session.subscribe<BalloonDetectionArray>(
    DETECTIONS_TOPIC,
    (message) => {
      receivedAt.push(Date.now())
      useDetectionStore.setState({
        status: 'live',
        detections: message.detections ?? [],
      })
    },
  )
}

export const initializeDetectionStore = () => {
  syncSubscription()
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
  })
  const refreshTimer = window.setInterval(refresh, 250)

  return () => {
    window.clearInterval(refreshTimer)
    unsubscribeRos()
    disposeSubscription?.()
    disposeSubscription = null
    reset()
  }
}

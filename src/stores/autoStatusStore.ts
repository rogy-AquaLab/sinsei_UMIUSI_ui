import { create } from 'zustand'
import type {
  AutoDetection,
  AutoStatus,
} from '@/msgs/AutoTargetGeneratorStatus'
import { useRosStore } from '@/stores/rosStore'

export type AutoStatusLink = 'never' | 'live' | 'stale'

type AutoStatusStore = {
  /** never: 一度も届いていない / stale: 途絶えた（AUTO 以外では止まるのが正常） */
  link: AutoStatusLink
  status: AutoStatus | null
  /** 直近に処理されたフレームの検出（新しいフレームが来るまで保つ。枠がちらつかないように） */
  detections: AutoDetection[]
  /** 直近に処理されたフレームを受け取った時刻 [ms] */
  detectionsAt: number | null
  /** フレームを処理している頻度 [Hz]（new_frame の数） */
  frameRateHz: number | null
}

// auto_target_generator は AUTO の間 10 Hz で出す
const STATUS_TOPIC = {
  name: '/auto_target_generator/status',
  messageType: 'std_msgs/msg/String',
}
const STALE_MS = 1_000
const DETECTIONS_STALE_MS = 1_000
const RATE_WINDOW_MS = 2_000

const initialState: AutoStatusStore = {
  link: 'never',
  status: null,
  detections: [],
  detectionsAt: null,
  frameRateHz: null,
}

export const useAutoStatusStore = create<AutoStatusStore>(() => initialState)

let lastReceivedAt: number | null = null
let frameTimes: number[] = []
let disposeSubscription: (() => void) | null = null

const reset = () => {
  lastReceivedAt = null
  frameTimes = []
  useAutoStatusStore.setState(initialState)
}

const parse = (data: string): AutoStatus | null => {
  try {
    const value = JSON.parse(data) as AutoStatus
    return typeof value?.state === 'string' ? value : null
  } catch {
    return null
  }
}

const refresh = () => {
  const now = Date.now()
  frameTimes = frameTimes.filter((t) => now - t <= RATE_WINDOW_MS)
  const { link, detectionsAt } = useAutoStatusStore.getState()
  const update: Partial<AutoStatusStore> = {
    frameRateHz:
      frameTimes.length >= 2
        ? frameTimes.length / (RATE_WINDOW_MS / 1000)
        : null,
  }
  if (
    link === 'live' &&
    (lastReceivedAt === null || now - lastReceivedAt > STALE_MS)
  ) {
    update.link = 'stale'
  }
  if (detectionsAt !== null && now - detectionsAt > DETECTIONS_STALE_MS) {
    update.detections = []
    update.detectionsAt = null
  }
  useAutoStatusStore.setState(update)
}

const syncSubscription = () => {
  disposeSubscription?.()
  disposeSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeSubscription = session.subscribe<{ data: string }>(
    STATUS_TOPIC,
    (message) => {
      const status = parse(message.data)
      if (!status) return
      const now = Date.now()
      lastReceivedAt = now
      const update: Partial<AutoStatusStore> = { link: 'live', status }
      if (status.new_frame) {
        frameTimes.push(now)
        update.detections = status.detections ?? []
        update.detectionsAt = now
      }
      useAutoStatusStore.setState(update)
    },
  )
}

export const initializeAutoStatusStore = () => {
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

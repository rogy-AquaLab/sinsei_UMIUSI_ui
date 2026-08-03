import { create } from 'zustand'
import type { RclLog, RclLogLevel } from '@/msgs/RclInterfacesMsgs'
import {
  RCL_LOG_LEVEL_DEBUG,
  RCL_LOG_LEVEL_ERROR,
  RCL_LOG_LEVEL_FATAL,
  RCL_LOG_LEVEL_INFO,
  RCL_LOG_LEVEL_WARN,
} from '@/msgs/RclInterfacesMsgs'
import { useRosStore } from '@/stores/rosStore'

export type RosoutLog = {
  id: string
  timestamp: Date
  level: number
  levelLabel: string
  levelClass: string
  name: string
  message: string
  file?: string
  function?: string
  line?: number
}

type RosoutStore = {
  logs: RosoutLog[]
  reset: () => void
}

const ROSOUT_TOPIC = '/rosout'
const ROSOUT_MESSAGE_TYPE = 'rcl_interfaces/msg/Log'
const MAX_ROSOUT_LOGS = 200

const levelMap: Record<RclLogLevel, { label: string; klass: string }> = {
  [RCL_LOG_LEVEL_DEBUG]: { label: 'DEBUG', klass: 'badge-info' },
  [RCL_LOG_LEVEL_INFO]: { label: 'INFO', klass: 'badge-info' },
  [RCL_LOG_LEVEL_WARN]: { label: 'WARN', klass: 'badge-warning' },
  [RCL_LOG_LEVEL_ERROR]: { label: 'ERROR', klass: 'badge-error' },
  [RCL_LOG_LEVEL_FATAL]: { label: 'FATAL', klass: 'badge-error' },
}

export const useRosoutStore = create<RosoutStore>((set) => ({
  logs: [],
  reset: () => set({ logs: [] }),
}))

let disposeRosoutSubscription: (() => void) | null = null

const handleRosoutMessage = (message: RclLog) => {
  const nanosec = message.stamp.nanosec ?? 0
  const timestampMs =
    (message.stamp.sec ?? 0) * 1000 + Math.floor(nanosec / 1e6) || Date.now()
  const severity = levelMap[message.level as RclLogLevel] ?? {
    label: `LV${message.level}`,
    klass: 'badge-ghost',
  }
  const log: RosoutLog = {
    id: `${message.stamp.sec}-${nanosec}-${message.name}-${crypto.randomUUID()}`,
    timestamp: new Date(timestampMs),
    level: message.level,
    levelLabel: severity.label,
    levelClass: severity.klass,
    name: message.name,
    message: message.msg,
    file: message.file,
    function: message.function,
    line: message.line,
  }

  useRosoutStore.setState((state) => {
    const logs = [...state.logs, log]
    return {
      logs: logs.length > MAX_ROSOUT_LOGS ? logs.slice(-MAX_ROSOUT_LOGS) : logs,
    }
  })
}

const syncRosoutSubscription = () => {
  disposeRosoutSubscription?.()
  disposeRosoutSubscription = null

  const { session, connectionState } = useRosStore.getState()
  if (!session || connectionState !== 'connected') return

  disposeRosoutSubscription = session.subscribe<RclLog>(
    {
      name: ROSOUT_TOPIC,
      messageType: ROSOUT_MESSAGE_TYPE,
    },
    handleRosoutMessage,
  )
}

export const initializeRosoutStore = () => {
  const initialRosState = useRosStore.getState()
  syncRosoutSubscription()
  if (initialRosState.connectionState === 'disconnected') {
    useRosoutStore.getState().reset()
  }

  const unsubscribe = useRosStore.subscribe((state, previousState) => {
    if (
      state.session !== previousState.session ||
      state.connectionState !== previousState.connectionState
    ) {
      syncRosoutSubscription()
    }
    if (
      state.connectionState !== previousState.connectionState &&
      state.connectionState === 'disconnected'
    ) {
      useRosoutStore.getState().reset()
    }
  })

  return () => {
    unsubscribe()
    disposeRosoutSubscription?.()
    disposeRosoutSubscription = null
    useRosoutStore.getState().reset()
  }
}

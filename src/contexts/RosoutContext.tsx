import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Topic } from 'roslib'
import { RosContext } from '@/contexts/RosContext'
import type { RclLog, RclLogLevel } from '@/msgs/RclInterfacesMsgs'
import {
  RCL_LOG_LEVEL_DEBUG,
  RCL_LOG_LEVEL_ERROR,
  RCL_LOG_LEVEL_FATAL,
  RCL_LOG_LEVEL_INFO,
  RCL_LOG_LEVEL_WARN,
} from '@/msgs/RclInterfacesMsgs'

export type RosoutLog = {
  id: string
  timestamp: string
  rawTimestamp: number
  level: number
  levelLabel: string
  levelClass: string
  name: string
  message: string
  file?: string
  function?: string
  line?: number
}

type RosoutContextValue = {
  logs: RosoutLog[]
  reset: () => void
}

const RosoutContext = createContext<RosoutContextValue | null>(null)

const ROSOUT_TOPIC = '/rosout'
const ROSOUT_MESSAGE_TYPE = 'rcl_interfaces/msg/Log'
const MAX_ROSOUT_LOGS = 200

const levelMap: Record<
  RclLogLevel,
  {
    label: string
    klass: string
  }
> = {
  [RCL_LOG_LEVEL_DEBUG]: { label: 'DEBUG', klass: 'badge-info' },
  [RCL_LOG_LEVEL_INFO]: { label: 'INFO', klass: 'badge-info' },
  [RCL_LOG_LEVEL_WARN]: { label: 'WARN', klass: 'badge-warning' },
  [RCL_LOG_LEVEL_ERROR]: { label: 'ERROR', klass: 'badge-error' },
  [RCL_LOG_LEVEL_FATAL]: { label: 'FATAL', klass: 'badge-error' },
}

const RosoutProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useContext(RosContext)
  const [logs, setLogs] = useState<RosoutLog[]>([])

  const reset = useCallback(() => setLogs([]), [])

  useEffect(() => {
    if (connectionState === 'disconnected') {
      reset()
    }
  }, [connectionState, reset])

  useEffect(() => {
    if (!ros) return

    const topic = new Topic({
      ros,
      name: ROSOUT_TOPIC,
      messageType: ROSOUT_MESSAGE_TYPE,
    })

    const handleMessage = (message: unknown) => {
      const rosoutMessage = message as RclLog
      const stamp = rosoutMessage.stamp
      const nanosec = stamp.nanosec ?? 0
      const timestampMs =
        (stamp.sec ?? 0) * 1000 + Math.floor(nanosec / 1e6) || Date.now()
      const timestamp = new Date(timestampMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      const severity = levelMap[rosoutMessage.level as RclLogLevel] ?? {
        label: `LV${rosoutMessage.level}`,
        klass: 'badge-ghost',
      }

      setLogs((prev) => {
        const logEntry: RosoutLog = {
          id: `${stamp.sec}-${nanosec}-${rosoutMessage.name}-${Math.random()}`,
          timestamp,
          rawTimestamp: timestampMs,
          level: rosoutMessage.level,
          levelLabel: severity.label,
          levelClass: severity.klass,
          name: rosoutMessage.name,
          message: rosoutMessage.msg,
          file: rosoutMessage.file,
          function: rosoutMessage.function,
          line: rosoutMessage.line,
        }

        const next = [...prev, logEntry]
        return next.length > MAX_ROSOUT_LOGS
          ? next.slice(-MAX_ROSOUT_LOGS)
          : next
      })
    }

    topic.subscribe(handleMessage)

    return () => {
      topic.unsubscribe()
    }
  }, [ros])

  const value = useMemo(
    () => ({
      logs,
      reset,
    }),
    [logs, reset],
  )

  return (
    <RosoutContext.Provider value={value}>{children}</RosoutContext.Provider>
  )
}

export { RosoutContext, RosoutProvider }

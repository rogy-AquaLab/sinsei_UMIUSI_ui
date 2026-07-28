import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Topic } from 'roslib'
import { useLoop } from '@/hooks/useLoop'
import { useRos } from '@/hooks/useRos'
import type { HealthCheckResult } from '@/msgs/OriginalMsgs'

export type HealthStatus = 'unknown' | 'ok' | 'error' | 'stale'

export type HealthReading = {
  isOk: boolean
  receivedAt: number
}

type HealthContextValue = {
  lowPower: HealthReading | null
  highPower: HealthReading | null
  lowPowerStatus: HealthStatus
  highPowerStatus: HealthStatus
  overallStatus: HealthStatus
}

const HealthContext = createContext<HealthContextValue | null>(null)

const HEALTH_TIMEOUT_MS = 2_000

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
  statuses: [HealthStatus, HealthStatus],
): HealthStatus => {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('stale')) return 'stale'
  if (statuses.includes('unknown')) return 'unknown'
  return 'ok'
}

const HealthProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useRos()
  const [lowPower, setLowPower] = useState<HealthReading | null>(null)
  const [highPower, setHighPower] = useState<HealthReading | null>(null)
  const [now, setNow] = useState(Date.now())

  const updateNow = useCallback(() => setNow(Date.now()), [])
  useLoop({ callback: updateNow, frequency: 1 })

  useEffect(() => {
    if (connectionState === 'connected') return
    setLowPower(null)
    setHighPower(null)
  }, [connectionState])

  useEffect(() => {
    if (!ros) return

    const lowPowerTopic = new Topic({
      ros,
      name: '/low_power_health_check_result',
      messageType: 'sinsei_umiusi_msgs/msg/HealthCheckResult',
    })
    const highPowerTopic = new Topic({
      ros,
      name: '/high_power_health_check_result',
      messageType: 'sinsei_umiusi_msgs/msg/HealthCheckResult',
    })

    const handleLowPower = (message: unknown) => {
      const result = message as HealthCheckResult
      setLowPower({ isOk: result.is_ok, receivedAt: Date.now() })
    }
    const handleHighPower = (message: unknown) => {
      const result = message as HealthCheckResult
      setHighPower({ isOk: result.is_ok, receivedAt: Date.now() })
    }

    lowPowerTopic.subscribe(handleLowPower)
    highPowerTopic.subscribe(handleHighPower)

    return () => {
      lowPowerTopic.unsubscribe()
      highPowerTopic.unsubscribe()
    }
  }, [ros])

  const connected = connectionState === 'connected'
  const lowPowerStatus = resolveStatus(lowPower, now, connected)
  const highPowerStatus = resolveStatus(highPower, now, connected)
  const overallStatus = resolveOverallStatus([lowPowerStatus, highPowerStatus])

  const value = useMemo(
    () => ({
      lowPower,
      highPower,
      lowPowerStatus,
      highPowerStatus,
      overallStatus,
    }),
    [lowPower, highPower, lowPowerStatus, highPowerStatus, overallStatus],
  )

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  )
}

export { HealthContext, HealthProvider }

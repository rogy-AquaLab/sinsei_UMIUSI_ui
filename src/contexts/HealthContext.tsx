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
import type {
  HealthCheckResult,
  HighPowerCircuitInfo,
  LowPowerCircuitInfo,
} from '@/msgs/OriginalMsgs'

export type HealthStatus = 'unknown' | 'ok' | 'error' | 'stale'

export type HealthReading = {
  isOk: boolean
  receivedAt: number
}

export type CircuitInfoReading<T> = {
  value: T
  receivedAt: number
}

type HealthContextValue = {
  lowPower: HealthReading | null
  highPower: HealthReading | null
  lowPowerInfo: CircuitInfoReading<LowPowerCircuitInfo> | null
  highPowerInfo: CircuitInfoReading<HighPowerCircuitInfo> | null
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
  const [lowPowerInfo, setLowPowerInfo] =
    useState<CircuitInfoReading<LowPowerCircuitInfo> | null>(null)
  const [highPowerInfo, setHighPowerInfo] =
    useState<CircuitInfoReading<HighPowerCircuitInfo> | null>(null)
  const [now, setNow] = useState(Date.now())

  const updateNow = useCallback(() => setNow(Date.now()), [])
  useLoop({ callback: updateNow, frequency: 1 })

  useEffect(() => {
    if (connectionState === 'connected') return
    setLowPower(null)
    setHighPower(null)
    setLowPowerInfo(null)
    setHighPowerInfo(null)
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
    const lowPowerInfoTopic = new Topic({
      ros,
      name: '/state/low_power_circuit_info',
      messageType: 'sinsei_umiusi_msgs/msg/LowPowerCircuitInfo',
    })
    const highPowerInfoTopic = new Topic({
      ros,
      name: '/state/high_power_circuit_info',
      messageType: 'sinsei_umiusi_msgs/msg/HighPowerCircuitInfo',
    })

    const handleLowPower = (message: unknown) => {
      const result = message as HealthCheckResult
      setLowPower({ isOk: result.is_ok, receivedAt: Date.now() })
    }
    const handleHighPower = (message: unknown) => {
      const result = message as HealthCheckResult
      setHighPower({ isOk: result.is_ok, receivedAt: Date.now() })
    }
    const handleLowPowerInfo = (message: unknown) => {
      setLowPowerInfo({
        value: message as LowPowerCircuitInfo,
        receivedAt: Date.now(),
      })
    }
    const handleHighPowerInfo = (message: unknown) => {
      setHighPowerInfo({
        value: message as HighPowerCircuitInfo,
        receivedAt: Date.now(),
      })
    }

    lowPowerTopic.subscribe(handleLowPower)
    highPowerTopic.subscribe(handleHighPower)
    lowPowerInfoTopic.subscribe(handleLowPowerInfo)
    highPowerInfoTopic.subscribe(handleHighPowerInfo)

    return () => {
      lowPowerTopic.unsubscribe()
      highPowerTopic.unsubscribe()
      lowPowerInfoTopic.unsubscribe()
      highPowerInfoTopic.unsubscribe()
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
      lowPowerInfo,
      highPowerInfo,
      lowPowerStatus,
      highPowerStatus,
      overallStatus,
    }),
    [
      lowPower,
      highPower,
      lowPowerInfo,
      highPowerInfo,
      lowPowerStatus,
      highPowerStatus,
      overallStatus,
    ],
  )

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  )
}

export { HealthContext, HealthProvider }

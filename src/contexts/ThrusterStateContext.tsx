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
import type { ThrusterStateAll } from '@/msgs/OriginalMsgs'

export type ThrusterTelemetryStatus = 'unknown' | 'fresh' | 'stale'

type ThrusterStateContextValue = {
  thrusters: ThrusterStateAll | null
  receivedAt: number | null
  telemetryStatus: ThrusterTelemetryStatus
}

const ThrusterStateContext = createContext<ThrusterStateContextValue | null>(
  null,
)

const THRUSTER_TIMEOUT_MS = 2_000

const ThrusterStateProvider = ({ children }: PropsWithChildren) => {
  const { ros, connectionState } = useRos()
  const [thrusters, setThrusters] = useState<ThrusterStateAll | null>(null)
  const [receivedAt, setReceivedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  const updateNow = useCallback(() => setNow(Date.now()), [])
  useLoop({ callback: updateNow, frequency: 1 })

  useEffect(() => {
    if (connectionState === 'connected') return
    setThrusters(null)
    setReceivedAt(null)
  }, [connectionState])

  useEffect(() => {
    if (!ros) return

    const topic = new Topic({
      ros,
      name: '/state/thruster_state_all',
      messageType: 'sinsei_umiusi_msgs/msg/ThrusterStateAll',
    })

    const handleMessage = (message: unknown) => {
      setThrusters(message as ThrusterStateAll)
      setReceivedAt(Date.now())
    }

    topic.subscribe(handleMessage)
    return () => topic.unsubscribe()
  }, [ros])

  let telemetryStatus: ThrusterTelemetryStatus = 'unknown'
  if (connectionState === 'connected' && thrusters && receivedAt !== null) {
    telemetryStatus = now - receivedAt > THRUSTER_TIMEOUT_MS ? 'stale' : 'fresh'
  }

  const value = useMemo(
    () => ({
      thrusters,
      receivedAt,
      telemetryStatus,
    }),
    [thrusters, receivedAt, telemetryStatus],
  )

  return (
    <ThrusterStateContext.Provider value={value}>
      {children}
    </ThrusterStateContext.Provider>
  )
}

export { ThrusterStateContext, ThrusterStateProvider }

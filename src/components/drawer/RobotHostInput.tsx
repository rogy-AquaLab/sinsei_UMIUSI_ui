import { useEffect, useState } from 'react'
import { useConnectionConfigStore } from '@/stores/connectionConfigStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

const RobotHostInput = () => {
  const robotHost = useConnectionConfigStore((state) => state.robotHost)
  const updateRobotHost = useConnectionConfigStore(
    (state) => state.updateRobotHost,
  )
  const connectionState = useRosStore((state) => state.connectionState)
  const notify = useNotificationStore((state) => state.notify)
  const [draft, setDraft] = useState(robotHost)

  useEffect(() => setDraft(robotHost), [robotHost])

  const applyHost = () => {
    if (draft === robotHost) return

    try {
      const url = new URL(`http://${draft.trim()}`)
      if (
        url.username ||
        url.password ||
        url.port ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        throw new Error('Enter a hostname or IP address without a port.')
      }

      updateRobotHost(url.host)
      notify('Robot host updated.', 'success')
    } catch (error) {
      setDraft(robotHost)
      notify(
        error instanceof Error ? error.message : 'Invalid robot host.',
        'error',
      )
    }
  }

  return (
    <input
      id="robot-host"
      type="text"
      className="input w-full"
      required
      placeholder="e.g. umiusi2.local, localhost, 192.168.1.100"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={applyHost}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(robotHost)
          event.currentTarget.blur()
        }
      }}
      disabled={connectionState !== 'disconnected'}
    />
  )
}

export default RobotHostInput

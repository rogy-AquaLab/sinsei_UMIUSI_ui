import { useEffect, useState } from 'react'
import { useConnectionConfigStore } from '@/stores/connectionConfigStore'
import { useRosStore } from '@/stores/rosStore'

const RobotHostInput = () => {
  const robotHost = useConnectionConfigStore((state) => state.robotHost)
  const updateRobotHost = useConnectionConfigStore(
    (state) => state.updateRobotHost,
  )
  const connectionState = useRosStore((state) => state.connectionState)
  const [draft, setDraft] = useState(robotHost)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setDraft(robotHost)
    setErrorMessage('')
  }, [robotHost])

  const applyHost = () => {
    if (draft === robotHost) {
      setErrorMessage('')
      return
    }

    const result = updateRobotHost(draft)
    if (!result.success) {
      setErrorMessage(result.errorMessage)
      return
    }

    setDraft(result.robotHost)
    setErrorMessage('')
  }

  return (
    <>
      <input
        id="robot-host"
        type="text"
        className={`input w-full ${errorMessage ? 'input-error' : ''}`}
        required
        placeholder="e.g. umiusi2.local, localhost, 192.168.1.100"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          setErrorMessage('')
        }}
        onBlur={applyHost}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(robotHost)
            setErrorMessage('')
            event.currentTarget.blur()
          }
        }}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? 'robot-host-error' : undefined}
        disabled={connectionState !== 'disconnected'}
      />
      {errorMessage && (
        <p id="robot-host-error" className="text-xs text-error">
          {errorMessage}
        </p>
      )}
    </>
  )
}

export default RobotHostInput

import { useContext } from 'react'
import { RosContext } from '../contexts/RosContext'

const RosConnectionStatus = () => {
  const { connectionState } = useContext(RosContext)

  const isLoading =
    connectionState === 'connecting' ||
    connectionState === 'disconnecting' ||
    connectionState === 'cancel_connecting'

  let label: string, badgeTone: string, statusTone: string
  switch (connectionState) {
    case 'connected':
      label = 'Connected'
      badgeTone = 'badge-success'
      statusTone = 'status-success'
      break
    case 'disconnecting':
      label = 'Disconnecting...'
      badgeTone = 'badge-warning'
      statusTone = 'status-warning'
      break
    case 'connecting':
      label = 'Connecting...'
      badgeTone = 'badge-warning'
      statusTone = 'status-warning'
      break
    case 'disconnected':
      label = 'Disconnected'
      badgeTone = 'badge-error'
      statusTone = 'status-error'
      break
    case 'cancel_connecting':
      label = 'Cancelling...'
      badgeTone = 'badge-warning'
      statusTone = 'status-warning'
      break
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`badge badge-soft ${badgeTone}`}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <div className={`status ${statusTone}`}></div>
      )}
      {label}
    </div>
  )
}

export default RosConnectionStatus

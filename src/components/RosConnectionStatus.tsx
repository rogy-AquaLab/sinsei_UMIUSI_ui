import { useContext } from 'react'
import { FaCircle } from 'react-icons/fa'
import { RosContext } from '../providers/RosProvider'

const RosConnectionStatus = () => {
  const { connectionState } = useContext(RosContext)

  const isLoading =
    connectionState === 'connecting' ||
    connectionState === 'disconnecting' ||
    connectionState === 'cancel_connecting'

  let label: string, tone: string
  switch (connectionState) {
    case 'connected':
      label = 'Connected'
      tone = 'badge-success'
      break
    case 'disconnecting':
      label = 'Disconnecting...'
      tone = 'badge-warning'
      break
    case 'connecting':
      label = 'Connecting...'
      tone = 'badge-warning'
      break
    case 'disconnected':
      label = 'Disconnected'
      tone = 'badge-error'
      break
    case 'cancel_connecting':
      label = 'Cancelling...'
      tone = 'badge-warning'
      break
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`badge badge-soft ${tone}`}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <FaCircle />
      )}
      {label}
    </div>
  )
}

export default RosConnectionStatus

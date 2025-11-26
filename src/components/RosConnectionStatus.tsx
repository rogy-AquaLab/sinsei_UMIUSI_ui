import { useContext } from 'react'
import { FaCircle } from 'react-icons/fa'
import { RosContext } from '../RosProvider'

const RosConnectionStatus = () => {
  const { connectionState } = useContext(RosContext)

  let label: string, tone: string
  switch (connectionState) {
    case 'connected':
      label = 'Connected'
      tone = 'badge-success'
      break
    case 'connecting':
      label = 'Connecting...'
      tone = 'badge-warning'
      break
    case 'disconnected':
      label = 'Disconnected'
      tone = 'badge-error'
      break
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`badge badge-soft ${tone}`}
    >
      {connectionState == 'connecting' ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <FaCircle />
      )}
      {label}
    </div>
  )
}

export default RosConnectionStatus

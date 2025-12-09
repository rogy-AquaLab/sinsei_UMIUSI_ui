import { useContext } from 'react'
import { FaPlug } from 'react-icons/fa'
import { RosContext } from '@/contexts/RosContext'

const RosConnectButton = () => {
  const { connectionState, connect, disconnect } = useContext(RosContext)

  let handleClick: (() => void) | undefined
  let label: string, tone: string
  switch (connectionState) {
    case 'disconnected':
      handleClick = connect
      label = 'Connect to rosbridge'
      tone = 'text-primary'
      break
    case 'connecting':
      handleClick = disconnect
      label = 'Cancel connecting'
      tone = 'text-warning'
      break
    case 'disconnecting':
      handleClick = undefined
      label = 'Disconnecting...'
      tone = 'text-muted'
      break
    case 'cancel_connecting':
      handleClick = undefined
      label = 'Cancelling...'
      tone = 'text-muted'
      break
    case 'connected':
      handleClick = disconnect
      label = 'Disconnect from rosbridge'
      tone = 'text-error'
      break
  }

  return (
    <button
      className={`is-drawer-close:tooltip is-drawer-close:tooltip-left ${tone}`}
      data-tip={label}
      onClick={handleClick}
    >
      <FaPlug className="my-1.5 inline-block size-4" />
      <span className="is-drawer-close:hidden">{label}</span>
    </button>
  )
}

export default RosConnectButton

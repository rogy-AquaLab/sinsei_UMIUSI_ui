import { useContext } from 'react'
import { RosContext } from '../providers/RosProvider'

const RosConnectButton = () => {
  const { connectionState, connect, disconnect } = useContext(RosContext)

  let handleClick: (() => void) | undefined
  let label: string, tone: string
  switch (connectionState) {
    case 'disconnected':
      handleClick = connect
      label = 'Connect'
      tone = 'text-primary'
      break
    case 'connecting':
      handleClick = disconnect
      label = 'Cancel'
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
      label = 'Disconnect'
      tone = 'text-error'
      break
  }

  return (
    <a className={tone} onClick={handleClick}>
      {label}
    </a>
  )
}

export default RosConnectButton

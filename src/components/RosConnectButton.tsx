import { useContext } from 'react'
import { RosContext } from '../RosProvider'

const RosConnectButton = () => {
  const { connectionState, connect, disconnect } = useContext(RosContext)

  let handleClick: () => void, label: string, tone: string
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

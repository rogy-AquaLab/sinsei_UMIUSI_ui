import { useContext } from 'react'
import { RosContext } from '../RosProvider'

const ConnectButton = () => {
  const { connectionState, connect, disconnect } = useContext(RosContext)

  let handleClick: () => void, label: string, tone: string
  switch (connectionState) {
    case 'disconnected':
      handleClick = connect
      label = 'Connect'
      tone = 'btn-primary'
      break
    case 'connecting':
      handleClick = disconnect
      label = 'Cancel'
      tone = 'btn-warning'
      break
    case 'connected':
      handleClick = disconnect
      label = 'Disconnect'
      tone = 'btn-error'
      break
  }

  return (
    <button className={`btn ${tone}`} onClick={handleClick}>
      {label}
    </button>
  )
}

export default ConnectButton

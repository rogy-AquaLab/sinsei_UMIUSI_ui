import {
  createContext,
  useState,
  useEffect,
  useRef,
  type PropsWithChildren,
} from 'react'
import { Ros } from 'roslib'

const RosContext = createContext<Ros | null>(null)

const RosProvider = ({ children, url }: PropsWithChildren<{ url: string }>) => {
  const rosRef = useRef<Ros | null>(null)
  const [connected, setConnected] = useState<boolean>(false)

  useEffect(() => {
    if (rosRef.current) {
      console.log('ROS connection already exists.')
      return
    }

    console.log('Connecting to ROS bridge server at:', url)

    const ros = new Ros({ url })
    rosRef.current = ros

    ros.on('connection', () => {
      setConnected(true)
      console.log('Connected to ROS bridge server.')
    })
    ros.on('error', function (error) {
      console.log('Error connecting to ROSBridge WebSocket server: ', error)
    })
    ros.on('close', function () {
      setConnected(false)
      console.log('Connection to ROSBridge WebSocket server closed.')
    })

    return () => {
      if (!(rosRef.current && rosRef.current.isConnected)) return
      console.log('Cleaning up ROS connection...')
      ros.close()
      rosRef.current = null
    }
  }, [url])

  return (
    <RosContext value={rosRef.current}>
      {/* 以下のh2タグは仮の表示 */}
      <h2>{connected ? 'ROS Connected' : 'Connecting to ROS...'}</h2>
      {children}
    </RosContext>
  )
}

export default RosProvider
export { RosContext }

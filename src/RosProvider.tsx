import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type PropsWithChildren,
} from 'react'
import { Ros } from 'roslib'

type RosConnectionState = 'disconnected' | 'connecting' | 'connected'

type RosContextValue = {
  ros: Ros | null
  connectionState: RosConnectionState
  connect: () => void
  disconnect: () => void
}

const RosContext = createContext<RosContextValue>({
  ros: null,
  connectionState: 'disconnected',
  connect: () => {},
  disconnect: () => {},
})

/**
 * Props for RosProvider component
 */
type RosProviderProps = PropsWithChildren<{
  /**
   * rosbridgeのWebSocket URL
   */
  url: string
}>

/**
 * rosbridgeとの接続を管理するプロバイダーコンポーネント
 */
const RosProvider = ({ children, url }: RosProviderProps) => {
  const rosRef = useRef<Ros | null>(null)
  const [connectionState, setConnectionState] =
    useState<RosConnectionState>('disconnected')

  // あとでoffにする際指定できるよう保持しておく
  const handlersRef = useRef<{
    handleConnection: () => void
    handleClose: () => void
    handleError: (error: Event) => void
  } | null>(null)

  const detachHandlers = useCallback(() => {
    const ros = rosRef.current
    const handlers = handlersRef.current
    if (!ros || !handlers) return

    ros.off('connection', handlers.handleConnection)
    ros.off('close', handlers.handleClose)
    ros.off('error', handlers.handleError)
    handlersRef.current = null
  }, [])

  const connect = useCallback(() => {
    if (connectionState !== 'disconnected') {
      console.log('Already connected or connecting; skipping.')
      return
    }

    console.log('Connecting to ROS bridge server at:', url)
    setConnectionState('connecting')

    const ros = new Ros({ url })
    rosRef.current = ros

    const handleConnection = () => {
      setConnectionState('connected')
      console.log('Connected to ROS bridge server.')
    }

    const handleClose = () => {
      setConnectionState('disconnected')
      detachHandlers()
      rosRef.current = null
      console.log('Connection to ROS bridge server closed.')
    }

    const handleError = (error: Event) => {
      setConnectionState('disconnected')
      detachHandlers()
      rosRef.current = null
      console.error('Error connecting to ROSBridge WebSocket server: ', error)
    }

    handlersRef.current = { handleConnection, handleClose, handleError }

    ros.on('connection', handleConnection)
    ros.on('close', handleClose)
    ros.on('error', handleError)
  }, [connectionState, detachHandlers, url])

  const disconnect = useCallback(() => {
    if (!rosRef.current) {
      setConnectionState('disconnected')
      return
    }

    detachHandlers()
    rosRef.current.close()
    rosRef.current = null
    setConnectionState('disconnected')
    console.log('Disconnected from ROS bridge server.')
  }, [detachHandlers])

  // コンポーネントのアンマウント時に念のためdisconnectする
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const contextValue = useMemo(
    () => ({
      ros: rosRef.current,
      connectionState,
      connect,
      disconnect,
    }),
    [connectionState, connect, disconnect],
  )

  return <RosContext value={contextValue}>{children}</RosContext>
}

export default RosProvider
export { RosContext }

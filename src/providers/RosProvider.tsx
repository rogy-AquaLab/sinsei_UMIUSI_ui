import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type PropsWithChildren,
  useContext,
} from 'react'
import * as ROSLIB from 'roslib'
import { ToastContext } from './ToastProvider'

type RosConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'cancel_connecting'
  | 'disconnecting'
  | 'connected'

type RosContextValue = {
  ros: ROSLIB.Ros | null
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
  const rosRef = useRef<ROSLIB.Ros | null>(null)
  const [connectionState, setConnectionState] =
    useState<RosConnectionState>('disconnected')
  // コールバック関数内で最新のconnectionStateを参照できるようにするためのref
  const connectionStateRef = useRef<RosConnectionState>(connectionState)
  connectionStateRef.current = connectionState

  const toast = useContext(ToastContext)

  // あとでoffにする際指定できるようコールバック関数を保持しておく
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

    console.log('Connecting to rosbridge server at:', url)
    setConnectionState('connecting')

    const ros = new ROSLIB.Ros({ url })
    rosRef.current = ros

    const handleConnection = () => {
      setConnectionState('connected')
      console.log('Connected to rosbridge server.')
      toast?.show('Connected to rosbridge server.', 'success')
    }

    const handleClose = () => {
      if (connectionStateRef.current === 'connecting') return

      switch (connectionStateRef.current) {
        case 'disconnecting':
          console.log('Disconnected from rosbridge server.')
          toast?.show('Disconnected from rosbridge server.', 'success')
          break
        case 'cancel_connecting':
          console.log('Connection attempt to rosbridge server canceled.')
          toast?.show(
            'Connection attempt to rosbridge server canceled.',
            'info',
          )
          break
        case 'connected':
          console.log('Connection to rosbridge server lost.')
          toast?.show('Connection to rosbridge server lost.', 'error')
          break
        default:
          break
      }

      setConnectionState('disconnected')
      detachHandlers()
      rosRef.current = null
    }

    const handleError = () => {
      // 接続解除後に遅れて発生したエラーや意図的なキャンセル時のエラーは無視
      if (
        connectionStateRef.current === 'disconnected' ||
        connectionStateRef.current === 'cancel_connecting'
      )
        return

      console.log('Failed to connect to rosbridge server.')
      toast?.show('Failed to connect to rosbridge server.', 'error')

      setConnectionState('disconnected')
      detachHandlers()
      rosRef.current = null
    }

    handlersRef.current = { handleConnection, handleClose, handleError }

    ros.on('connection', handleConnection)
    ros.on('close', handleClose)
    ros.on('error', handleError)
  }, [connectionState, detachHandlers, url, toast])

  const disconnect = useCallback(() => {
    if (!rosRef.current) {
      setConnectionState('disconnected')
      return
    }

    console.log('Disconnecting from rosbridge server.')
    if (connectionStateRef.current === 'connected') {
      setConnectionState('disconnecting')
    } else if (connectionStateRef.current === 'connecting') {
      setConnectionState('cancel_connecting')
    }

    rosRef.current.close()
    rosRef.current = null
    detachHandlers()
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

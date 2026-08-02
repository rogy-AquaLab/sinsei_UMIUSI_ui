import { Ros } from 'roslib'
import { create } from 'zustand'
import { useNotificationStore } from '@/stores/notificationStore'

export type RosConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'cancel_connecting'
  | 'disconnecting'
  | 'connected'

type RosStore = {
  ros: Ros | null
  connectionState: RosConnectionState
  /**
   * rosbridgeのWebSocket URL
   */
  url: string
  setUrl: (url: string) => void
  connect: () => void
  disconnect: () => void
}

type RosHandlers = {
  ros: Ros
  handleConnection: () => void
  handleClose: () => void
  handleError: () => void
}

// あとでoffにする際指定できるようコールバック関数を保持しておく
let activeHandlers: RosHandlers | null = null

const detachHandlers = (handlers: RosHandlers | null) => {
  if (!handlers) return
  handlers.ros.off('connection', handlers.handleConnection)
  handlers.ros.off('close', handlers.handleClose)
  handlers.ros.off('error', handlers.handleError)
  if (activeHandlers === handlers) activeHandlers = null
}

/**
 * rosbridgeとの接続を管理するストア
 */
export const useRosStore = create<RosStore>((set, get) => ({
  ros: null,
  connectionState: 'disconnected',
  url: 'ws://localhost:9090',

  setUrl: (url) => {
    if (get().connectionState !== 'disconnected') return
    set({ url })
  },

  connect: () => {
    const { connectionState, url } = get()
    if (connectionState !== 'disconnected') {
      console.log('Already connected or connecting; skipping.')
      return
    }

    console.log('Connecting to rosbridge server at:', url)
    const ros = new Ros({ url })
    set({ ros, connectionState: 'connecting' })

    const handleConnection = () => {
      // コールバック関数内ではget()で最新のconnectionStateを参照する
      const current = get()
      if (current.ros !== ros || current.connectionState !== 'connecting')
        return

      set({ connectionState: 'connected' })
      console.log('Connected to rosbridge server.')
      useNotificationStore
        .getState()
        .notify('Connected to rosbridge server.', 'success')
    }

    const handleClose = () => {
      const current = get()
      if (current.ros !== ros) {
        detachHandlers(handlers)
        return
      }

      switch (current.connectionState) {
        case 'disconnecting':
          console.log('Disconnected from rosbridge server.')
          useNotificationStore
            .getState()
            .notify('Disconnected from rosbridge server.', 'success')
          break
        case 'cancel_connecting':
          console.log('Connection attempt to rosbridge server canceled.')
          useNotificationStore
            .getState()
            .notify('Connection attempt to rosbridge server canceled.', 'info')
          break
        case 'connecting':
          console.log('Failed to connect to rosbridge server.')
          useNotificationStore
            .getState()
            .notify('Failed to connect to rosbridge server.', 'error')
          break
        case 'connected':
          console.log('Connection to rosbridge server lost.')
          useNotificationStore
            .getState()
            .notify('Connection to rosbridge server lost.', 'error')
          break
        default:
          break
      }

      detachHandlers(handlers)
      set({ ros: null, connectionState: 'disconnected' })
    }

    const handleError = () => {
      const current = get()
      // 接続解除後に遅れて発生したエラーや意図的なキャンセル時のエラーは無視
      if (
        current.ros !== ros ||
        current.connectionState === 'disconnected' ||
        current.connectionState === 'cancel_connecting'
      ) {
        return
      }

      console.log('Failed to connect to rosbridge server.')
      useNotificationStore
        .getState()
        .notify('Failed to connect to rosbridge server.', 'error')

      detachHandlers(handlers)
      set({ ros: null, connectionState: 'disconnected' })
      ros.close()
    }

    const handlers: RosHandlers = {
      ros,
      handleConnection,
      handleClose,
      handleError,
    }
    activeHandlers = handlers
    ros.on('connection', handleConnection)
    ros.on('close', handleClose)
    ros.on('error', handleError)
  },

  disconnect: () => {
    const { ros, connectionState } = get()
    if (!ros) {
      set({ connectionState: 'disconnected' })
      return
    }

    if (connectionState === 'connected') {
      console.log('Disconnecting from rosbridge server.')
      set({ connectionState: 'disconnecting' })
    } else if (connectionState === 'connecting') {
      set({ connectionState: 'cancel_connecting' })
    } else {
      return
    }

    ros.close()
  },
}))

const disposeRosStore = () => {
  // コンポーネントのアンマウント時に念のためdisconnectする
  const ros = useRosStore.getState().ros
  detachHandlers(activeHandlers)
  if (ros) ros.close()
  useRosStore.setState({ ros: null, connectionState: 'disconnected' })
}

export const initializeRosStore = () => disposeRosStore

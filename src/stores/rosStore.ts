import { create } from 'zustand'
import { createRosSession, type RosSession } from '@/services/rosSession'
import { useNotificationStore } from '@/stores/notificationStore'

export type RosConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'cancel_connecting'
  | 'disconnecting'
  | 'connected'

type RosStore = {
  session: RosSession | null
  connectionState: RosConnectionState
  /**
   * rosbridgeのWebSocket URL
   */
  url: string
  setUrl: (url: string) => void
  connect: () => void
  disconnect: () => void
}

export const useRosStore = create<RosStore>((set, get) => ({
  session: null,
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
    let session: RosSession
    session = createRosSession(url, {
      onConnection: () => {
        const current = get()
        if (
          current.session !== session ||
          current.connectionState !== 'connecting'
        ) {
          return
        }

        set({ connectionState: 'connected' })
        console.log('Connected to rosbridge server.')
        useNotificationStore
          .getState()
          .notify('Connected to rosbridge server.', 'success')
      },
      onClose: () => {
        const current = get()
        if (current.session !== session) return

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
              .notify(
                'Connection attempt to rosbridge server canceled.',
                'info',
              )
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

        set({ session: null, connectionState: 'disconnected' })
      },
      onError: () => {
        const current = get()
        // 接続解除後に遅れて発生したエラーや意図的なキャンセル時のエラーは無視
        if (
          current.session !== session ||
          current.connectionState === 'disconnected' ||
          current.connectionState === 'cancel_connecting'
        ) {
          return
        }

        console.log('Failed to connect to rosbridge server.')
        useNotificationStore
          .getState()
          .notify('Failed to connect to rosbridge server.', 'error')
        set({ session: null, connectionState: 'disconnected' })
      },
    })

    set({ session, connectionState: 'connecting' })
    session.connect()
  },

  disconnect: () => {
    const { session, connectionState } = get()
    if (!session) {
      set({ session: null, connectionState: 'disconnected' })
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

    session.close()
  },
}))

const disposeRosStore = () => {
  // コンポーネントのアンマウント時に念のためdisconnectする
  const session = useRosStore.getState().session
  useRosStore.setState({ session: null, connectionState: 'disconnected' })
  session?.close()
}

export const initializeRosStore = () => disposeRosStore

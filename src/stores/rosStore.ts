import { create } from 'zustand'
import { createRosSession, type RosSession } from '@/services/rosSession'
import { useConnectionConfigStore } from '@/stores/connectionConfigStore'
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
  connect: () => void
  disconnect: () => void
}

// 切れたら自動でつなぎ直す（水中では無線が切れる。Auto の間も機体は動き続けるので、上がってきたら戻れるように）。
// 手で切断したときはつなぎ直さない
const RECONNECT_DELAYS_MS = [1000, 2000, 5000]
let wantConnected = false
let reconnectAttempt = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

const clearReconnect = () => {
  if (reconnectTimer !== null) clearTimeout(reconnectTimer)
  reconnectTimer = null
}

const scheduleReconnect = (connect: () => void) => {
  if (!wantConnected || reconnectTimer !== null) return
  const delay =
    RECONNECT_DELAYS_MS[
      Math.min(reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)
    ]
  reconnectAttempt += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, delay)
}

export const useRosStore = create<RosStore>((set, get) => ({
  session: null,
  connectionState: 'disconnected',

  connect: () => {
    wantConnected = true
    clearReconnect()
    const { connectionState } = get()
    if (connectionState !== 'disconnected') {
      console.log('Already connected or connecting; skipping.')
      return
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${useConnectionConfigStore.getState().robotHost}:9090`
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
        reconnectAttempt = 0
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
            // つなぎ直しの失敗は毎回は知らせない（届かない間ずっと出続けるため）
            if (reconnectAttempt === 0) {
              useNotificationStore
                .getState()
                .notify('Failed to connect to rosbridge server.', 'error')
            }
            break
          case 'connected':
            console.log('Connection to rosbridge server lost.')
            useNotificationStore
              .getState()
              .notify(
                'Connection to rosbridge server lost. Reconnecting...',
                'error',
              )
            break
          default:
            break
        }

        set({ session: null, connectionState: 'disconnected' })
        scheduleReconnect(get().connect)
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
        if (reconnectAttempt === 0) {
          useNotificationStore
            .getState()
            .notify('Failed to connect to rosbridge server.', 'error')
        }
        set({ session: null, connectionState: 'disconnected' })
        scheduleReconnect(get().connect)
      },
    })

    set({ session, connectionState: 'connecting' })
    session.connect()
  },

  disconnect: () => {
    wantConnected = false
    reconnectAttempt = 0
    clearReconnect()
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
  wantConnected = false
  clearReconnect()
  // コンポーネントのアンマウント時に念のためdisconnectする
  const session = useRosStore.getState().session
  useRosStore.setState({ session: null, connectionState: 'disconnected' })
  session?.close()
}

export const initializeRosStore = () => {
  // 初回に一度だけ自動接続する
  useRosStore.getState().connect()
  return disposeRosStore
}

import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export type Notification = {
  id: string
  message: string
  type: NotificationType
  timestamp: string
}

type NotificationStore = {
  /**
   * 右下にToastとして一時表示中のNotification
   */
  toasts: Notification[]
  /**
   * これまでに発生したNotificationの履歴
   */
  history: Notification[]
  notify: (message: string, type?: NotificationType) => void
  dismissToast: (id: string) => void
}

const TOAST_AUTO_DISMISS_MS = 4000
const HISTORY_LIMIT = 50
const dismissTimers = new Map<string, number>()

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  toasts: [],
  history: [],

  notify: (message, type = 'info') => {
    const notification: Notification = {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }

    set((state) => {
      const history = [...state.history, notification]
      return {
        toasts: [...state.toasts, notification],
        history:
          history.length > HISTORY_LIMIT
            ? history.slice(-HISTORY_LIMIT)
            : history,
      }
    })

    const timerId = window.setTimeout(() => {
      get().dismissToast(notification.id)
    }, TOAST_AUTO_DISMISS_MS)
    dismissTimers.set(notification.id, timerId)
  },

  dismissToast: (id) => {
    const timerId = dismissTimers.get(id)
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      dismissTimers.delete(id)
    }
    set((state) => ({
      toasts: state.toasts.filter((notification) => notification.id !== id),
    }))
  },
}))

const disposeNotificationStore = () => {
  for (const timerId of dismissTimers.values()) {
    window.clearTimeout(timerId)
  }
  dismissTimers.clear()
  useNotificationStore.setState({ toasts: [], history: [] })
}

export const initializeNotificationStore = () => disposeNotificationStore

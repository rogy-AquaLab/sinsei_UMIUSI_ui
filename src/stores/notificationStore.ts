import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export type Notification = {
  id: string
  message: string
  type: NotificationType
  timestamp: Date
}

type NotificationStore = {
  /**
   * これまでに発生したNotification
   */
  notifications: Notification[]
  notify: (message: string, type?: NotificationType) => void
}

const NOTIFICATION_LIMIT = 50

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  notify: (message, type = 'info') => {
    const notification: Notification = {
      id: uuidv4(),
      message,
      type,
      timestamp: new Date(),
    }

    set((state) => {
      const notifications = [...state.notifications, notification]
      return {
        notifications:
          notifications.length > NOTIFICATION_LIMIT
            ? notifications.slice(-NOTIFICATION_LIMIT)
            : notifications,
      }
    })
  },
}))

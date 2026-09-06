import {
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FaCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa'
import { FaXmark } from 'react-icons/fa6'
import {
  type Notification,
  type NotificationType,
  useNotificationStore,
} from '@/stores/notificationStore'
import { formatTime } from '@/utils/formatTime'

const TOAST_AUTO_DISMISS_MS = 4000

const icons: Record<NotificationType, ReactElement> = {
  info: <FaInfoCircle />,
  success: <FaCheck />,
  warning: <FaExclamationTriangle />,
  error: <FaExclamationTriangle />,
}

// Tailwindは動的なクラス名に非対応なのでワークアラウンドとして静的に列挙
const alertClasses: Record<NotificationType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  error: 'alert-error',
}

const ToastViewport = () => {
  const [toasts, setToasts] = useState<Notification[]>([])
  const dismissTimers = useRef(new Map<string, number>())

  const dismissToast = useCallback((id: string) => {
    const timerId = dismissTimers.current.get(id)
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      dismissTimers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (notification: Notification) => {
      setToasts((current) => [...current, notification])
      const timerId = window.setTimeout(() => {
        dismissToast(notification.id)
      }, TOAST_AUTO_DISMISS_MS)
      dismissTimers.current.set(notification.id, timerId)
    },
    [dismissToast],
  )

  useEffect(() => {
    const unsubscribe = useNotificationStore.subscribe(
      (state, previousState) => {
        const notification = state.notifications.at(-1)
        const previousNotification = previousState.notifications.at(-1)
        if (!notification || notification.id === previousNotification?.id)
          return

        showToast(notification)
      },
    )

    return () => {
      unsubscribe()
      for (const timerId of dismissTimers.current.values()) {
        window.clearTimeout(timerId)
      }
      dismissTimers.current.clear()
    }
  }, [showToast])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-end">
      <div className="toast pointer-events-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`alert alert-soft ${alertClasses[toast.type]}`}
          >
            <span className="text-base-content/50">
              {formatTime(toast.timestamp)}
            </span>
            {icons[toast.type]}
            <span>{toast.message}</span>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => dismissToast(toast.id)}
            >
              <FaXmark />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ToastViewport

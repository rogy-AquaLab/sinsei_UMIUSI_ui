import type { ReactElement } from 'react'
import { FaCheck, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa'
import { FaXmark } from 'react-icons/fa6'
import {
  type NotificationType,
  useNotificationStore,
} from '@/stores/notificationStore'

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
  const toasts = useNotificationStore((state) => state.toasts)
  const dismissToast = useNotificationStore((state) => state.dismissToast)

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-end">
      <div className="toast pointer-events-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={`alert alert-soft ${alertClasses[toast.type]}`}
          >
            <span className="text-base-content/50">{toast.timestamp}</span>
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

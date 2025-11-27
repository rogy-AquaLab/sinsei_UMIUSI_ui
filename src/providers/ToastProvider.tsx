import {
  createContext,
  useState,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import { FaInfoCircle, FaCheck, FaExclamationTriangle } from 'react-icons/fa'
import { FaXmark } from 'react-icons/fa6'
import { v4 as uuidv4 } from 'uuid'

type ToastType = 'info' | 'success' | 'warning' | 'error'

export type Toast = {
  id: string
  message: string
  type: ToastType
  timestamp: string
}

type ToastContextValue = {
  show: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = uuidv4()

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    setToasts((prev) => [...prev, { id, message, type, timestamp }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const icons: Record<ToastType, ReactElement> = {
    info: <FaInfoCircle />,
    success: <FaCheck />,
    warning: <FaExclamationTriangle />,
    error: <FaExclamationTriangle />,
  }

  // Tailwindは動的なクラス名に非対応なのでワークアラウンドとして関数化
  const getAlertClass = (type: ToastType) => {
    switch (type) {
      case 'info':
        return 'alert-info'
      case 'success':
        return 'alert-success'
      case 'warning':
        return 'alert-warning'
      case 'error':
        return 'alert-error'
    }
  }

  return (
    <ToastContext value={{ show: addToast }}>
      {children}

      <div className="fixed inset-0 pointer-events-none z-50 flex items-end justify-end">
        <div className="toast pointer-events-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              className={`alert alert-soft ${getAlertClass(toast.type)}`}
            >
              <span className="text-base-content/50">{toast.timestamp}</span>
              {icons[toast.type]}
              <span>{toast.message}</span>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => removeToast(toast.id)}
              >
                <FaXmark />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext>
  )
}

export default ToastProvider
export { ToastContext }

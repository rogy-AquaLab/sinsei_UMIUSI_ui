import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export type Toast = {
  id: string
  message: string
  type: ToastType
  timestamp: string
}

type ToastStore = {
  toasts: Toast[]
  history: Toast[]
  show: (message: string, type?: ToastType) => void
  dismiss: (id: string) => void
}

const TOAST_AUTO_DISMISS_MS = 4000
const LOG_LIMIT = 50
const dismissTimers = new Map<string, number>()

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  history: [],

  show: (message, type = 'info') => {
    const toast: Toast = {
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
      const history = [...state.history, toast]
      return {
        toasts: [...state.toasts, toast],
        history:
          history.length > LOG_LIMIT ? history.slice(-LOG_LIMIT) : history,
      }
    })

    const timerId = window.setTimeout(() => {
      get().dismiss(toast.id)
    }, TOAST_AUTO_DISMISS_MS)
    dismissTimers.set(toast.id, timerId)
  },

  dismiss: (id) => {
    const timerId = dismissTimers.get(id)
    if (timerId !== undefined) {
      window.clearTimeout(timerId)
      dismissTimers.delete(id)
    }
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },
}))

export const disposeToastStore = () => {
  for (const timerId of dismissTimers.values()) {
    window.clearTimeout(timerId)
  }
  dismissTimers.clear()
  useToastStore.setState({ toasts: [], history: [] })
}

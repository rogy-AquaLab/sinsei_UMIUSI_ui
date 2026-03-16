import { useMemo } from 'react'
import { useToast } from '@/hooks/useToast'

const severityStyles = {
  info: { badge: 'badge-info', badgeText: 'text-base-100', text: 'text-info' },
  success: {
    badge: 'badge-success',
    badgeText: 'text-base-100',
    text: 'text-success',
  },
  warning: {
    badge: 'badge-warning',
    badgeText: 'text-base-100',
    text: 'text-warning',
  },
  error: {
    badge: 'badge-error',
    badgeText: 'text-base-100',
    text: 'text-error',
  },
} as const

const LogPanel = () => {
  const { history } = useToast()

  const orderedHistory = useMemo(() => [...history].reverse(), [history])

  return (
    <div className="w-full border-t border-base-300 bg-base-300/70">
      <div className="flex items-center justify-between px-4 py-2">
        <p className="text-sm font-semibold">Logs</p>
        <span className="text-xs text-base-content/60">
          {history.length} entries
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto px-2 pb-2">
        {orderedHistory.length === 0 ? (
          <div className="px-2 py-4 text-sm text-base-content/60">
            No notifications yet.
          </div>
        ) : (
          <table className="table table-xs">
            <thead>
              <tr>
                <th className="w-20 text-xs font-semibold text-base-content/60">
                  Time
                </th>
                <th className="w-20 text-xs font-semibold text-base-content/60">
                  Type
                </th>
                <th className="text-xs font-semibold text-base-content/60">
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedHistory.map((toast) => {
                const style = severityStyles[toast.type]
                return (
                  <tr key={toast.id} className="align-top">
                    <td className="text-xs text-base-content/60">
                      {toast.timestamp}
                    </td>
                    <td className="text-xs">
                      <span
                        className={`badge badge-sm ${style.badge} ${style.badgeText}`}
                      >
                        {toast.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-xs text-base-content">{toast.message}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default LogPanel

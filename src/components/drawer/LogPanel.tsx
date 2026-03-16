import { useMemo, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { useRosout } from '@/hooks/useRosout'
import type { RosoutLog } from '@/contexts/RosoutContext'

const severityStyles = {
  info: { badge: 'badge-info', badgeText: 'text-base-100' },
  success: {
    badge: 'badge-success',
    badgeText: 'text-base-100',
  },
  warning: {
    badge: 'badge-warning',
    badgeText: 'text-base-100',
  },
  error: { badge: 'badge-error', badgeText: 'text-base-100' },
} as const

const LogPanel = () => {
  const { history } = useToast()
  const { logs: rosoutLogs } = useRosout()
  const [activeTab, setActiveTab] = useState<'notifications' | 'rosout'>(
    'notifications',
  )

  const orderedHistory = useMemo(() => [...history].reverse(), [history])
  const rosoutOrdered = useMemo(
    () => [...rosoutLogs].sort((a, b) => b.rawTimestamp - a.rawTimestamp),
    [rosoutLogs],
  )

  const activeEntryCount =
    activeTab === 'notifications' ? orderedHistory.length : rosoutOrdered.length

  return (
    <div className="w-full border-t border-base-300 bg-base-300/70">
      <div className="flex items-center justify-between px-4 pt-2">
        <p className="text-sm font-semibold">Logs</p>
        <span className="text-xs text-base-content/60">
          {activeEntryCount} entries
        </span>
      </div>
      <div className="px-2 pt-1">
        <div className="tabs tabs-boxed w-full">
          <button
            className={`tab flex-1 text-xs ${activeTab === 'notifications' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications ({orderedHistory.length})
          </button>
          <button
            className={`tab flex-1 text-xs ${activeTab === 'rosout' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('rosout')}
          >
            rosout ({rosoutOrdered.length})
          </button>
        </div>
      </div>
      <div className="max-h-56 overflow-y-auto px-2 pb-2">
        {activeTab === 'notifications' ? (
          <NotificationsTable logs={orderedHistory} />
        ) : (
          <RosoutTable logs={rosoutOrdered} />
        )}
      </div>
    </div>
  )
}

const NotificationsTable = ({ logs }: { logs: ReturnType<typeof useToast>['history'] }) => {
  if (logs.length === 0) {
    return (
      <div className="px-2 py-4 text-sm text-base-content/60">
        No notifications yet.
      </div>
    )
  }

  return (
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
        {logs.map((toast) => {
          const style = severityStyles[toast.type]
          return (
            <tr key={toast.id} className="align-top">
              <td className="text-xs text-base-content/60">{toast.timestamp}</td>
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
  )
}

const RosoutTable = ({ logs }: { logs: RosoutLog[] }) => {
  if (logs.length === 0) {
    return (
      <div className="px-2 py-4 text-sm text-base-content/60">
        No rosout logs yet.
      </div>
    )
  }

  return (
    <table className="table table-xs">
      <thead>
        <tr>
          <th className="w-20 text-xs font-semibold text-base-content/60">
            Time
          </th>
          <th className="w-16 text-xs font-semibold text-base-content/60">
            Level
          </th>
          <th className="w-32 text-xs font-semibold text-base-content/60">
            Node
          </th>
          <th className="text-xs font-semibold text-base-content/60">
            Message
          </th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="align-top">
            <td className="text-xs text-base-content/60">{log.timestamp}</td>
            <td className="text-xs">
              <span
                className={`badge badge-sm ${log.levelClass} text-base-100`}
              >
                {log.levelLabel}
              </span>
            </td>
            <td className="text-xs text-base-content">
              <div className="font-medium text-base-content">{log.name}</div>
              {log.function && (
                <div className="text-[10px] text-base-content/70">
                  {log.function}
                </div>
              )}
            </td>
            <td className="text-xs text-base-content">
              <div>{log.message}</div>
              {(log.file || log.line) && (
                <div className="text-[10px] text-base-content/60">
                  {log.file ?? ''}
                  {log.line ? `:${log.line}` : ''}
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default LogPanel

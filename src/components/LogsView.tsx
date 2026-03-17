import { useMemo, useState } from 'react'
import { useToast } from '@/hooks/useToast'
import { useRosout } from '@/hooks/useRosout'
import type { RosoutLog } from '@/contexts/RosoutContext'
import type { Toast } from '@/contexts/ToastContext'
import {
  RCL_LOG_LEVEL_DEBUG,
  RCL_LOG_LEVEL_ERROR,
  RCL_LOG_LEVEL_FATAL,
  RCL_LOG_LEVEL_INFO,
  RCL_LOG_LEVEL_WARN,
} from '@/msgs/RclInterfacesMsgs'

type RosoutLevelFilter = RosoutLog['level']
const DEFAULT_ROSOUT_LEVEL = RCL_LOG_LEVEL_DEBUG

const severityStyles = {
  info: { badge: 'badge-info', badgeText: 'text-base-100' },
  success: { badge: 'badge-success', badgeText: 'text-base-100' },
  warning: { badge: 'badge-warning', badgeText: 'text-base-100' },
  error: { badge: 'badge-error', badgeText: 'text-base-100' },
} as const

const LogsView = () => {
  const { history } = useToast()
  const { logs: rosoutLogs } = useRosout()
  const [activeTab, setActiveTab] = useState<'notifications' | 'rosout'>(
    'notifications',
  )
  const [rosoutLevelFilter, setRosoutLevelFilter] =
    useState<RosoutLevelFilter>(DEFAULT_ROSOUT_LEVEL)
  const [rosoutNodeFilter, setRosoutNodeFilter] = useState('')

  const orderedHistory = useMemo(() => [...history].reverse(), [history])
  const rosoutOrdered = useMemo(
    () => [...rosoutLogs].sort((a, b) => b.rawTimestamp - a.rawTimestamp),
    [rosoutLogs],
  )

  const rosoutFiltered = useMemo(() => {
    const nodeQuery = rosoutNodeFilter.trim().toLowerCase()
    return rosoutOrdered.filter((log) => {
      const matchesLevel = log.level >= rosoutLevelFilter
      const matchesNode =
        nodeQuery.length === 0 || log.name.toLowerCase().includes(nodeQuery)
      return matchesLevel && matchesNode
    })
  }, [rosoutOrdered, rosoutLevelFilter, rosoutNodeFilter])

  const activeEntryCount =
    activeTab === 'notifications'
      ? orderedHistory.length
      : rosoutFiltered.length

  const handleResetRosoutFilters = () => {
    setRosoutLevelFilter(DEFAULT_ROSOUT_LEVEL)
    setRosoutNodeFilter('')
  }

  return (
    <div className="flex h-full flex-col bg-base-100">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-base-300 px-6 py-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">Logs</p>
          <p className="text-sm text-base-content/60">
            {activeEntryCount} entries
          </p>
        </div>
        <div
          role="tablist"
          className="tabs tabs-box"
          aria-label="Log type tabs"
        >
          <button
            role="tab"
            className={`tab ${activeTab === 'notifications' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button
            role="tab"
            className={`tab ${activeTab === 'rosout' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('rosout')}
          >
            rosout
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 px-6 py-4">
        {activeTab === 'notifications' ? (
          <NotificationsTable logs={orderedHistory} />
        ) : (
          <RosoutTable
            logs={rosoutFiltered}
            totalLogs={rosoutOrdered.length}
            levelFilter={rosoutLevelFilter}
            nodeFilter={rosoutNodeFilter}
            onLevelFilterChange={setRosoutLevelFilter}
            onNodeFilterChange={setRosoutNodeFilter}
            onResetFilters={handleResetRosoutFilters}
          />
        )}
      </div>
    </div>
  )
}

type RosoutTableProps = {
  logs: RosoutLog[]
  totalLogs: number
  levelFilter: RosoutLevelFilter
  nodeFilter: string
  onLevelFilterChange: (value: RosoutLevelFilter) => void
  onNodeFilterChange: (value: string) => void
  onResetFilters: () => void
}

const levelOptions: { label: string; value: RosoutLevelFilter }[] = [
  { label: 'Debug', value: RCL_LOG_LEVEL_DEBUG },
  { label: 'Info', value: RCL_LOG_LEVEL_INFO },
  { label: 'Warn', value: RCL_LOG_LEVEL_WARN },
  { label: 'Error', value: RCL_LOG_LEVEL_ERROR },
  { label: 'Fatal', value: RCL_LOG_LEVEL_FATAL },
]

const NotificationsTable = ({ logs }: { logs: Toast[] }) => {
  if (logs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-base-content/60">
        No notifications yet.
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto rounded-xl border border-base-300 bg-base-200/60">
      <table className="table table-md">
        <thead>
          <tr>
            <th className="w-32 text-sm font-semibold text-base-content/60">
              Time
            </th>
            <th className="w-32 text-sm font-semibold text-base-content/60">
              Type
            </th>
            <th className="text-sm font-semibold text-base-content/60">
              Message
            </th>
          </tr>
        </thead>
        <tbody>
          {logs.map((toast) => {
            const style = severityStyles[toast.type]
            return (
              <tr key={toast.id} className="align-top">
                <td className="text-sm text-base-content/60">
                  {toast.timestamp}
                </td>
                <td className="text-sm">
                  <span
                    className={`badge badge-md ${style.badge} ${style.badgeText}`}
                  >
                    {toast.type.toUpperCase()}
                  </span>
                </td>
                <td className="text-sm text-base-content">{toast.message}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const RosoutTable = ({
  logs,
  totalLogs,
  levelFilter,
  nodeFilter,
  onLevelFilterChange,
  onNodeFilterChange,
  onResetFilters,
}: RosoutTableProps) => {
  const hasActiveFilters =
    levelFilter !== DEFAULT_ROSOUT_LEVEL || nodeFilter.trim().length > 0

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="select w-70 min-w-56">
          <span className="label">Minimum log level</span>
          <select
            value={levelFilter}
            onChange={(event) => {
              const value = Number(event.target.value) as RosoutLevelFilter
              onLevelFilterChange(value)
            }}
          >
            {levelOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="input w-70 min-w-56">
          <span className="label">Node name</span>
          <input
            type="text"
            value={nodeFilter}
            onChange={(event) => onNodeFilterChange(event.target.value)}
          />
        </label>
        {hasActiveFilters && (
          <button type="button" className="btn" onClick={onResetFilters}>
            Clear filters
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {totalLogs === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-base-content/60">
            No rosout logs yet.
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-base-content/60">
            No logs match the current filters.
          </div>
        ) : (
          <div className="h-full overflow-auto rounded-xl border border-base-300 bg-base-200/60">
            <table className="table table-md">
              <thead>
                <tr>
                  <th className="w-32 text-sm font-semibold text-base-content/60">
                    Time
                  </th>
                  <th className="w-24 text-sm font-semibold text-base-content/60">
                    Level
                  </th>
                  <th className="w-64 text-sm font-semibold text-base-content/60">
                    Node
                  </th>
                  <th className="text-sm font-semibold text-base-content/60">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="text-sm text-base-content/60">
                      {log.timestamp}
                    </td>
                    <td className="text-sm">
                      <span
                        className={`badge badge-md ${log.levelClass} text-base-100`}
                      >
                        {log.levelLabel}
                      </span>
                    </td>
                    <td className="text-sm text-base-content">
                      <div className="font-medium">{log.name}</div>
                      <div className="text-xs text-base-content/60">
                        {log.function ?? '-'}
                      </div>
                    </td>
                    <td className="text-sm text-base-content">
                      <p className="whitespace-pre-wrap text-base-content/90">
                        {log.message}
                      </p>
                      {(log.file || log.line) && (
                        <p className="mt-1 text-xs text-base-content/40">
                          {log.file ?? ''}
                          {log.line ? ` :${log.line}` : ''}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogsView

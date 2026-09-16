import type { IconType } from 'react-icons'

export type StatusIconTone = 'info' | 'success' | 'warning' | 'error' | 'muted'

type Props = {
  icon: IconType
  label: string
  tone: StatusIconTone
}

const toneClasses: Record<StatusIconTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  muted: 'text-base-content/30',
}

const StatusIcon = ({ icon: Icon, label, tone }: Props) => (
  <div
    className={`tooltip tooltip-bottom text-2xl ${toneClasses[tone]}`}
    data-tip={label}
    role="img"
    aria-label={label}
  >
    <Icon />
  </div>
)

export default StatusIcon

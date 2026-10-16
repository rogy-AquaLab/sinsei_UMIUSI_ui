import type { ReactElement } from 'react'
import type { IconType } from 'react-icons'
import { FaClipboardList, FaHeartbeat } from 'react-icons/fa'
import LogsView from '@/components/LogsView'
import StatusView from '@/components/StatusView'

type MainTabDefinition = {
  id: string
  label: string
  icon: IconType
  content: ReactElement
}

export const MAIN_TABS = [
  // Alexandriteにはカメラが無いため、Statusを先頭にする
  {
    id: 'status',
    label: 'Status',
    icon: FaHeartbeat,
    content: <StatusView />,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: FaClipboardList,
    content: <LogsView />,
  },
] as const satisfies readonly MainTabDefinition[]

export type MainContentTab = (typeof MAIN_TABS)[number]['id']

export const DEFAULT_MAIN_TAB: MainContentTab = MAIN_TABS[0].id

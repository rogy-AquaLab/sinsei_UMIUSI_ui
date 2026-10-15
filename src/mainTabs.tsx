import type { ReactElement } from 'react'
import type { IconType } from 'react-icons'
import {
  FaCamera,
  FaClipboardList,
  FaHeartbeat,
  FaSlidersH,
} from 'react-icons/fa'
import AutoParamsView from '@/components/AutoParamsView'
import CameraViewer from '@/components/CameraViewer'
import LogsView from '@/components/LogsView'
import StatusView from '@/components/StatusView'

type MainTabDefinition = {
  id: string
  label: string
  icon: IconType
  content: ReactElement
}

export const MAIN_TABS = [
  {
    id: 'camera',
    label: 'Camera',
    icon: FaCamera,
    content: <CameraViewer />,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: FaClipboardList,
    content: <LogsView />,
  },
  {
    id: 'status',
    label: 'Status',
    icon: FaHeartbeat,
    content: <StatusView />,
  },
  {
    id: 'auto',
    label: 'Auto',
    icon: FaSlidersH,
    content: <AutoParamsView />,
  },
] as const satisfies readonly MainTabDefinition[]

export type MainContentTab = (typeof MAIN_TABS)[number]['id']

export const DEFAULT_MAIN_TAB: MainContentTab = MAIN_TABS[0].id

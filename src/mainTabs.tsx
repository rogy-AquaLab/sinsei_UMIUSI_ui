import type { ReactElement } from 'react'
import type { IconType } from 'react-icons'
import { FaCamera, FaClipboardList } from 'react-icons/fa'
import CameraViewer from '@/components/CameraViewer'
import LogsView from '@/components/LogsView'

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
] as const satisfies readonly MainTabDefinition[]

export type MainContentTab = (typeof MAIN_TABS)[number]['id']

export const DEFAULT_MAIN_TAB: MainContentTab = MAIN_TABS[0].id

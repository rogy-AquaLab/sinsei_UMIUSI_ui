import { create } from 'zustand'
import {
  type CameraSession,
  type CameraSessionState,
  createCameraSession,
} from '@/services/camera/cameraSession'
import { useCameraConfigStore } from '@/stores/cameraConfigStore'
import { useNotificationStore } from '@/stores/notificationStore'

export type CameraId = 'front' | 'down'

type CameraStreamDefinition = {
  id: CameraId
  label: string
  path: string
}

type CameraStreamStore = {
  cameras: Record<CameraId, CameraSessionState>
  retry: (cameraId: CameraId) => void
}

export const CAMERA_STREAMS = [
  { id: 'front', label: 'Front camera', path: 'cam1' },
  { id: 'down', label: 'Down camera', path: 'cam2' },
] as const satisfies readonly CameraStreamDefinition[]

const createInitialCameraStates = (): Record<CameraId, CameraSessionState> => ({
  front: { stream: null, status: 'connecting', errorMessage: '' },
  down: { stream: null, status: 'connecting', errorMessage: '' },
})

let activeSessions: Map<CameraId, CameraSession> | null = null

export const useCameraStreamStore = create<CameraStreamStore>(() => ({
  cameras: createInitialCameraStates(),
  retry: (cameraId) => {
    const session = activeSessions?.get(cameraId)
    if (!session) return

    const definition = CAMERA_STREAMS.find(({ id }) => id === cameraId)
    session.retry()
    useNotificationStore
      .getState()
      .notify(`Retrying ${definition?.label ?? cameraId}.`, 'info')
  },
}))

const updateCameraState = (cameraId: CameraId, state: CameraSessionState) => {
  useCameraStreamStore.setState((current) => ({
    cameras: { ...current.cameras, [cameraId]: state },
  }))
}

export const initializeCameraStreamStore = () => {
  const sessions = new Map<CameraId, CameraSession>()
  activeSessions = sessions

  const startSessions = (mediaMtxUrl: string) => {
    for (const session of sessions.values()) session.close()
    sessions.clear()
    useCameraStreamStore.setState({ cameras: createInitialCameraStates() })

    for (const definition of CAMERA_STREAMS) {
      let session: CameraSession
      session = createCameraSession(`${mediaMtxUrl}/${definition.path}/whep`, {
        onStateChange: (state) => {
          if (sessions.get(definition.id) !== session) return
          updateCameraState(definition.id, state)
        },
        onReconnected: () => {
          if (sessions.get(definition.id) !== session) return
          useNotificationStore
            .getState()
            .notify(`${definition.label} reconnected.`, 'success')
        },
        onFailure: () => {
          if (sessions.get(definition.id) !== session) return
          useNotificationStore
            .getState()
            .notify(`${definition.label} connection failed.`, 'error')
        },
      })
      sessions.set(definition.id, session)
      session.connect()
    }
  }

  startSessions(useCameraConfigStore.getState().mediaMtxUrl)

  const unsubscribeConfig = useCameraConfigStore.subscribe(
    (state, previousState) => {
      if (state.mediaMtxUrl === previousState.mediaMtxUrl) return
      startSessions(state.mediaMtxUrl)
    },
  )

  return () => {
    unsubscribeConfig()
    for (const session of sessions.values()) session.close()
    sessions.clear()
    if (activeSessions === sessions) activeSessions = null
    useCameraStreamStore.setState({ cameras: createInitialCameraStates() })
  }
}

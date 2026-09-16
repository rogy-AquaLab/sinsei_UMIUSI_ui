import { FaCamera } from 'react-icons/fa'
import StatusIcon, { type StatusIconTone } from '@/components/navbar/StatusIcon'
import {
  CAMERA_STREAMS,
  type CameraId,
  useCameraStreamStore,
} from '@/stores/cameraStreamStore'

const describeCameras = (cameraIds: CameraId[], state: string) => {
  if (cameraIds.length === CAMERA_STREAMS.length) return `Cameras ${state}`
  const camera = CAMERA_STREAMS.find(({ id }) => id === cameraIds[0])
  return `${camera?.label ?? 'Camera'} ${state}`
}

const CameraStatusIcon = () => {
  const cameras = useCameraStreamStore((store) => store.cameras)
  const cameraIdsByStatus = (status: (typeof cameras)[CameraId]['status']) =>
    CAMERA_STREAMS.filter(({ id }) => cameras[id].status === status).map(
      ({ id }) => id,
    )

  const failedCameraIds = cameraIdsByStatus('failed')
  const liveCameraIds = cameraIdsByStatus('live')
  const retryingCameraIds = cameraIdsByStatus('retrying')
  const connectingCameraIds = cameraIdsByStatus('connecting')

  let label = 'Cameras connecting'
  let tone: StatusIconTone = 'warning'

  if (liveCameraIds.length === CAMERA_STREAMS.length) {
    label = 'Cameras live'
    tone = 'success'
  } else if (failedCameraIds.length === CAMERA_STREAMS.length) {
    label = 'Cameras unavailable'
    tone = 'muted'
  } else if (failedCameraIds.length > 0) {
    label = describeCameras(failedCameraIds, 'unavailable')
  } else if (retryingCameraIds.length > 0) {
    label = describeCameras(retryingCameraIds, 'reconnecting')
  } else if (connectingCameraIds.length > 0) {
    label = describeCameras(connectingCameraIds, 'connecting')
  }

  return <StatusIcon icon={FaCamera} label={label} tone={tone} />
}

export default CameraStatusIcon

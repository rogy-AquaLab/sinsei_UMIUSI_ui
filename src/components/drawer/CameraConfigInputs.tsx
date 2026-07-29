import { useEffect, useState } from 'react'
import { useCameraConfigStore } from '@/stores/cameraConfigStore'
import { useNotificationStore } from '@/stores/notificationStore'

const CameraConfigInputs = () => {
  const mediaMtxUrl = useCameraConfigStore((state) => state.mediaMtxUrl)
  const updateMediaMtxUrl = useCameraConfigStore(
    (state) => state.updateMediaMtxUrl,
  )
  const notify = useNotificationStore((state) => state.notify)
  const [draft, setDraft] = useState(mediaMtxUrl)

  useEffect(() => setDraft(mediaMtxUrl), [mediaMtxUrl])

  const applyUrl = () => {
    if (draft === mediaMtxUrl) return

    try {
      const url = new URL(draft)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('MediaMTX URL must use HTTP or HTTPS.')
      }
      updateMediaMtxUrl(draft)
      notify('MediaMTX URL updated.', 'success')
    } catch (error) {
      setDraft(mediaMtxUrl)
      notify(
        error instanceof Error ? error.message : 'Invalid MediaMTX URL.',
        'error',
      )
    }
  }

  return (
    <>
      <label htmlFor="mediamtx-url" className="label">
        MediaMTX URL
      </label>
      <input
        id="mediamtx-url"
        type="url"
        className="input w-full"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={applyUrl}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(mediaMtxUrl)
            event.currentTarget.blur()
          }
        }}
      />
    </>
  )
}

export default CameraConfigInputs

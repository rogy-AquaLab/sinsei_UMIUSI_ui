import { useRosStore } from '@/stores/rosStore'

const UrlInput = () => {
  const connectionState = useRosStore((state) => state.connectionState)
  const url = useRosStore((state) => state.url)
  const setUrl = useRosStore((state) => state.setUrl)

  return (
    <input
      id="rosbridge-url"
      type="url"
      className="input"
      required
      placeholder="ws://"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      disabled={connectionState !== 'disconnected'}
    />
  )
}

export default UrlInput

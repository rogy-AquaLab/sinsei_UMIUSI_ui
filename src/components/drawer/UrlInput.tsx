import { useRos } from '@/hooks/useRos'

const UrlInput = () => {
  const { connectionState, url, setUrl } = useRos()

  return (
    <input
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

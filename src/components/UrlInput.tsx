import { useContext } from 'react'
import { RosContext } from '../contexts/RosContext'

const UrlInput = () => {
  const { connectionState, url, setUrl } = useContext(RosContext)

  return (
    <fieldset className="fieldset w-full">
      <legend className="fieldset-legend">rosbridge URL</legend>
      <input
        type="url"
        className="input"
        required
        placeholder="ws://"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={connectionState !== 'disconnected'}
      />
    </fieldset>
  )
}

export default UrlInput

type Props = {
  hostname: string
  camName: string
}

const CameraViewer = ({ hostname, camName }: Props) => {
  return (
    <div className="video-container h-full w-full bg-black">
      <iframe
        src={`${hostname}/${camName}?controls=false`}
        allow="autoplay; fullscreen"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Camera Viewer"
      />
    </div>
  )
}

export default CameraViewer

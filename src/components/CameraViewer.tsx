import { useContext, useEffect, useRef, useState } from 'react'
import { ToastContext } from '@/contexts/ToastContext'

type Props = {
  hostname: string
  topicName: string
  width: number
  height: number
}

type CameraViewerState = 'loading' | 'error' | 'ready'

const CameraViewer = ({ hostname, topicName, width, height }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef(new Image())

  const [state, setState] = useState<CameraViewerState>('loading')
  const toast = useContext(ToastContext)

  const url = `${hostname}/stream?topic=${topicName}&type=mjpeg&width=${width}&height=${height}`

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    img.src = url

    const render = () => {
      setState('ready')
      ctx?.drawImage(img, 0, 0, width, height)
      requestAnimationFrame(render)
    }

    img.onload = render

    img.onerror = (err) => {
      if (state !== 'error') {
        console.error('Failed to load image stream:', err)
        toast?.show('Failed to load image stream from ' + topicName, 'error')
      }
      setState('error')
    }
  }, [url, width, height, toast, topicName, state])

  return (
    <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="max-w-full max-h-full object-contain bg-black"
      />
    </div>
  )
}

export default CameraViewer

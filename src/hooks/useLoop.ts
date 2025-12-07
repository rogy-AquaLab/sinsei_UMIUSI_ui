import { useEffect, useRef } from 'react'

type UseLoopOptions = {
  callback: () => void
  /**
   * 更新頻度 frequency (Hz)
   */
  frequency: number | null
}

/**
 * 更新頻度 frequency (Hz) でコールバックを実行するHook
 */
export const useLoop = ({ callback, frequency }: UseLoopOptions) => {
  const savedCallback = useRef<(() => void) | null>(null)
  const intervalId = useRef<number | null>(null)

  const clearLoopInterval = () => {
    if (intervalId.current === null) return

    clearInterval(intervalId.current)
    intervalId.current = null
  }

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (frequency === null || frequency <= 0) {
      clearLoopInterval()
      return
    }

    const timeout = 1000 / frequency

    intervalId.current = setInterval(() => {
      savedCallback.current?.()
    }, timeout)

    return () => clearLoopInterval()
  }, [frequency])
}

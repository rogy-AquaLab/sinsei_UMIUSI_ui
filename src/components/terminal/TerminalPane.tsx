import { useLayoutEffect, useRef } from 'react'
import { useTerminal } from '@/hooks/useTerminal'

type TerminalPaneProps = {
  terminalId: string
}

const TerminalPane = ({ terminalId }: TerminalPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { attachTerminal, detachTerminal } = useTerminal()

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    attachTerminal(terminalId, container)

    return () => {
      detachTerminal(terminalId, container)
    }
  }, [attachTerminal, detachTerminal, terminalId])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-[#111827] p-3"
    />
  )
}

export default TerminalPane

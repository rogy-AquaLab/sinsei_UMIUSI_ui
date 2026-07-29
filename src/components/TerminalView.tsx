import { FaPlus, FaTerminal, FaTimes } from 'react-icons/fa'
import TerminalLogin from '@/components/terminal/TerminalLogin'
import TerminalPane from '@/components/terminal/TerminalPane'
import { useTerminal } from '@/hooks/useTerminal'

const TerminalView = () => {
  const {
    state,
    error,
    maxTerminals,
    connect,
    disconnect,
    tabs,
    activeTerminalId,
    addTerminal,
    closeTerminal,
    activateTerminal,
  } = useTerminal()

  if (state !== 'connected') {
    return <TerminalLogin state={state} error={error} onConnect={connect} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-base-100">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-base-300 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            role="tablist"
            className="tabs tabs-border min-w-0 overflow-x-auto"
            aria-label="Terminal sessions"
          >
            {tabs.map((tab) => {
              const isActive = activeTerminalId === tab.id
              const tabId = `terminal-tab-${tab.id}`

              return (
                <div
                  key={tab.id}
                  role="presentation"
                  className={`tab shrink-0 gap-1 pe-1 ${
                    isActive ? 'tab-active' : ''
                  }`}
                >
                  <button
                    id={tabId}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className="flex h-full items-center gap-2 ps-1"
                    onClick={() => activateTerminal(tab.id)}
                  >
                    <FaTerminal className="size-3" />
                    {tab.title}
                  </button>
                  <button
                    type="button"
                    className="btn btn-circle btn-ghost btn-xs"
                    aria-label={`Close ${tab.title}`}
                    title={`Close ${tab.title}`}
                    onClick={() => closeTerminal(tab.id)}
                  >
                    <FaTimes className="size-3" />
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-square btn-sm"
            onClick={addTerminal}
            disabled={tabs.length >= maxTerminals}
            aria-label="New terminal"
            title={
              tabs.length >= maxTerminals
                ? `Maximum ${maxTerminals} terminals`
                : 'New terminal'
            }
          >
            <FaPlus />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div
            role="status"
            className="flex items-center gap-2 text-sm"
            aria-label="Terminal connected"
          >
            <span className="status status-success" aria-hidden="true" />
            <span>Connected</span>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={disconnect}
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#111827]">
        {tabs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-base-100/10 p-5 text-base-100/60">
                <FaTerminal className="size-8" />
              </div>
              <div>
                <p className="font-medium text-base-100">No terminals open</p>
                <p className="mt-1 text-sm text-base-100/60">
                  Start a new shell on the robot.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={addTerminal}
              >
                <FaPlus />
                New terminal
              </button>
            </div>
          </div>
        ) : activeTerminalId ? (
          <div
            key={activeTerminalId}
            role="tabpanel"
            aria-labelledby={`terminal-tab-${activeTerminalId}`}
            className="absolute inset-0"
          >
            <TerminalPane terminalId={activeTerminalId} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default TerminalView

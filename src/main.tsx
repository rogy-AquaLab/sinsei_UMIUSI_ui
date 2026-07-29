import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.tsx'
import { GamepadProvider } from '@/contexts/GamepadContext'
import { RobotStateProvider } from '@/contexts/RobotStateContext'
import { RosProvider } from '@/contexts/RosContext'
import { RosoutProvider } from '@/contexts/RosoutContext'
import { TerminalProvider } from '@/contexts/TerminalContext'
import { ToastProvider } from '@/contexts/ToastContext'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <ToastProvider>
    <RosProvider url="ws://localhost:9090">
      <RosoutProvider>
        <RobotStateProvider>
          <GamepadProvider>
            <StrictMode>
              <TerminalProvider>
                <App />
              </TerminalProvider>
            </StrictMode>
          </GamepadProvider>
        </RobotStateProvider>
      </RosoutProvider>
    </RosProvider>
  </ToastProvider>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.tsx'
import { GamepadProvider } from '@/contexts/GamepadContext'
import { HealthProvider } from '@/contexts/HealthContext'
import { RobotStateProvider } from '@/contexts/RobotStateContext'
import { RosProvider } from '@/contexts/RosContext'
import { RosoutProvider } from '@/contexts/RosoutContext'
import { ThrusterStateProvider } from '@/contexts/ThrusterStateContext'
import { ToastProvider } from '@/contexts/ToastContext'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root was not found')
}

createRoot(rootElement).render(
  <ToastProvider>
    <RosProvider url="ws://localhost:9090">
      <HealthProvider>
        <ThrusterStateProvider>
          <RosoutProvider>
            <RobotStateProvider>
              <GamepadProvider>
                <StrictMode>
                  <App />
                </StrictMode>
              </GamepadProvider>
            </RobotStateProvider>
          </RosoutProvider>
        </ThrusterStateProvider>
      </HealthProvider>
    </RosProvider>
  </ToastProvider>,
)

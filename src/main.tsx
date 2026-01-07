import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.tsx'
import { ToastProvider } from '@/contexts/ToastContext'
import { RosProvider } from '@/contexts/RosContext'
import { GamepadProvider } from '@/contexts/GamepadContext'
import { RobotStateProvider } from '@/contexts/RobotStateContext'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <RosProvider url="ws://localhost:9090">
      <RobotStateProvider>
        <GamepadProvider>
          <StrictMode>
            <App />
          </StrictMode>
        </GamepadProvider>
      </RobotStateProvider>
    </RosProvider>
  </ToastProvider>,
)

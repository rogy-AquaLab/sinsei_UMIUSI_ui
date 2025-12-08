import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'
import { RosProvider } from './contexts/RosContext'
import { GamepadProvider } from './contexts/GamepadContext'

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <RosProvider url="ws://localhost:9090">
      <GamepadProvider>
        <StrictMode>
          <App />
        </StrictMode>
      </GamepadProvider>
    </RosProvider>
  </ToastProvider>,
)

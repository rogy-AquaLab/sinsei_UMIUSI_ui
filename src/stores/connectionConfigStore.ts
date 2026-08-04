import { create } from 'zustand'

type ConnectionConfigStore = {
  robotHost: string
  updateRobotHost: (host: string) => void
}

export const useConnectionConfigStore = create<ConnectionConfigStore>(
  (set) => ({
    robotHost: window.location.hostname,
    updateRobotHost: (host) => set({ robotHost: host.trim() }),
  }),
)

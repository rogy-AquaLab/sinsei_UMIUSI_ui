import { create } from 'zustand'

type RobotHostUpdateResult =
  | { success: true; robotHost: string }
  | { success: false; errorMessage: string }

type ConnectionConfigStore = {
  robotHost: string
  updateRobotHost: (host: string) => RobotHostUpdateResult
}

const normalizeRobotHost = (input: string): RobotHostUpdateResult => {
  const value = input.trim()
  if (!value) {
    return {
      success: false,
      errorMessage: 'Enter a hostname or IP address.',
    }
  }

  try {
    const url = new URL(`http://${value}`)
    const hasPort = value.startsWith('[')
      ? !value.endsWith(']')
      : value.includes(':')

    if (
      hasPort ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return {
        success: false,
        errorMessage:
          'Enter a hostname or IP address without a protocol, port, or path.',
      }
    }

    return { success: true, robotHost: url.host }
  } catch {
    return {
      success: false,
      errorMessage: 'Enter a valid hostname or IP address.',
    }
  }
}

export const useConnectionConfigStore = create<ConnectionConfigStore>(
  (set) => ({
    robotHost: window.location.hostname,
    updateRobotHost: (host) => {
      const result = normalizeRobotHost(host)
      if (result.success) set({ robotHost: result.robotHost })
      return result
    },
  }),
)

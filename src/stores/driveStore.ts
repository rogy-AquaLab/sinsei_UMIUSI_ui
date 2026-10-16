import { create } from 'zustand'
import { useGamepadStore } from '@/stores/gamepadStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useRosStore } from '@/stores/rosStore'

/**
 * swim: スラスタで遊泳する
 * crawl: クローラーで走行する
 */
export type DriveMode = 'swim' | 'crawl'

type DriveStore = {
  /**
   * 運転許可を出しているか
   */
  armed: boolean
  driveMode: DriveMode
  arm: () => void
  disarm: () => void
  toggleDriveMode: () => void
}

const canArm = () =>
  useRosStore.getState().connectionState === 'connected' &&
  useGamepadStore.getState().selectedIndex !== null

export const useDriveStore = create<DriveStore>((set, get) => ({
  armed: false,
  driveMode: 'swim',

  arm: () => {
    if (get().armed) return
    if (!canArm()) {
      useNotificationStore
        .getState()
        .notify('Connect to ROS and select a gamepad before arming', 'warning')
      return
    }
    set({ armed: true })
    useNotificationStore.getState().notify('Armed', 'success')
  },

  disarm: () => {
    if (!get().armed) return
    set({ armed: false })
    useNotificationStore.getState().notify('Disarmed', 'info')
  },

  toggleDriveMode: () => {
    const driveMode = get().driveMode === 'swim' ? 'crawl' : 'swim'
    set({ driveMode })
    useNotificationStore
      .getState()
      .notify(`Drive mode: ${driveMode === 'swim' ? 'Swim' : 'Crawl'}`, 'info')
  },
}))

/**
 * ROSの接続かゲームパッドが失われたら、運転許可を取り消す
 */
export const initializeDriveStore = () => {
  const disarmIfUnavailable = () => {
    if (useDriveStore.getState().armed && !canArm()) {
      useDriveStore.getState().disarm()
    }
  }

  const unsubscribeRos = useRosStore.subscribe(disarmIfUnavailable)
  const unsubscribeGamepad = useGamepadStore.subscribe(disarmIfUnavailable)

  return () => {
    unsubscribeGamepad()
    unsubscribeRos()
    useDriveStore.setState({ armed: false, driveMode: 'swim' })
  }
}

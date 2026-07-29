import { create } from 'zustand'

type CameraConfigStore = {
  mediaMtxUrl: string
  updateMediaMtxUrl: (url: string) => void
}

const defaultMediaMtxUrl = `${window.location.protocol}//${window.location.hostname}:8889`

export const useCameraConfigStore = create<CameraConfigStore>((set) => ({
  mediaMtxUrl: defaultMediaMtxUrl,
  updateMediaMtxUrl: (url) => {
    set({ mediaMtxUrl: url.trim().replace(/\/+$/, '') })
  },
}))

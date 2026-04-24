export type OverlayState = 'idle' | 'recording' | 'transcribing'

export interface AppApi {
  onOverlayState: (cb: (state: string) => void) => () => void
}

declare global {
  interface Window {
    api: AppApi
  }
}

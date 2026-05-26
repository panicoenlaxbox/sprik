export const SCOPES = {
  overlay: 'overlay',
  paste: 'paste',
  postProcessing: 'postProcessing',
  recording: 'recording',
  shortcuts: 'shortcuts',
  transcription: 'transcription',
  updater: 'updater',
  user: 'user',
  worker: 'worker'
} as const

export type Scope = (typeof SCOPES)[keyof typeof SCOPES]

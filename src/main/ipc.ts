import { z } from 'zod'

export const CHANNELS = {
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_CANCEL: 'recording:cancel',
  RECORDING_AUDIO: 'recording:audio',
  RECORDING_ERROR: 'recording:error',
  OVERLAY_STATE: 'overlay:state',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_KEY_STATUS: 'settings:get-key-status',
  SETTINGS_SET_KEY: 'settings:set-key',
  SETTINGS_CLEAR_KEY: 'settings:clear-key'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

export const overlayStateSchema = z.enum(['idle', 'recording', 'transcribing'])
export type OverlayState = z.infer<typeof overlayStateSchema>

export const recordingAudioPayloadSchema = z.object({
  durationMs: z.number().nonnegative()
})
export type RecordingAudioPayload = { buffer: Buffer; durationMs: number }

export const apiProviderSchema = z.enum(['openai', 'groq', 'anthropic'])
export type ApiProvider = z.infer<typeof apiProviderSchema>

export const setKeyPayloadSchema = z.object({
  provider: apiProviderSchema,
  key: z.string().min(1)
})
export type SetKeyPayload = z.infer<typeof setKeyPayloadSchema>

import { z } from 'zod'

export { CHANNELS, type Channel } from './channels'

export const overlayStateSchema = z.enum(['idle', 'recording', 'transcribing', 'cancelled'])
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

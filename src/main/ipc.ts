import { z } from 'zod'

export const CHANNELS = {
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_CANCEL: 'recording:cancel',
  RECORDING_AUDIO: 'recording:audio',
  RECORDING_ERROR: 'recording:error',
  OVERLAY_STATE: 'overlay:state',
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

export const overlayStateSchema = z.enum(['idle', 'recording', 'transcribing'])
export type OverlayState = z.infer<typeof overlayStateSchema>

export const recordingAudioPayloadSchema = z.object({
  durationMs: z.number().nonnegative()
})
export type RecordingAudioPayload = { buffer: Buffer; durationMs: number }

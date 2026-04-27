import type { CHANNELS } from './channels'

type WorkerChannelKeys =
  | 'RECORDING_START'
  | 'RECORDING_STOP'
  | 'RECORDING_CANCEL'
  | 'RECORDING_AUDIO'
  | 'RECORDING_ERROR'
  | 'LOG_WORKER'

export const WORKER_CHANNELS = {
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_CANCEL: 'recording:cancel',
  RECORDING_AUDIO: 'recording:audio',
  RECORDING_ERROR: 'recording:error',
  LOG_WORKER: 'log:worker'
} as const satisfies Pick<typeof CHANNELS, WorkerChannelKeys>

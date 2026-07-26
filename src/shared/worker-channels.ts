import type { CHANNELS } from './channels'

type WorkerChannelKeys =
  | 'RECORDING_START'
  | 'RECORDING_STOP'
  | 'RECORDING_CANCEL'
  | 'RECORDING_AUDIO'
  | 'RECORDING_ERROR'
  | 'RECORDING_STARTED'
  | 'RECORDING_ABORTED'
  | 'LOG_WORKER'

export const WORKER_CHANNELS = {
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_CANCEL: 'recording:cancel',
  RECORDING_AUDIO: 'recording:audio',
  RECORDING_ERROR: 'recording:error',
  RECORDING_STARTED: 'recording:started',
  RECORDING_ABORTED: 'recording:aborted',
  LOG_WORKER: 'log:worker'
} as const satisfies Pick<typeof CHANNELS, WorkerChannelKeys>

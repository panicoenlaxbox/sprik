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
  SETTINGS_GET_KEY: 'settings:get-key',
  SETTINGS_SET_KEY: 'settings:set-key',
  SETTINGS_CLEAR_KEY: 'settings:clear-key',
  HISTORY_GET_ALL: 'history:get-all',
  HISTORY_DELETE: 'history:delete',
  HISTORY_CLEAR: 'history:clear',
  HISTORY_EXPORT: 'history:export',
  CLIPBOARD_WRITE: 'clipboard:write',
  SHORTCUTS_PAUSE: 'shortcuts:pause',
  SHORTCUTS_RESUME: 'shortcuts:resume',
  SHELL_OPEN_PATH: 'shell:open-path',
  SHELL_OPEN_RECORDINGS_PATH: 'shell:open-recordings-path',
  RECORDINGS_GET_PATH: 'recordings:get-path',
  LOG_FORWARD: 'log:forward'
} as const

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS]

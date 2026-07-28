import { z } from 'zod'
import Store from 'electron-store'
import { DEFAULT_POST_PROCESSING_PROMPT } from '../shared/utils'

// zod v4: default values are returned as-is without re-parsing through the inner
// schema, so each section needs a complete default object (not just `{}`).
export const configSchema = z.object({
  shortcuts: z
    .object({
      toggleRecording: z.string().default('Ctrl+Alt+Space'),
      // Opt-in on purpose: a global cancel accelerator is swallowed system-wide
      // while a recording runs, so the app ships without one and cancelling is a
      // deliberate click on the overlay. Empty means "no shortcut".
      cancelRecording: z.string().default('')
    })
    .default({ toggleRecording: 'Ctrl+Alt+Space', cancelRecording: '' }),

  transcription: z
    .object({
      provider: z.enum(['groq', 'openai', 'azure']).default('groq'),
      model: z.string().default('whisper-large-v3-turbo'),
      language: z.string().optional(),
      deviceId: z.string().optional(),
      endpoint: z.string().optional()
    })
    .default({ provider: 'groq', model: 'whisper-large-v3-turbo' }),

  postProcessing: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['anthropic', 'openai', 'azure']).default('anthropic'),
      model: z.string().default('claude-haiku-4-5'),
      prompt: z.string().default(DEFAULT_POST_PROCESSING_PROMPT),
      endpoint: z.string().optional()
    })
    .default({
      enabled: false,
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      prompt: DEFAULT_POST_PROCESSING_PROMPT
    }),

  pasteMode: z
    .enum(['clipboard-and-focus', 'clipboard-only', 'focus-only'])
    .default('clipboard-and-focus'),

  history: z
    .object({
      retain: z.number().int().positive().default(100),
      enabled: z.boolean().default(true),
      saveAudio: z.boolean().default(false)
    })
    .default({ retain: 100, enabled: true, saveAudio: false }),

  startup: z
    .object({
      autostart: z.boolean().default(false),
      autoCheck: z.boolean().default(true),
      checkIntervalHours: z.number().int().min(1).max(168).default(4)
    })
    .default({ autostart: false, autoCheck: true, checkIntervalHours: 4 }),

  ui: z
    .object({
      theme: z.enum(['system', 'light', 'dark']).default('system'),
      overlayPosition: z.object({ x: z.number(), y: z.number() }).optional(),
      sidebarExpanded: z.boolean().default(false),
      detailsPanelWidth: z.number().int().min(280).default(320)
    })
    .default({ theme: 'system', sidebarExpanded: false, detailsPanelWidth: 320 }),

  overlay: z
    .object({
      showTimer: z.boolean().default(false),
      invertColors: z.boolean().default(true)
    })
    .default({ showTimer: false, invertColors: true })
})

export type Config = z.infer<typeof configSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<any>({ name: 'config' })

export function getConfig(): Config {
  // zod v4 does not apply field-level defaults when the parent section already
  // exists in the store (only object-level defaults kick in for absent sections).
  // Deep-merge every section with the schema defaults so new fields added to an
  // existing section always have a value without any manual patching.
  const raw = store.store as Record<string, unknown>
  const defaults = configSchema.parse({}) as Record<string, unknown>
  const patched = Object.fromEntries(
    Object.entries(defaults).map(([key, def]) => {
      const stored = raw[key]
      if (stored !== null && typeof stored === 'object' && !Array.isArray(stored)) {
        return [key, { ...(def as object), ...(stored as object) }]
      }
      return [key, stored !== undefined ? stored : def]
    })
  )
  return configSchema.parse(patched)
}

export function setConfig(updates: Partial<Config>): void {
  const current = getConfig()
  const merged = { ...current, ...updates }
  configSchema.parse(merged)
  store.store = merged
}

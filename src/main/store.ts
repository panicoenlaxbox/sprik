import { z } from 'zod'
import Store from 'electron-store'

// zod v4: default values are returned as-is without re-parsing through the inner
// schema, so each section needs a complete default object (not just `{}`).
export const configSchema = z.object({
  shortcuts: z.object({
    toggleRecording: z.string().default('Ctrl+Alt+Space'),
    cancelRecording: z.string().default('Escape')
  }).default({ toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' }),

  transcription: z.object({
    provider: z.enum(['groq', 'openai']).default('groq'),
    model: z.string().default('distil-whisper-large-v3-en'),
    language: z.string().optional(),
    deviceId: z.string().optional()
  }).default({ provider: 'groq', model: 'distil-whisper-large-v3-en' }),

  postProcess: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['anthropic', 'openai']).default('anthropic'),
    model: z.string().default('claude-haiku-4-5-20251001'),
    systemPrompt: z.string().default('Clean up the transcription, fix punctuation and grammar.')
  }).default({
    enabled: false,
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    systemPrompt: 'Clean up the transcription, fix punctuation and grammar.'
  }),

  paste: z.object({
    autoPaste: z.boolean().default(true)
  }).default({ autoPaste: true }),

  history: z.object({
    retain: z.number().int().positive().default(100),
    enabled: z.boolean().default(true)
  }).default({ retain: 100, enabled: true }),

  autostart: z.object({
    enabled: z.boolean().default(false)
  }).default({ enabled: false }),

  ui: z.object({
    theme: z.enum(['system', 'light', 'dark']).default('system'),
    overlayPosition: z.object({ x: z.number(), y: z.number() }).optional()
  }).default({ theme: 'system' }),

  recordings: z.object({
    saveText: z.boolean().default(false),
    saveAudio: z.boolean().default(false)
  }).default({ saveText: false, saveAudio: false })
})

export type Config = z.infer<typeof configSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<any>({ name: 'config' })

export function getConfig(): Config {
  return configSchema.parse(store.store)
}

export function setConfig(updates: Partial<Config>): void {
  const current = getConfig()
  const merged = { ...current, ...updates }
  configSchema.parse(merged)
  store.store = merged
}

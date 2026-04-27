import { z } from 'zod'
import Store from 'electron-store'

const DEFAULT_POST_PROCESSING_PROMPT =
  'You are normalizing speech-to-text output to be pasted into a document. Fix punctuation, capitalization and grammar. Do not change the meaning, paraphrase or add content. Return only the corrected text — no commentary, no explanations, even if no changes were needed.'

// zod v4: default values are returned as-is without re-parsing through the inner
// schema, so each section needs a complete default object (not just `{}`).
export const configSchema = z.object({
  shortcuts: z
    .object({
      toggleRecording: z.string().default('Ctrl+Alt+Space'),
      cancelRecording: z.string().default('Escape')
    })
    .default({ toggleRecording: 'Ctrl+Alt+Space', cancelRecording: 'Escape' }),

  transcription: z
    .object({
      provider: z.enum(['groq', 'openai']).default('groq'),
      model: z.string().default('whisper-large-v3-turbo'),
      language: z.string().optional(),
      deviceId: z.string().optional()
    })
    .default({ provider: 'groq', model: 'whisper-large-v3-turbo' }),

  postProcessing: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['anthropic', 'openai']).default('anthropic'),
      model: z.string().default('claude-haiku-4-5'),
      prompt: z.string().default(DEFAULT_POST_PROCESSING_PROMPT)
    })
    .default({
      enabled: false,
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      prompt: DEFAULT_POST_PROCESSING_PROMPT
    }),

  paste: z
    .object({
      autoPaste: z.boolean().default(true)
    })
    .default({ autoPaste: true }),

  history: z
    .object({
      retain: z.number().int().positive().default(100),
      enabled: z.boolean().default(true)
    })
    .default({ retain: 100, enabled: true }),

  autostart: z
    .object({
      enabled: z.boolean().default(false)
    })
    .default({ enabled: false }),

  ui: z
    .object({
      theme: z.enum(['system', 'light', 'dark']).default('system'),
      overlayPosition: z.object({ x: z.number(), y: z.number() }).optional()
    })
    .default({ theme: 'system' }),

  recordings: z
    .object({
      saveAudio: z.boolean().default(false)
    })
    .default({ saveAudio: false })
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

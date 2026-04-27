import { openaiTranscriber } from './openai'
import { groqTranscriber } from './groq'
import { azureTranscriber } from './azure'
import type { Transcriber } from './types'

const registry: Record<string, Transcriber> = {
  openai: openaiTranscriber,
  groq: groqTranscriber,
  azure: azureTranscriber
}

export function getTranscriber(id: string): Transcriber {
  const t = registry[id]
  if (!t)
    throw new Error(`Unknown transcriber: "${id}". Available: ${Object.keys(registry).join(', ')}`)
  return t
}

export function listTranscribers(): Transcriber[] {
  return Object.values(registry)
}

export type { Transcriber, TranscribeOpts } from './types'

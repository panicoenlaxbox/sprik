import Groq from 'groq-sdk'
import { createReadStream } from 'fs'
import type { Transcriber, TranscribeOpts } from './types'

export const groqTranscriber: Transcriber = {
  id: 'groq',
  name: 'Groq',
  models: ['whisper-large-v3-turbo', 'whisper-large-v3', 'distil-whisper-large-v3-en'] as const,

  async transcribe(audioPath: string, opts: TranscribeOpts): Promise<string> {
    const client = new Groq({ apiKey: opts.apiKey, maxRetries: 0 })

    const response = await client.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: opts.model,
      ...(opts.language ? { language: opts.language } : {})
    })

    return response.text.trim()
  }
}

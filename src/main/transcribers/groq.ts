import Groq from 'groq-sdk'
import { createReadStream } from 'fs'
import type { Transcriber, TranscribeOpts } from './types'
import { TRANSCRIPTION_PROVIDERS } from '../../renderer/shared/types'

export const groqTranscriber: Transcriber = {
  id: 'groq',
  name: 'Groq',
  models: TRANSCRIPTION_PROVIDERS.groq.models,

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

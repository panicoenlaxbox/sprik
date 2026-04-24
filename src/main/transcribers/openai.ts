import OpenAI from 'openai'
import { createReadStream } from 'fs'
import type { Transcriber, TranscribeOpts } from './types'
import { TRANSCRIPTION_PROVIDERS } from '../../renderer/shared/types'

export const openaiTranscriber: Transcriber = {
  id: 'openai',
  name: 'OpenAI',
  models: TRANSCRIPTION_PROVIDERS.openai.models,

  async transcribe(audioPath: string, opts: TranscribeOpts): Promise<string> {
    const client = new OpenAI({ apiKey: opts.apiKey, maxRetries: 0 })

    const response = await client.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: opts.model,
      ...(opts.language ? { language: opts.language } : {})
    })

    return response.text.trim()
  }
}

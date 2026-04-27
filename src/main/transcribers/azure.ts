import OpenAI from 'openai'
import { createReadStream } from 'fs'
import type { Transcriber, TranscribeOpts } from './types'

export const azureTranscriber: Transcriber = {
  id: 'azure',
  name: 'Microsoft Foundry',
  models: [],

  async transcribe(audioPath: string, opts: TranscribeOpts): Promise<string> {
    if (!opts.endpoint) throw new Error('Azure endpoint is required')
    const base = opts.endpoint.replace(/\/$/, '')
    const client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: `${base}/openai/deployments/${opts.model}/`,
      defaultQuery: { 'api-version': '2024-06-01' },
      maxRetries: 0
    })

    const response = await client.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: opts.model,
      ...(opts.language ? { language: opts.language } : {})
    })

    return response.text.trim()
  }
}

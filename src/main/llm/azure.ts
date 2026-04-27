import OpenAI from 'openai'
import type { PostProcessor, PostProcessOpts } from './types'

export const azureProcessor: PostProcessor = {
  id: 'azure',
  name: 'Microsoft Foundry',
  models: [],

  async process(text: string, opts: PostProcessOpts): Promise<string> {
    if (!opts.endpoint) throw new Error('Azure endpoint is required')
    const base = opts.endpoint.replace(/\/$/, '')
    const client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: `${base}/openai/v1/`,
      maxRetries: 0
    })

    const response = await client.chat.completions.create({
      model: opts.model,
      max_completion_tokens: 1024,
      messages: [
        { role: 'system', content: opts.prompt },
        { role: 'user', content: `<transcription>${text}</transcription>` }
      ]
    })

    return response.choices[0]?.message.content?.trim() ?? text
  }
}

import OpenAI from 'openai'
import type { PostProcessor, PostProcessOpts } from './types'

export const openaiProcessor: PostProcessor = {
  id: 'openai',
  name: 'OpenAI',
  models: ['gpt-4o-mini', 'gpt-4o'] as const,

  async process(text: string, opts: PostProcessOpts): Promise<string> {
    const client = new OpenAI({ apiKey: opts.apiKey, maxRetries: 0 })

    const response = await client.chat.completions.create({
      model: opts.model,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: opts.prompt },
        { role: 'user', content: text }
      ]
    })

    return response.choices[0]?.message.content?.trim() ?? text
  }
}

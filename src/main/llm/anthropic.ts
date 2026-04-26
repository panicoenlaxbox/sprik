import Anthropic from '@anthropic-ai/sdk'
import type { PostProcessor, PostProcessOpts } from './types'

export const anthropicProcessor: PostProcessor = {
  id: 'anthropic',
  name: 'Anthropic',
  models: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5'] as const,

  async process(text: string, opts: PostProcessOpts): Promise<string> {
    const client = new Anthropic({ apiKey: opts.apiKey, maxRetries: 0 })

    const response = await client.messages.create({
      model: opts.model,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: opts.prompt,
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: text }]
    })

    const block = response.content[0]
    return block.type === 'text' ? block.text.trim() : text
  }
}

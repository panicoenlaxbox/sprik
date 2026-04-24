export interface PostProcessOpts {
  apiKey: string
  model: string
  systemPrompt: string
}

export interface PostProcessor {
  id: 'anthropic' | 'openai'
  name: string
  models: readonly string[]
  process(text: string, opts: PostProcessOpts): Promise<string>
}

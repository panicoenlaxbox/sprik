export interface PostProcessOpts {
  apiKey: string
  model: string
  prompt: string
  endpoint?: string
}

export interface PostProcessor {
  id: 'anthropic' | 'openai' | 'azure'
  name: string
  models: readonly string[]
  process(text: string, opts: PostProcessOpts): Promise<string>
}

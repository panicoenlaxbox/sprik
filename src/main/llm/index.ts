import { anthropicProcessor } from './anthropic'
import { openaiProcessor } from './openai'
import type { PostProcessor } from './types'

const registry: Record<string, PostProcessor> = {
  anthropic: anthropicProcessor,
  openai: openaiProcessor
}

export function getPostProcessor(id: string): PostProcessor {
  const p = registry[id]
  if (!p)
    throw new Error(
      `Unknown post-processor: "${id}". Available: ${Object.keys(registry).join(', ')}`
    )
  return p
}

export function listPostProcessors(): PostProcessor[] {
  return Object.values(registry)
}

export type { PostProcessor, PostProcessOpts } from './types'

import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { anthropicProcessor } from './anthropic'

const validOpts = {
  apiKey: 'sk-ant-test',
  model: 'claude-sonnet-4-6',
  prompt: 'Fix punctuation and grammar.'
}

function makeAnthropicResponse(
  text: string,
  cacheReadTokens = 0,
  cacheCreationTokens = 0
): ReturnType<typeof HttpResponse.json> {
  return HttpResponse.json({
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 10,
      output_tokens: 5,
      cache_read_input_tokens: cacheReadTokens,
      cache_creation_input_tokens: cacheCreationTokens
    }
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('anthropicProcessor', () => {
  it('sends user text to /v1/messages and returns trimmed response', async () => {
    const result = await anthropicProcessor.process('hello world', validOpts)
    expect(result).toBe('Post-processed text.')
  })

  it('includes cache_control: ephemeral on the system prompt block', async () => {
    let capturedSystem: unknown = null

    server.use(
      http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
        const body = (await request.json()) as { system: unknown }
        capturedSystem = body.system
        return makeAnthropicResponse('ok', 0, 50)
      })
    )

    await anthropicProcessor.process('hello', validOpts)

    expect(capturedSystem).toEqual([
      {
        type: 'text',
        text: validOpts.prompt,
        cache_control: { type: 'ephemeral' }
      }
    ])
  })

  it('sends cache_control on repeated calls so the server can return cache hits', async () => {
    const capturedSystems: unknown[] = []

    server.use(
      http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
        const body = (await request.json()) as { system: unknown }
        capturedSystems.push(body.system)
        const isSecondCall = capturedSystems.length > 1
        return makeAnthropicResponse('ok', isSecondCall ? 100 : 0, isSecondCall ? 0 : 100)
      })
    )

    await anthropicProcessor.process('first', validOpts)
    await anthropicProcessor.process('second', validOpts)

    expect(capturedSystems).toHaveLength(2)
    for (const sys of capturedSystems) {
      expect(sys).toEqual([expect.objectContaining({ cache_control: { type: 'ephemeral' } })])
    }
  })

  it('sends the model specified in opts', async () => {
    let capturedModel: string | null = null

    server.use(
      http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
        const body = (await request.json()) as { model: string }
        capturedModel = body.model
        return makeAnthropicResponse('ok')
      })
    )

    await anthropicProcessor.process('hi', { ...validOpts, model: 'claude-haiku-4-5-20251001' })

    expect(capturedModel).toBe('claude-haiku-4-5-20251001')
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () =>
        HttpResponse.json(
          { type: 'error', error: { type: 'authentication_error', message: 'Invalid API key.' } },
          { status: 401 }
        )
      )
    )

    await expect(anthropicProcessor.process('hello', validOpts)).rejects.toThrow()
  })

  it('throws on HTTP 529 (overloaded)', async () => {
    server.use(
      http.post('https://api.anthropic.com/v1/messages', () =>
        HttpResponse.json(
          { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded.' } },
          { status: 529 }
        )
      )
    )

    await expect(anthropicProcessor.process('hello', validOpts)).rejects.toThrow()
  })
})

import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { openaiProcessor } from './openai'

const validOpts = {
  apiKey: 'sk-test-key',
  model: 'gpt-4o-mini',
  prompt: 'Fix punctuation and grammar.'
}

function makeChatResponse(content: string): ReturnType<typeof HttpResponse.json> {
  return HttpResponse.json({
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: 1677858242,
    model: 'gpt-4o-mini',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('openaiProcessor', () => {
  it('sends text to /v1/chat/completions and returns trimmed response', async () => {
    const result = await openaiProcessor.process('hello world', validOpts)
    expect(result).toBe('Post-processed text.')
  })

  it('puts the system prompt as a system message', async () => {
    let capturedMessages: unknown = null

    server.use(
      http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
        const body = (await request.json()) as { messages: unknown }
        capturedMessages = body.messages
        return makeChatResponse('ok')
      })
    )

    await openaiProcessor.process('hello', validOpts)

    expect(capturedMessages).toEqual([
      { role: 'system', content: validOpts.prompt },
      { role: 'user', content: '<transcription>hello</transcription>' }
    ])
  })

  it('uses the model specified in opts', async () => {
    let capturedModel: string | null = null

    server.use(
      http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
        const body = (await request.json()) as { model: string }
        capturedModel = body.model
        return makeChatResponse('ok')
      })
    )

    await openaiProcessor.process('hi', { ...validOpts, model: 'gpt-4o' })

    expect(capturedModel).toBe('gpt-4o')
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () =>
        HttpResponse.json({ error: { message: 'Incorrect API key.' } }, { status: 401 })
      )
    )

    await expect(openaiProcessor.process('hello', validOpts)).rejects.toThrow()
  })

  it('throws on HTTP 429 (rate limit)', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () =>
        HttpResponse.json({ error: { message: 'Rate limit exceeded.' } }, { status: 429 })
      )
    )

    await expect(openaiProcessor.process('hello', validOpts)).rejects.toThrow()
  })

  it('returns original text when response content is null', async () => {
    server.use(
      http.post('https://api.openai.com/v1/chat/completions', () =>
        HttpResponse.json({
          id: 'chatcmpl-test',
          object: 'chat.completion',
          created: 1677858242,
          model: 'gpt-4o-mini',
          choices: [
            { index: 0, message: { role: 'assistant', content: null }, finish_reason: 'stop' }
          ],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
        })
      )
    )

    const result = await openaiProcessor.process('original text', validOpts)
    expect(result).toBe('original text')
  })
})

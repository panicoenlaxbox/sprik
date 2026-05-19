import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { azureProcessor } from './azure'

const AZURE_ENDPOINT = 'https://my-azure.example.com'
const validOpts = {
  apiKey: 'azure-test-key',
  model: 'gpt-4o',
  prompt: 'Fix grammar.',
  endpoint: AZURE_ENDPOINT
}

function makeChatResponse(content: string | null): ReturnType<typeof HttpResponse.json> {
  return HttpResponse.json({
    id: 'chatcmpl-azure-test',
    object: 'chat.completion',
    created: 1677858242,
    model: 'gpt-4o',
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

describe('azureProcessor', () => {
  it('sends text to Azure chat completions and returns trimmed response', async () => {
    server.use(
      http.post(`${AZURE_ENDPOINT}/openai/v1/chat/completions`, () =>
        makeChatResponse('  Azure response.  ')
      )
    )

    const result = await azureProcessor.process('hello', validOpts)
    expect(result).toBe('Azure response.')
  })

  it('returns original text when content is null', async () => {
    server.use(
      http.post(`${AZURE_ENDPOINT}/openai/v1/chat/completions`, () => makeChatResponse(null))
    )

    const result = await azureProcessor.process('original text', validOpts)
    expect(result).toBe('original text')
  })

  it('throws when endpoint is missing', async () => {
    const optsWithoutEndpoint = { ...validOpts, endpoint: undefined }
    await expect(azureProcessor.process('hello', optsWithoutEndpoint)).rejects.toThrow(
      'Azure endpoint is required'
    )
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post(`${AZURE_ENDPOINT}/openai/v1/chat/completions`, () =>
        HttpResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
      )
    )

    await expect(azureProcessor.process('hello', validOpts)).rejects.toThrow()
  })

  it('strips trailing slash from endpoint before building URL', async () => {
    let capturedUrl = ''
    server.use(
      http.post(`${AZURE_ENDPOINT}/openai/v1/chat/completions`, ({ request }) => {
        capturedUrl = request.url
        return makeChatResponse('ok')
      })
    )

    await azureProcessor.process('hello', { ...validOpts, endpoint: `${AZURE_ENDPOINT}/` })
    expect(capturedUrl).toContain(`${AZURE_ENDPOINT}/openai/v1/`)
  })
})

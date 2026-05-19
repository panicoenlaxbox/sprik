import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { azureTranscriber } from './azure'

const AZURE_ENDPOINT = 'https://my-azure.example.com'
const MODEL = 'my-whisper'
const testAudioPath = join(tmpdir(), 'sprik-test-azure-audio.webm')
const validOpts = { model: MODEL, apiKey: 'azure-test-key', endpoint: AZURE_ENDPOINT }
const TRANSCRIPTIONS_URL = `${AZURE_ENDPOINT}/openai/deployments/${MODEL}/audio/transcriptions`

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  writeFileSync(testAudioPath, Buffer.from('fake-audio-data'))
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  unlinkSync(testAudioPath)
})

describe('azureTranscriber', () => {
  it('sends audio to Azure transcriptions endpoint and returns trimmed text', async () => {
    server.use(http.post(TRANSCRIPTIONS_URL, () => HttpResponse.json({ text: '  Hello Azure.  ' })))

    const text = await azureTranscriber.transcribe(testAudioPath, validOpts)
    expect(text).toBe('Hello Azure.')
  })

  it('includes the language parameter when provided', async () => {
    let capturedLanguage: FormDataEntryValue | null = null
    server.use(
      http.post(TRANSCRIPTIONS_URL, async ({ request }) => {
        const body = await request.formData()
        capturedLanguage = body.get('language')
        return HttpResponse.json({ text: 'Hola.' })
      })
    )

    await azureTranscriber.transcribe(testAudioPath, { ...validOpts, language: 'es' })
    expect(capturedLanguage).toBe('es')
  })

  it('throws when endpoint is missing', async () => {
    const optsWithoutEndpoint = { ...validOpts, endpoint: undefined }
    await expect(azureTranscriber.transcribe(testAudioPath, optsWithoutEndpoint)).rejects.toThrow(
      'Azure endpoint is required'
    )
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post(TRANSCRIPTIONS_URL, () =>
        HttpResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
      )
    )

    await expect(azureTranscriber.transcribe(testAudioPath, validOpts)).rejects.toThrow()
  })

  it('strips trailing slash from endpoint before building URL', async () => {
    let capturedUrl = ''
    server.use(
      http.post(TRANSCRIPTIONS_URL, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ text: 'ok' })
      })
    )

    await azureTranscriber.transcribe(testAudioPath, {
      ...validOpts,
      endpoint: `${AZURE_ENDPOINT}/`
    })
    expect(capturedUrl).toContain(`${AZURE_ENDPOINT}/openai/deployments/`)
  })
})

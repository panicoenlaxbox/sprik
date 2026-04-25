import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { groqTranscriber } from './groq'

const testAudioPath = join(tmpdir(), 'murmur-test-groq-audio.webm')
const validOpts = { model: 'whisper-large-v3-turbo', apiKey: 'gsk-test-key' }

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  writeFileSync(testAudioPath, Buffer.from('fake-audio-data'))
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  unlinkSync(testAudioPath)
})

describe('groqTranscriber', () => {
  it('sends audio to /openai/v1/audio/transcriptions and returns trimmed text', async () => {
    const text = await groqTranscriber.transcribe(testAudioPath, validOpts)
    expect(text).toBe('Hello, this is a Groq transcription.')
  })

  it('includes the language parameter when provided', async () => {
    let capturedLanguage: FormDataEntryValue | null = null

    server.use(
      http.post('https://api.groq.com/openai/v1/audio/transcriptions', async ({ request }) => {
        const body = await request.formData()
        capturedLanguage = body.get('language')
        return HttpResponse.json({ text: 'Hola.' })
      })
    )

    await groqTranscriber.transcribe(testAudioPath, { ...validOpts, language: 'es' })

    expect(capturedLanguage).toBe('es')
  })

  it('uses the model specified in opts', async () => {
    let capturedModel: FormDataEntryValue | null = null

    server.use(
      http.post('https://api.groq.com/openai/v1/audio/transcriptions', async ({ request }) => {
        const body = await request.formData()
        capturedModel = body.get('model')
        return HttpResponse.json({ text: 'ok' })
      })
    )

    await groqTranscriber.transcribe(testAudioPath, { ...validOpts, model: 'whisper-large-v3' })

    expect(capturedModel).toBe('whisper-large-v3')
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post('https://api.groq.com/openai/v1/audio/transcriptions', () =>
        HttpResponse.json({ error: { message: 'Invalid API Key.' } }, { status: 401 })
      )
    )

    await expect(groqTranscriber.transcribe(testAudioPath, validOpts)).rejects.toThrow()
  })

  it('throws on HTTP 429 (rate limit)', async () => {
    server.use(
      http.post('https://api.groq.com/openai/v1/audio/transcriptions', () =>
        HttpResponse.json({ error: { message: 'Rate limit exceeded.' } }, { status: 429 })
      )
    )

    await expect(groqTranscriber.transcribe(testAudioPath, validOpts)).rejects.toThrow()
  })
})

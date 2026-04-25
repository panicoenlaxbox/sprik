import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server'
import { openaiTranscriber } from './openai'

const testAudioPath = join(tmpdir(), 'sprik-test-audio.webm')
const validOpts = { model: 'gpt-4o-mini-transcribe', apiKey: 'sk-test-key' }

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
  writeFileSync(testAudioPath, Buffer.from('fake-audio-data'))
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  unlinkSync(testAudioPath)
})

describe('openaiTranscriber', () => {
  it('sends audio to /v1/audio/transcriptions and returns trimmed text', async () => {
    const text = await openaiTranscriber.transcribe(testAudioPath, validOpts)
    expect(text).toBe('Hello, this is a test transcription.')
  })

  it('includes the language parameter when provided', async () => {
    let capturedLanguage: FormDataEntryValue | null = null

    server.use(
      http.post('https://api.openai.com/v1/audio/transcriptions', async ({ request }) => {
        const body = await request.formData()
        capturedLanguage = body.get('language')
        return HttpResponse.json({ text: 'Hola mundo.' })
      })
    )

    await openaiTranscriber.transcribe(testAudioPath, { ...validOpts, language: 'es' })

    expect(capturedLanguage).toBe('es')
  })

  it('uses the model specified in opts', async () => {
    let capturedModel: FormDataEntryValue | null = null

    server.use(
      http.post('https://api.openai.com/v1/audio/transcriptions', async ({ request }) => {
        const body = await request.formData()
        capturedModel = body.get('model')
        return HttpResponse.json({ text: 'ok' })
      })
    )

    await openaiTranscriber.transcribe(testAudioPath, { ...validOpts, model: 'whisper-1' })

    expect(capturedModel).toBe('whisper-1')
  })

  it('throws on HTTP 401 (invalid API key)', async () => {
    server.use(
      http.post('https://api.openai.com/v1/audio/transcriptions', () =>
        HttpResponse.json({ error: { message: 'Incorrect API key.' } }, { status: 401 })
      )
    )

    await expect(openaiTranscriber.transcribe(testAudioPath, validOpts)).rejects.toThrow()
  })

  it('throws on HTTP 429 (rate limit)', async () => {
    server.use(
      http.post('https://api.openai.com/v1/audio/transcriptions', () =>
        HttpResponse.json({ error: { message: 'Rate limit exceeded.' } }, { status: 429 })
      )
    )

    await expect(openaiTranscriber.transcribe(testAudioPath, validOpts)).rejects.toThrow()
  })
})

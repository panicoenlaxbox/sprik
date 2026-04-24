import { http, HttpResponse } from 'msw'

export const handlers = [
  http.post('https://api.openai.com/v1/audio/transcriptions', () =>
    HttpResponse.json({ text: 'Hello, this is a test transcription.' })
  ),

  http.post('https://api.groq.com/openai/v1/audio/transcriptions', () =>
    HttpResponse.json({ text: 'Hello, this is a Groq transcription.' })
  ),

  http.post('https://api.anthropic.com/v1/messages', () =>
    HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Post-processed text.' }],
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0
      }
    })
  )
]

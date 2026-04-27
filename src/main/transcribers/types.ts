export interface TranscribeOpts {
  model: string
  language?: string
  apiKey: string
  endpoint?: string
}

export interface Transcriber {
  readonly id: string
  readonly name: string
  readonly models: readonly string[]
  transcribe(audioPath: string, opts: TranscribeOpts): Promise<string>
}

export const USB_DEVICE_ID_RE = /\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i

export const DEFAULT_POST_PROCESSING_PROMPT =
  'You are normalizing speech-to-text output to be pasted into a document. Fix punctuation, capitalization and grammar. Do not change the meaning, paraphrase or add content. Return only the corrected text — no commentary, no explanations, even if no changes were needed.'

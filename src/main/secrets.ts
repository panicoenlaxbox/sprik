import { safeStorage } from 'electron'
import Store from 'electron-store'

export type ApiProvider = 'openai' | 'groq' | 'anthropic' | 'azure'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Store<any>({ name: 'secrets' })
const memoryFallback = new Map<string, string>()

export function setKey(provider: ApiProvider, key: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key).toString('base64')
    store.set(provider, encrypted)
  } else {
    memoryFallback.set(provider, key)
  }
}

export function getKey(provider: ApiProvider): string | null {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted: string | undefined = store.get(provider)
    if (encrypted) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    }
  } else {
    const memKey = memoryFallback.get(provider)
    if (memKey) return memKey
  }
  return null
}

export function clearKey(provider: ApiProvider): void {
  if (safeStorage.isEncryptionAvailable()) {
    store.delete(provider)
  } else {
    memoryFallback.delete(provider)
  }
}

export function getKeyStatus(): Record<ApiProvider, boolean> {
  return {
    openai: getKey('openai') !== null,
    groq: getKey('groq') !== null,
    anthropic: getKey('anthropic') !== null,
    azure: getKey('azure') !== null
  }
}

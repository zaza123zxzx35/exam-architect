/**
 * Conversation context for the study assistant.
 * Persists only lightweight message history (what the user typed in-chat).
 * No account PII is collected.
 */

export const ASSISTANT_STORAGE_KEY = 'kru_assistant_v1'
export const MAX_MESSAGES = 40

export function createEmptyAssistantContext() {
  return {
    schemaVersion: 1,
    messages: [],
    pendingChange: null,
    lastRequest: null,
    lastIntent: null,
    language: 'th',
  }
}

export function sanitizeAssistantContext(raw) {
  const base = createEmptyAssistantContext()
  if (!raw || typeof raw !== 'object') return base
  return {
    schemaVersion: 1,
    messages: Array.isArray(raw.messages)
      ? raw.messages
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
        .slice(-MAX_MESSAGES)
        .map(m => ({
          role: m.role,
          text: String(m.text).slice(0, 4000),
          at: typeof m.at === 'string' ? m.at : undefined,
          intent: m.intent ? String(m.intent) : undefined,
        }))
      : [],
    pendingChange: raw.pendingChange && typeof raw.pendingChange === 'object'
      ? raw.pendingChange
      : null,
    lastRequest: raw.lastRequest && typeof raw.lastRequest === 'object'
      ? raw.lastRequest
      : null,
    lastIntent: raw.lastIntent ? String(raw.lastIntent) : null,
    language: raw.language === 'en' ? 'en' : 'th',
  }
}

export function appendMessage(context, role, text, extra = {}) {
  const next = {
    ...context,
    messages: [
      ...context.messages,
      {
        role,
        text: String(text).slice(0, 4000),
        at: new Date().toISOString(),
        ...extra,
      },
    ].slice(-MAX_MESSAGES),
  }
  return next
}

export function loadAssistantContext(storage) {
  if (!storage) return createEmptyAssistantContext()
  try {
    const raw = storage.getItem(ASSISTANT_STORAGE_KEY)
    if (!raw) return createEmptyAssistantContext()
    return sanitizeAssistantContext(JSON.parse(raw))
  } catch {
    return createEmptyAssistantContext()
  }
}

export function saveAssistantContext(context, storage) {
  if (!storage) return
  // Persist messages + draft request; pendingChange kept so refresh can resume confirm
  const safe = sanitizeAssistantContext(context)
  storage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(safe))
}

export function clearAssistantContext(storage) {
  const empty = createEmptyAssistantContext()
  if (storage) storage.setItem(ASSISTANT_STORAGE_KEY, JSON.stringify(empty))
  return empty
}

/**
 * Server-only OpenAI config. Never imported by React pages.
 * Reads process.env only — no VITE_ secrets.
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const DEFAULT_OPENAI_TIMEOUT_MS = 20_000
export const MAX_USER_MESSAGE_CHARS = 1500
export const MAX_CONTEXT_JSON_CHARS = 24_000
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX_REQUESTS = 20

/**
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 */
export function readOpenAiServerConfig(env = process.env) {
  const apiKey = String(env.OPENAI_API_KEY || '').trim()
  const model = String(env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL
  const timeoutMs = Number(env.OPENAI_TIMEOUT_MS)
  return {
    apiKey: apiKey || null,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs >= 3000 && timeoutMs <= 60_000
      ? timeoutMs
      : DEFAULT_OPENAI_TIMEOUT_MS,
    configured: Boolean(apiKey),
  }
}

/**
 * True if a string looks like it might leak an OpenAI-style secret into a client payload.
 * @param {string} text
 */
export function looksLikeSecretLeak(text) {
  const s = String(text || '')
  if (/sk-[A-Za-z0-9_-]{10,}/.test(s)) return true
  if (/OPENAI_API_KEY\s*=\s*sk-/i.test(s)) return true
  if (/VITE_OPENAI_API_KEY/i.test(s)) return true
  return false
}

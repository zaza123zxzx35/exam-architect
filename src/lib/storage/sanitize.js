/**
 * Treat imported URLs as untrusted. Strip personal query identifiers
 * (e.g. hard-coded u_id from the HTML planner) without logging values.
 */

const SENSITIVE_QUERY_KEYS = new Set([
  'u_id',
  'uid',
  'user_id',
  'userid',
  'token',
  'access_token',
  'api_key',
])

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function sanitizeUrl(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) return null

  try {
    const url = new URL(trimmed)
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key)
      }
    }
    return url.toString()
  } catch {
    return null
  }
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function urlHadSensitiveParams(raw) {
  if (typeof raw !== 'string') return false
  try {
    const url = new URL(raw.trim())
    return [...url.searchParams.keys()].some(key =>
      SENSITIVE_QUERY_KEYS.has(key.toLowerCase())
    )
  } catch {
    return false
  }
}

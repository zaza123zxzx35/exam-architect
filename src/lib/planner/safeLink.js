import { sanitizeUrl } from '../storage/sanitize.js'

/**
 * URL safe for href and on-screen display.
 * Strips personal query keys (e.g. u_id) via sanitizeUrl; preserves quiz `id` and other params.
 * Returns null when the input is missing or not a usable http(s) URL.
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
export function safeResourceUrl(raw) {
  return sanitizeUrl(raw)
}

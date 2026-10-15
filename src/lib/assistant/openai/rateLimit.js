/**
 * Lightweight in-memory rate limiter for serverless / local middleware.
 * Note: each Vercel isolate has its own memory — good enough to blunt bursts,
 * not a global quota store.
 */

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './config.js'

/** @type {Map<string, number[]>} */
const buckets = new Map()

/**
 * @param {string} key
 * @param {{ now?: number, max?: number, windowMs?: number }} [opts]
 * @returns {{ allowed: boolean, remaining: number, retryAfterMs: number }}
 */
export function checkRateLimit(key, opts = {}) {
  const now = opts.now ?? Date.now()
  const max = opts.max ?? RATE_LIMIT_MAX_REQUESTS
  const windowMs = opts.windowMs ?? RATE_LIMIT_WINDOW_MS
  const id = String(key || 'anon').slice(0, 200)
  const prev = (buckets.get(id) || []).filter(ts => now - ts < windowMs)
  if (prev.length >= max) {
    buckets.set(id, prev)
    const oldest = prev[0] || now
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, windowMs - (now - oldest)),
    }
  }
  prev.push(now)
  buckets.set(id, prev)
  return {
    allowed: true,
    remaining: Math.max(0, max - prev.length),
    retryAfterMs: 0,
  }
}

/** Test helper */
export function _resetRateLimitForTests() {
  buckets.clear()
}

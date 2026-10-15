/**
 * Curated resource URL completeness / safety classification.
 * Never invents missing URL segments. Truncated stubs → needs_full_url.
 */

import { sanitizeUrl } from '../storage/sanitize.js'

/**
 * @typedef {'unchecked' | 'openable' | 'verified_accessible' | 'needs_login' | 'needs_full_url' | 'unreachable' | 'awaiting_user'} UrlStatus
 *
 * Compatibility:
 * - `openable` — legacy label for a checked-openable URL
 * - `verified_accessible` — same meaning; requires recorded verification evidence
 *   (method + date). Never assign without proof. Classify-on-read never invents it.
 */

export const URL_STATUS = Object.freeze({
  UNCHECKED: 'unchecked',
  OPENABLE: 'openable',
  VERIFIED_ACCESSIBLE: 'verified_accessible',
  NEEDS_LOGIN: 'needs_login',
  NEEDS_FULL_URL: 'needs_full_url',
  UNREACHABLE: 'unreachable',
  AWAITING_USER: 'awaiting_user',
})

export const URL_STATUS_LABELS_TH = Object.freeze({
  unchecked: 'ยังไม่ตรวจ',
  openable: 'ใช้งานได้ (ตรวจแล้ว · ชื่อเดิม)',
  verified_accessible: 'ยืนยันว่าเปิดได้ (มีหลักฐาน)',
  needs_login: 'ต้องเข้าสู่ระบบ',
  needs_full_url: 'URL ไม่ครบ — ขอลิงก์เต็ม',
  unreachable: 'เปิดไม่ได้',
  awaiting_user: 'รอผู้ใช้ยืนยัน',
})

/**
 * Normalize legacy `openable` ↔ `verified_accessible` for comparisons.
 * @param {unknown} status
 * @returns {UrlStatus | string}
 */
export function normalizeUrlStatus(status) {
  const s = String(status || '')
  if (s === URL_STATUS.OPENABLE) return URL_STATUS.VERIFIED_ACCESSIBLE
  return s
}

/**
 * Whether a status may be treated as verified-open (legacy openable included).
 * @param {unknown} status
 */
export function isVerifiedAccessibleStatus(status) {
  const s = String(status || '')
  return s === URL_STATUS.VERIFIED_ACCESSIBLE || s === URL_STATUS.OPENABLE
}

/**
 * Detect truncated / incomplete URL stubs (Facebook pcb ellipsis, Drive ellipsis, etc.).
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isIncompleteUrl(raw) {
  if (typeof raw !== 'string') return true
  const s = raw.trim()
  if (!s) return true
  if (s.includes('...')) return true
  if (/facebook\.com\/\.\.\./i.test(s)) return true
  if (/drive\.google\.com\/\.\.\./i.test(s)) return true
  if (/\/pcb\.\.\.\//i.test(s)) return true
  // bare stub like https://www.facebook.com/.../pcb.../123
  if (/facebook\.com\/[^?\s]*\.\.\./i.test(s)) return true
  try {
    // eslint-disable-next-line no-new
    new URL(s)
  } catch {
    return true
  }
  return false
}

/**
 * Classify a source URL without network I/O.
 * @param {unknown} raw
 * @returns {{ status: UrlStatus, safeUrl: string | null, reason: string }}
 */
export function classifyResourceUrl(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { status: URL_STATUS.NEEDS_FULL_URL, safeUrl: null, reason: 'empty' }
  }
  const trimmed = raw.trim()
  if (isIncompleteUrl(trimmed)) {
    return { status: URL_STATUS.NEEDS_FULL_URL, safeUrl: null, reason: 'truncated-or-invalid' }
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { status: URL_STATUS.NEEDS_FULL_URL, safeUrl: null, reason: 'non-http' }
  }
  const safe = sanitizeUrl(trimmed)
  if (!safe) {
    return { status: URL_STATUS.UNREACHABLE, safeUrl: null, reason: 'rejected-by-sanitize' }
  }
  // Complete enough to attempt open — not verified live
  return { status: URL_STATUS.UNCHECKED, safeUrl: safe, reason: 'structurally-complete' }
}

/**
 * Whether UI may offer an external open action (never for incomplete stubs).
 * @param {UrlStatus} status
 */
export function canOpenExternally(status) {
  return status === URL_STATUS.UNCHECKED
    || status === URL_STATUS.OPENABLE
    || status === URL_STATUS.VERIFIED_ACCESSIBLE
    || status === URL_STATUS.NEEDS_LOGIN
}

/**
 * Record that a URL was verified accessible. Does not network-check.
 * Callers must supply real method + ISO date from an authorized check.
 * @param {{ method: string, checkedAtIso: string, note?: string }} evidence
 * @returns {{ status: 'verified_accessible', evidence: object } | { status: 'unchecked', reason: string }}
 */
export function markVerifiedAccessible(evidence) {
  const method = String(evidence?.method || '').trim()
  const checkedAtIso = String(evidence?.checkedAtIso || '').trim()
  if (!method || !checkedAtIso) {
    return { status: URL_STATUS.UNCHECKED, reason: 'missing-verification-evidence' }
  }
  return {
    status: URL_STATUS.VERIFIED_ACCESSIBLE,
    evidence: {
      method,
      checkedAtIso,
      note: evidence?.note ? String(evidence.note) : undefined,
    },
  }
}

/**
 * Copy payload: prefer safe URL; for incomplete stubs return the raw stub so user can paste/search.
 * @param {{ url?: string, urlStatus?: UrlStatus, originalUrl?: string }} item
 */
export function copyUrlPayload(item) {
  const raw = String(item?.originalUrl || item?.url || '')
  if (!raw) return ''
  if (item?.urlStatus === URL_STATUS.NEEDS_FULL_URL || isIncompleteUrl(raw)) return raw
  return sanitizeUrl(raw) || raw
}

import { isValidIsoDate, weekdayUtc } from '../schedule/time.js'

const WEEKDAY_KEYS = [
  { weekday: 0, keys: ['อาทิตย์', 'sunday', 'sun'] },
  { weekday: 1, keys: ['จันทร์', 'monday', 'mon'] },
  { weekday: 2, keys: ['อังคาร', 'tuesday', 'tue'] },
  { weekday: 3, keys: ['พุธ', 'wednesday', 'wed'] },
  { weekday: 4, keys: ['พฤหัส', 'thursday', 'thu', 'พฤหัสบดี'] },
  { weekday: 5, keys: ['ศุกร์', 'friday', 'fri'] },
  { weekday: 6, keys: ['เสาร์', 'saturday', 'sat'] },
]

/**
 * Parse relative / absolute dates from Thai or English text.
 * @param {string} text
 * @param {{ todayIso: string, addDays: (iso: string, n: number) => string }} dates
 * @returns {{ iso: string | null, kind: string, ambiguous: boolean }}
 */
export function parseRelativeDate(text, dates) {
  const raw = String(text || '').trim()
  const today = dates.todayIso
  if (!isValidIsoDate(today)) {
    return { iso: null, kind: 'invalid-today', ambiguous: true }
  }

  const isoHit = raw.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (isoHit && isValidIsoDate(isoHit[1])) {
    return { iso: isoHit[1], kind: 'absolute-iso', ambiguous: false }
  }

  if (/วันนี้|today\b/i.test(raw)) {
    return { iso: today, kind: 'today', ambiguous: false }
  }
  if (/พรุ่งนี้|tomorrow\b/i.test(raw)) {
    return { iso: dates.addDays(today, 1), kind: 'tomorrow', ambiguous: false }
  }
  if (/มะรืน|day after tomorrow/i.test(raw)) {
    return { iso: dates.addDays(today, 2), kind: 'day-after-tomorrow', ambiguous: false }
  }

  // next <weekday> / วัน<weekday>หน้า
  for (const row of WEEKDAY_KEYS) {
    const nextRe = new RegExp(`(?:next\\s+|วัน)?(?:${row.keys.join('|')})(?:หน้า|\\s+หน้า)?`, 'i')
    if (!nextRe.test(raw)) continue
    // Prefer explicit "next" / "หน้า"
    const wantsNext = /next|หน้า/i.test(raw)
    const current = weekdayUtc(today)
    let delta = (row.weekday - current + 7) % 7
    if (wantsNext) {
      if (delta === 0) delta = 7
    } else if (delta === 0 && !/วันนี้|today/i.test(raw)) {
      // bare weekday with no "today" → upcoming occurrence; if today matches, treat as today
      delta = 0
    }
    return {
      iso: dates.addDays(today, delta),
      kind: wantsNext ? `next-weekday-${row.weekday}` : `weekday-${row.weekday}`,
      ambiguous: !wantsNext && delta === 0,
    }
  }

  return { iso: null, kind: 'none', ambiguous: false }
}

/**
 * Detect timezone-sensitive boundary: Bangkok calendar date vs UTC date string.
 * Used in tests to document that we always use the provider's todayIso.
 */
export function resolvePlanningDate(text, dates) {
  const parsed = parseRelativeDate(text, dates)
  return parsed.iso || dates.todayIso
}

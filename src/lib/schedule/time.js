/** @param {string} value */
export function normalizeTime(value) {
  if (!value) return null
  const cleaned = String(value).trim().replace('.', ':')
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** Minutes from midnight; null if invalid. Supports end < start as next-day (+24h). */
export function timeToMinutes(value) {
  const t = normalizeTime(value)
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function isValidIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function addDaysIso(isoDate, days) {
  if (!isValidIsoDate(isoDate)) throw new Error(`Invalid date: ${isoDate}`)
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function weekdayUtc(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/**
 * Interval on a given date in minutes from midnight.
 * If end <= start, treat end as next calendar morning (+24h) for overlap math only.
 */
export function sessionInterval(session) {
  if (!isValidIsoDate(session.date)) return null
  const start = timeToMinutes(session.startTime)
  let end = timeToMinutes(session.endTime)
  if (start == null || end == null) return null
  if (end <= start) end += 24 * 60
  if (end - start <= 0) return null
  return { date: session.date, start, end, id: session.id }
}

export function intervalsOverlap(a, b) {
  if (!a || !b) return false
  if (a.date !== b.date) return false
  return a.start < b.end && b.start < a.end
}

/** True if intervals touch at an endpoint but do not overlap interiors. */
export function intervalsAdjacent(a, b) {
  if (!a || !b || a.date !== b.date) return false
  return a.end === b.start || b.end === a.start
}

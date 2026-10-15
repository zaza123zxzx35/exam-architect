/**
 * Live / content-block schedules — clean slate.
 * Will be rebuilt per tutor pack (next: ครูเลดี้เก๋เก๋ English ก+ข).
 */

import { SUBJECT_IDS } from '../lib/study/taxonomy.js'

/** @typedef {'live' | 'content-block' | 'logistics'} LiveEventKind */

/**
 * @typedef {object} LiveTutorEvent
 * @property {string} id
 * @property {LiveEventKind} kind
 * @property {string} date
 * @property {string} [dateEnd]
 * @property {string} [startTime]
 * @property {string} [endTime]
 * @property {number} estimatedMinutes
 * @property {'ก'|'ข'|'mixed'|'admin'} examPart
 * @property {string} subjectId
 * @property {string} titleTh
 * @property {string} seriesTh
 * @property {string} sourceTh
 * @property {number} priorityRank
 * @property {string} reasonTh
 * @property {string[]} tags
 */

export const LIVE_PRIORITY = Object.freeze({
  PART_B_MAJOR: 10,
  PART_B_EDUCATION: 20,
  PART_B_LAW: 30,
  PART_A_ENGLISH: 40,
  PART_A_CIVIL: 45,
  PART_A_HOWL_PAST: 50,
  PART_A_THAI: 55,
  PART_A_MATH: 60,
  LOGISTICS: 90,
})

export const CIVIL_SERVANT_A = 'civil-servant-a'

/** @type {ReadonlyArray<LiveTutorEvent>} */
export const LIVE_TUTOR_EVENTS = Object.freeze([])

export const LIVE_TUTOR_SCHEDULE_VERSION = '2.0-clean-slate'

/**
 * @param {LiveTutorEvent} event
 */
export function expandLiveEventDates(event) {
  const start = event.date
  const end = event.dateEnd || event.date
  const out = []
  const cursor = new Date(`${start}T12:00:00+07:00`)
  const last = new Date(`${end}T12:00:00+07:00`)
  while (cursor <= last) {
    const plannedDate = cursor.toISOString().slice(0, 10)
    out.push({ ...event, plannedDate })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/**
 * @param {string} [fromIso]
 * @param {{ includePast?: boolean, kinds?: LiveEventKind[] }} [options]
 */
export function listLiveTutorEvents(fromIso, options = {}) {
  const includePast = options.includePast === true
  const kinds = options.kinds
  return LIVE_TUTOR_EVENTS.filter(e => {
    if (kinds && !kinds.includes(e.kind)) return false
    if (!includePast && fromIso) {
      const end = e.dateEnd || e.date
      if (end < fromIso) return false
    }
    return true
  }).sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return String(a.startTime || '').localeCompare(String(b.startTime || ''))
      || a.id.localeCompare(b.id)
  })
}

/**
 * @param {string} dateIso
 */
export function subjectFocusForDate(dateIso) {
  const hits = []
  for (const e of LIVE_TUTOR_EVENTS) {
    if (e.kind === 'logistics') continue
    const end = e.dateEnd || e.date
    if (dateIso < e.date || dateIso > end) continue
    hits.push(e)
  }
  hits.sort((a, b) => a.priorityRank - b.priorityRank || a.id.localeCompare(b.id))
  return hits[0] || null
}

// Re-export SUBJECT_IDS usage guard for importers that expect the symbol.
void SUBJECT_IDS

/**
 * Live / content-block schedules.
 * v3.0 — ครูเลดี้เก๋เก๋ English ก+ข from VIP flyer (สพฐ. 69).
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

/**
 * Dates from flyer «ตารางติวพาบรรจุ สพฐ. 69» · VIP Group ครูเลดี้เก๋เก๋
 * (พุทธศักราช 2569 → ค.ศ. 2026). No invented join links.
 *
 * @type {ReadonlyArray<LiveTutorEvent>}
 */
export const LIVE_TUTOR_EVENTS = Object.freeze([
  // —— ภาค ก แหกโค้ง 21:00–22:30 ——
  {
    id: 'lady-live-a-haek-2026-09-26',
    kind: 'live',
    date: '2026-09-26',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-07',
    kind: 'live',
    date: '2026-10-07',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-21',
    kind: 'live',
    date: '2026-10-21',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  // —— ภาค ข วิชาเอก 22:30–00:00 (same nights) ——
  {
    id: 'lady-live-b-major-2026-09-26',
    kind: 'live',
    date: '2026-09-26',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-07',
    kind: 'live',
    date: '2026-10-07',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-21',
    kind: 'live',
    date: '2026-10-21',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
])

export const LIVE_TUTOR_SCHEDULE_VERSION = '3.0-lady-kaekae-flyer'

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

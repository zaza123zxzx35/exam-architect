import { getExams, getPrimaryExam } from '../../data/examCalendar.js'
import { DEFAULT_AVAILABILITY } from '../schedule/constants.js'
import { isValidIsoDate, normalizeTime } from '../schedule/time.js'
import { createEmptyPlannerRequest, validatePlannerRequest } from './schema.js'
import { subjectIdsFromText } from './subjects.js'

const WEEKDAY_MAP = [
  { weekday: 0, keys: ['อาทิตย์', 'sunday', 'sun'] },
  { weekday: 1, keys: ['จันทร์', 'monday', 'mon'] },
  { weekday: 2, keys: ['อังคาร', 'tuesday', 'tue'] },
  { weekday: 3, keys: ['พุธ', 'wednesday', 'wed'] },
  { weekday: 4, keys: ['พฤหัส', 'thursday', 'thu'] },
  { weekday: 5, keys: ['ศุกร์', 'friday', 'fri'] },
  { weekday: 6, keys: ['เสาร์', 'saturday', 'sat'] },
]

function parseIsoDates(text) {
  const matches = String(text).match(/\b(20\d{2}-\d{2}-\d{2})\b/g) || []
  return matches.filter(isValidIsoDate)
}

function parseThaiBeDate(text) {
  // e.g. 14 พ.ย. 2569 / 14 พฤศจิกายน 2569
  const months = {
    'ม.ค': 1, มกราคม: 1,
    'ก.พ': 2, กุมภาพันธ์: 2,
    'มี.ค': 3, มีนาคม: 3,
    'เม.ย': 4, เมษายน: 4,
    'พ.ค': 5, พฤษภาคม: 5,
    'มิ.ย': 6, มิถุนายน: 6,
    'ก.ค': 7, กรกฎาคม: 7,
    'ส.ค': 8, สิงหาคม: 8,
    'ก.ย': 9, กันยายน: 9,
    'ต.ค': 10, ตุลาคม: 10,
    'พ.ย': 11, พฤศจิกายน: 11,
    'ธ.ค': 12, ธันวาคม: 12,
  }
  const re = /(\d{1,2})\s*(ม\.ค|ก\.พ|มี\.ค|เม\.ย|พ\.ค|มิ\.ย|ก\.ค|ส\.ค|ก\.ย|ต\.ค|พ\.ย|ธ\.ค|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\.?\s*(\d{4})/g
  const out = []
  let match
  while ((match = re.exec(text)) != null) {
    const day = Number(match[1])
    const month = months[match[2]]
    let year = Number(match[3])
    if (year > 2400) year -= 543
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (isValidIsoDate(iso)) out.push(iso)
  }
  return out
}

function parseSessionMinutes(text) {
  const m = String(text).match(/(\d{1,3})\s*(นาที|min|mins|minutes)/i)
  if (!m) {
    if (/1\.5\s*ชม|1\.5\s*ชั่วโมง|ชั่วโมงครึ่ง/i.test(text)) return 90
    if (/2\s*ชม|2\s*ชั่วโมง/i.test(text)) return 120
    if (/1\s*ชม|1\s*ชั่วโมง|ชั่วโมงละ/i.test(text)) return 60
    return null
  }
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseDailyLimit(text) {
  const hours = String(text).match(/(?:ไม่เกิน|สูงสุด|limit)\s*(\d+(?:\.\d+)?)\s*(ชม|ชั่วโมง|h|hr)/i)
  if (hours) return Math.round(Number(hours[1]) * 60)
  const mins = String(text).match(/(?:ไม่เกิน|สูงสุด|limit)\s*(\d{2,3})\s*(นาที|min)/i)
  if (mins) return Number(mins[1])
  return null
}

function parseAvailabilityFromText(text) {
  const lower = String(text)
  const weekdays = []
  for (const row of WEEKDAY_MAP) {
    if (row.keys.some(k => lower.toLowerCase().includes(k.toLowerCase()))) {
      weekdays.push(row.weekday)
    }
  }

  if (/วันธรรมดา|weekday|จ\.?-ศ|จันทร์ถึงศุกร์|จันทร์-ศุกร์/i.test(lower)) {
    weekdays.push(1, 2, 3, 4, 5)
  }
  if (/เสาร์อาทิตย์|weekend|เสาร์-อาทิตย์/i.test(lower)) {
    weekdays.push(0, 6)
  }
  if (/ทุกวัน|every day|daily/i.test(lower)) {
    weekdays.push(0, 1, 2, 3, 4, 5, 6)
  }

  const uniqueDays = [...new Set(weekdays)]
  const timeMatches = [...lower.matchAll(/(\d{1,2})[:.](\d{2})\s*[-–ถึง]\s*(\d{1,2})[:.](\d{2})/g)]
  const windows = []
  for (const tm of timeMatches) {
    const startTime = normalizeTime(`${tm[1]}:${tm[2]}`)
    const endTime = normalizeTime(`${tm[3]}:${tm[4]}`)
    if (!startTime || !endTime) continue
    for (const weekday of (uniqueDays.length ? uniqueDays : [1, 2, 3, 4, 5])) {
      windows.push({ weekday, startTime, endTime })
    }
  }

  if (!windows.length && uniqueDays.length) {
    // Default evening window when days mentioned without times
    for (const weekday of uniqueDays) {
      windows.push({ weekday, startTime: '20:00', endTime: '22:00' })
    }
  }

  return windows
}

function resolveExamFromText(text) {
  const exams = getExams()
  if (/ภาค\s*ข|part\s*b/i.test(text)) {
    return exams.find(e => e.part === 'ข') || null
  }
  if (/ภาค\s*ก|part\s*a/i.test(text)) {
    return exams.find(e => e.part === 'ก') || getPrimaryExam()
  }
  const dates = [...parseIsoDates(text), ...parseThaiBeDate(text)]
  if (dates.length) {
    const date = dates[0]
    const hit = exams.find(e => String(e.startsAt).slice(0, 10) === date)
    return hit || { id: null, startsAt: `${date}T09:00:00+07:00` }
  }
  return null
}

function parsePriority(text) {
  if (/สำคัญมาก|เร่งด่วน|high priority|ด่วน/i.test(text)) return 'high'
  if (/สำคัญน้อย|low priority|ไม่เร่ง/i.test(text)) return 'low'
  return null
}

/**
 * Deterministic natural-language → structured planner request.
 * No LLM. Partial information is allowed; clarifying questions come from validate.
 *
 * @param {string} text
 * @param {{ defaults?: object, todayIso?: string }} [options]
 */
export function interpretNaturalLanguage(text, options = {}) {
  const rawText = String(text || '').trim()
  const defaults = options.defaults || createEmptyPlannerRequest()
  const notes = []

  if (!rawText) {
    const empty = validatePlannerRequest({
      ...defaults,
      naturalLanguage: '',
    })
    return {
      ...empty,
      interpretationNotes: ['empty-input'],
      mode: 'deterministic-nl',
    }
  }

  const exam = resolveExamFromText(rawText)
  const subjects = subjectIdsFromText(rawText)
  const availability = parseAvailabilityFromText(rawText)
  const sessionMinutes = parseSessionMinutes(rawText)
  const dailyLimitMinutes = parseDailyLimit(rawText)
  const priority = parsePriority(rawText)

  // Topics: keep short noun phrases after "ติว/เรียน/ทบทวน"
  const topicMatch = rawText.match(/(?:ติว|เรียน|ทบทวน|โฟกัส)\s+([^,.，。\n]+)/i)
  const topics = topicMatch
    ? [topicMatch[1].trim()].filter(t => t.length >= 2 && t.length <= 80)
    : []

  if (!exam) notes.push('exam-not-detected')
  if (!subjects.length) notes.push('subjects-not-detected')
  if (!availability.length) notes.push('availability-not-detected')

  const draft = {
    ...defaults,
    naturalLanguage: rawText,
    examId: exam?.id || defaults.examId || null,
    examDate: exam
      ? String(exam.startsAt).slice(0, 10)
      : defaults.examDate,
    subjects: subjects.length ? subjects : defaults.subjects,
    topics: topics.length ? topics : defaults.topics,
    availability: availability.length ? availability : defaults.availability,
    sessionMinutes: sessionMinutes ?? defaults.sessionMinutes ?? 60,
    breakMinutes: defaults.breakMinutes ?? 10,
    priority: priority || defaults.priority || 'med',
    dailyLimitMinutes: dailyLimitMinutes ?? defaults.dailyLimitMinutes ?? null,
    includeExistingUnfinished: defaults.includeExistingUnfinished !== false,
    startDate: defaults.startDate || options.todayIso || null,
  }

  const validated = validatePlannerRequest(draft)
  return {
    ...validated,
    interpretationNotes: notes,
    mode: 'deterministic-nl',
  }
}

/**
 * Merge form fields over an interpreted draft, then validate.
 */
export function buildRequestFromForm(form, options = {}) {
  const base = createEmptyPlannerRequest({
    ...form,
    startDate: form.startDate || options.todayIso || null,
  })
  return validatePlannerRequest(base)
}

export function defaultAvailabilityPreset() {
  return DEFAULT_AVAILABILITY.map(w => ({ ...w }))
}

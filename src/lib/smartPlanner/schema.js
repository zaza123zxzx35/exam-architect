import { isValidIsoDate, normalizeTime } from '../schedule/time.js'
import { PLANNER_SUBJECTS } from './subjects.js'

export const PLANNER_REQUEST_SCHEMA_VERSION = 1

const ALLOWED_KEYS = new Set([
  'schemaVersion',
  'naturalLanguage',
  'examId',
  'examDate',
  'subjects',
  'topics',
  'startDate',
  'endDate',
  'availability',
  'sessionMinutes',
  'breakMinutes',
  'priority',
  'dailyLimitMinutes',
  'resourceIds',
  'includeExistingUnfinished',
  'targetSessionCount',
])

const SUBJECT_IDS = new Set(PLANNER_SUBJECTS.map(s => s.id))

export function createEmptyPlannerRequest(overrides = {}) {
  return {
    schemaVersion: PLANNER_REQUEST_SCHEMA_VERSION,
    naturalLanguage: '',
    examId: null,
    examDate: null,
    subjects: [],
    topics: [],
    startDate: null,
    endDate: null,
    availability: [],
    sessionMinutes: 60,
    breakMinutes: 10,
    priority: 'med',
    dailyLimitMinutes: null,
    resourceIds: [],
    includeExistingUnfinished: true,
    targetSessionCount: null,
    ...overrides,
  }
}

function isAvailabilityWindow(value) {
  if (!value || typeof value !== 'object') return false
  const weekday = Number(value.weekday)
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return false
  if (!normalizeTime(value.startTime) || !normalizeTime(value.endTime)) return false
  return true
}

/**
 * Strict validation for planner requests.
 * Rejects unknown fields and unsupported values.
 */
export function validatePlannerRequest(raw) {
  const errors = []
  const warnings = []
  const clarifyingQuestions = []

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      value: null,
      errors: ['request-must-be-object'],
      warnings,
      clarifyingQuestions: ['กรุณาระบุข้อมูลแผน เช่น วันสอบ และเวลาว่าง'],
    }
  }

  const unknown = Object.keys(raw).filter(k => !ALLOWED_KEYS.has(k))
  if (unknown.length) {
    errors.push(`unsupported-fields:${unknown.sort().join(',')}`)
  }

  if (raw.schemaVersion != null && Number(raw.schemaVersion) !== PLANNER_REQUEST_SCHEMA_VERSION) {
    errors.push('unsupported-schema-version')
  }

  const subjects = Array.isArray(raw.subjects) ? raw.subjects.map(String) : []
  for (const id of subjects) {
    if (!SUBJECT_IDS.has(id)) errors.push(`unknown-subject:${id}`)
  }

  const priority = raw.priority == null ? 'med' : String(raw.priority)
  if (!['high', 'med', 'low'].includes(priority)) errors.push('invalid-priority')

  const sessionMinutes = raw.sessionMinutes == null ? 60 : Number(raw.sessionMinutes)
  if (!Number.isFinite(sessionMinutes) || sessionMinutes < 15 || sessionMinutes > 180) {
    errors.push('invalid-session-minutes')
  }

  const breakMinutes = raw.breakMinutes == null ? 10 : Number(raw.breakMinutes)
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || breakMinutes > 60) {
    errors.push('invalid-break-minutes')
  }

  let dailyLimitMinutes = null
  if (raw.dailyLimitMinutes != null && raw.dailyLimitMinutes !== '') {
    dailyLimitMinutes = Number(raw.dailyLimitMinutes)
    if (!Number.isFinite(dailyLimitMinutes) || dailyLimitMinutes < 30 || dailyLimitMinutes > 12 * 60) {
      errors.push('invalid-daily-limit')
    }
  }

  let targetSessionCount = null
  if (raw.targetSessionCount != null && raw.targetSessionCount !== '') {
    targetSessionCount = Number(raw.targetSessionCount)
    if (!Number.isInteger(targetSessionCount) || targetSessionCount < 1 || targetSessionCount > 40) {
      errors.push('invalid-target-session-count')
    }
  }

  const examDate = raw.examDate == null || raw.examDate === ''
    ? null
    : String(raw.examDate)
  if (examDate && !isValidIsoDate(examDate)) errors.push('invalid-exam-date')

  const startDate = raw.startDate == null || raw.startDate === ''
    ? null
    : String(raw.startDate)
  if (startDate && !isValidIsoDate(startDate)) errors.push('invalid-start-date')

  const endDate = raw.endDate == null || raw.endDate === ''
    ? null
    : String(raw.endDate)
  if (endDate && !isValidIsoDate(endDate)) errors.push('invalid-end-date')

  const availability = Array.isArray(raw.availability) ? raw.availability : []
  for (let i = 0; i < availability.length; i += 1) {
    if (!isAvailabilityWindow(availability[i])) {
      errors.push(`invalid-availability[${i}]`)
    }
  }

  const topics = Array.isArray(raw.topics)
    ? raw.topics.map(t => String(t).trim()).filter(Boolean).slice(0, 20)
    : []

  const resourceIds = Array.isArray(raw.resourceIds)
    ? raw.resourceIds.map(String)
    : []

  if (!examDate && !raw.examId) {
    clarifyingQuestions.push('ยังไม่มีวันสอบ — เลือกวันสอบภาค ก/ข หรือระบุวันที่เอง')
  }
  if (!availability.length) {
    clarifyingQuestions.push('ยังไม่มีช่วงเวลาว่าง — ระบุวันและช่วงเวลาที่เรียนได้')
  }
  if (!subjects.length && !topics.length) {
    clarifyingQuestions.push('ยังไม่มีวิชา/หัวข้อ — เลือกวิชา หรือพิมพ์หัวข้อที่ต้องการติว')
  }

  const value = {
    schemaVersion: PLANNER_REQUEST_SCHEMA_VERSION,
    naturalLanguage: raw.naturalLanguage == null ? '' : String(raw.naturalLanguage).slice(0, 2000),
    examId: raw.examId ? String(raw.examId) : null,
    examDate,
    subjects: [...new Set(subjects.filter(id => SUBJECT_IDS.has(id)))],
    topics,
    startDate,
    endDate,
    availability: availability
      .filter(isAvailabilityWindow)
      .map(w => ({
        weekday: Number(w.weekday),
        startTime: normalizeTime(w.startTime),
        endTime: normalizeTime(w.endTime),
      })),
    sessionMinutes,
    breakMinutes,
    priority,
    dailyLimitMinutes,
    resourceIds,
    includeExistingUnfinished: raw.includeExistingUnfinished !== false,
    targetSessionCount,
  }

  // Essential for generating a plan: exam date (or id resolved later) + availability
  const missingEssentials = clarifyingQuestions.length > 0 && (
    !value.examDate && !value.examId || !value.availability.length
  )

  return {
    ok: errors.length === 0 && !missingEssentials,
    value,
    errors,
    warnings,
    clarifyingQuestions,
  }
}

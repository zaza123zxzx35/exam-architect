import { EXAMS } from '../../data/examCalendar.js'
import { ENGINE_VERSION, SCHEMA_VERSION } from './constants.js'

/** @returns {Record<string, unknown>} */
export function createEmptyStore() {
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    profile: {
      id: createId('user'),
      displayName: undefined,
      createdAt: now,
      authProvider: 'local',
    },
    exams: EXAMS.map(exam => ({
      id: exam.id,
      title: exam.title,
      part: exam.part,
      startsAt: exam.startsAt,
      totalScore: exam.totalScore,
      weight: exam.weight,
    })),
    subjects: [
      { id: 'general-a', name: 'ภาค ก รวม', examPart: 'ก' },
      { id: 'english-major', name: 'วิชาเอกภาษาอังกฤษ', examPart: 'ข' },
      { id: 'education', name: 'วิชาการศึกษา', examPart: 'ข' },
    ],
    phases: [],
    topics: [],
    tasks: [],
    sessions: [],
    videos: [],
    videoProgress: {},
    notes: [],
    examAttempts: [],
    prefs: {
      theme: 'light',
      timezone: 'Asia/Bangkok',
      defaultSessionMinutes: 60,
      defaultBreakMinutes: 10,
      studyWindows: [
        { weekday: 1, startTime: '13:30', endTime: '15:00' },
        { weekday: 2, startTime: '13:30', endTime: '15:00' },
        { weekday: 3, startTime: '13:30', endTime: '15:00' },
        { weekday: 4, startTime: '13:30', endTime: '15:00' },
        { weekday: 5, startTime: '13:30', endTime: '15:00' },
        { weekday: 0, startTime: '09:00', endTime: '12:00' },
        { weekday: 6, startTime: '09:00', endTime: '12:00' },
        { weekday: 1, startTime: '20:00', endTime: '22:00' },
        { weekday: 2, startTime: '20:00', endTime: '22:00' },
        { weekday: 3, startTime: '20:00', endTime: '22:00' },
        { weekday: 4, startTime: '20:00', endTime: '22:00' },
        { weekday: 5, startTime: '20:00', endTime: '22:00' },
      ],
    },
    scheduleMeta: {
      engineVersion: ENGINE_VERSION,
      unresolvedConflicts: [],
    },
    legacy: {
      studyPlan: null,
      planProgress: null,
      mockExams: null,
      timetable: null,
      quizzes: null,
      quizResults: null,
      competitionRates: null,
    },
  }
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Lightweight structural check — not a full Zod port (M5 adds strict NL schema).
 * @param {unknown} value
 */
export function isUnifiedStore(value) {
  if (!value || typeof value !== 'object') return false
  const store = /** @type {Record<string, unknown>} */ (value)
  return (
    store.schemaVersion === SCHEMA_VERSION
    && store.profile
    && typeof store.profile === 'object'
    && Array.isArray(store.exams)
    && Array.isArray(store.tasks)
    && Array.isArray(store.sessions)
    && Array.isArray(store.videos)
    && store.videoProgress
    && typeof store.videoProgress === 'object'
    && store.prefs
    && typeof store.prefs === 'object'
  )
}

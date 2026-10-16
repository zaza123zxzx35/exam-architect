import {
  LEGACY_HTML_KEY,
  LEGACY_TIMETABLE_KEY,
  SCHEDULE_KEY,
  SCHEDULE_ENGINE_VERSION,
  SCHEDULE_SCHEMA_VERSION,
} from './constants.js'
import {
  buildTasksFromHtmlPlan,
  createEmptySchedule,
  isScheduleStore,
  sessionsFromTimetableDays,
  timetableDaysFromSessions,
} from './model.js'
import { scheduleToHtmlPlannerState } from './progress.js'
import { isValidIsoDate } from './time.js'

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function readJson(storage, key) {
  const raw = storage.getItem(key)
  if (raw == null) return { present: false, value: null }
  return { present: true, value: safeParse(raw) }
}

/**
 * Meta keys that are safe/meaningful to persist through sanitize → saveSchedule.
 * Anything else (debug leftovers, accidental React state, prototype junk) is dropped.
 */
const SCHEDULE_META_ALLOWLIST = new Set([
  'engineVersion',
  'migratedFrom',
  'taskCountSeed',
  'sessionCountSeed',
  'recoveredAt',
  'victoryPlanClearedAt',
  'victoryPlanSeededAt',
  'victoryPlan',
  'curatedPartB29SeededAt',
  'curatedPlanSeedVersion',
  'curatedPlanSeedTodayIso',
  'curatedPlanSeedTaskCount',
  'curatedPlanSeedPartBOk',
  'curatedPlanVictoryScore',
])

/**
 * Copy only allowlisted, JSON-serializable schedule meta.
 * @param {object} rawMeta
 */
function pickPersistedMeta(rawMeta) {
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const key of SCHEDULE_META_ALLOWLIST) {
    if (!Object.prototype.hasOwnProperty.call(rawMeta, key)) continue
    const value = rawMeta[key]
    if (value === undefined) continue
    if (typeof value === 'function' || typeof value === 'symbol') continue
    if (key === 'migratedFrom') {
      if (Array.isArray(value)) {
        out[key] = value.filter((item) => typeof item === 'string')
      }
      continue
    }
    if (key === 'victoryPlan') {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const effort = value.effort
        out[key] = {
          ...value,
          effort: effort && typeof effort === 'object' && !Array.isArray(effort)
            ? { ...effort }
            : {},
        }
      }
      continue
    }
    if (
      typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
      || value === null
    ) {
      out[key] = value
    }
  }
  return out
}

function applyHtmlCompletions(tasks, daysMap) {
  if (!daysMap || typeof daysMap !== 'object') return tasks
  return tasks.map(task => {
    const match = String(task.id).match(/^html_(\d{4}-\d{2}-\d{2})_(\d+)$/)
    if (!match) return task
    const dateIso = match[1]
    const index = match[2]
    const day = daysMap[dateIso]
    if (!day || typeof day !== 'object') return task
    const done = Boolean(day[index] ?? day[Number(index)])
    if (!done) return task
    return {
      ...task,
      status: 'done',
      completedAt: task.completedAt || new Date().toISOString(),
    }
  })
}

function mergeHtmlTasks(existingTasks, seededTasks) {
  const byId = new Map()
  for (const task of existingTasks) {
    if (task?.id) byId.set(String(task.id), { ...task })
  }
  for (const seed of seededTasks) {
    const prev = byId.get(seed.id)
    if (!prev) {
      byId.set(seed.id, { ...seed })
      continue
    }
    // Preserve completion + reschedule history; refresh canonical plan fields.
    byId.set(seed.id, {
      ...seed,
      status: prev.status === 'done' || prev.status === 'deferred' ? prev.status : seed.status,
      completedAt: prev.completedAt,
      plannedDate: prev.plannedDate || seed.plannedDate,
      originalPlannedDate: prev.originalPlannedDate || seed.originalPlannedDate,
      rescheduleHistory: Array.isArray(prev.rescheduleHistory) ? prev.rescheduleHistory : [],
    })
  }
  // Keep non-html tasks (e.g. split parts, user-created) that are not in seed.
  for (const task of existingTasks) {
    if (!task?.id) continue
    if (String(task.id).startsWith('html_') && !seededTasks.some(s => s.id === task.id)) {
      // Orphan html ids (plan shortened?) — keep for recovery, never drop silently.
      if (!byId.has(task.id)) byId.set(task.id, { ...task })
    }
    if (!String(task.id).startsWith('html_') && !byId.has(task.id)) {
      byId.set(task.id, { ...task })
    }
  }
  return [...byId.values()]
}

function sanitizeTask(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id ? String(raw.id) : `recovered_task_${index}`
  const status = ['pending', 'done', 'deferred', 'cancelled'].includes(raw.status)
    ? raw.status
    : 'pending'
  // Prefer schema durationMinutes; fall back to curated estimatedMinutes (same meaning).
  const durationFromSchema = Number(raw.durationMinutes)
  const durationFromCurated = Number(raw.estimatedMinutes)
  const durationMinutes = Number.isFinite(durationFromSchema) && durationFromSchema > 0
    ? durationFromSchema
    : Number.isFinite(durationFromCurated) && durationFromCurated > 0
      ? durationFromCurated
      : 45
  const task = {
    id,
    title: String(raw.title || 'Untitled task'),
    type: raw.type ? String(raw.type) : 'study',
    subjectId: raw.subjectId,
    topicId: raw.topicId,
    resourceUrl: raw.resourceUrl ? String(raw.resourceUrl) : undefined,
    priority: ['high', 'med', 'low'].includes(raw.priority) ? raw.priority : 'med',
    plannedDate: isValidIsoDate(raw.plannedDate) ? raw.plannedDate : undefined,
    originalPlannedDate: isValidIsoDate(raw.originalPlannedDate) ? raw.originalPlannedDate : undefined,
    durationMinutes,
    deadline: isValidIsoDate(raw.deadline) ? raw.deadline : undefined,
    examId: raw.examId ? String(raw.examId) : undefined,
    status,
    completedAt: status === 'done' ? (raw.completedAt || new Date().toISOString()) : undefined,
    origin: raw.origin ? String(raw.origin) : 'recovered',
    dayIndex: Number.isFinite(Number(raw.dayIndex)) ? Number(raw.dayIndex) : undefined,
    taskIndex: Number.isFinite(Number(raw.taskIndex)) ? Number(raw.taskIndex) : undefined,
    parentTaskId: raw.parentTaskId ? String(raw.parentTaskId) : undefined,
    rescheduleHistory: Array.isArray(raw.rescheduleHistory) ? raw.rescheduleHistory : [],
  }
  // Preserve curated / user-edit markers without a full schema bump.
  if (raw.userEdited) task.userEdited = true
  if (raw.resourceId != null) task.resourceId = String(raw.resourceId)
  if (raw.urlStatus != null) task.urlStatus = String(raw.urlStatus)
  if (raw.examPart != null) task.examPart = String(raw.examPart)
  if (raw.durationIsEstimate) task.durationIsEstimate = true
  if (Number.isFinite(durationFromCurated) && durationFromCurated > 0) {
    task.estimatedMinutes = durationFromCurated
  } else if (task.durationIsEstimate) {
    task.estimatedMinutes = durationMinutes
  }
  return task
}

function sanitizeSession(raw, index) {
  if (!raw || typeof raw !== 'object') return null
  if (!isValidIsoDate(raw.date)) return null
  const id = raw.id ? String(raw.id) : `recovered_sess_${index}`
  const status = ['planned', 'done', 'cancelled'].includes(raw.status) ? raw.status : 'planned'
  return {
    id,
    date: raw.date,
    startTime: raw.startTime ? String(raw.startTime) : '00:00',
    endTime: raw.endTime ? String(raw.endTime) : '00:30',
    zone: raw.zone ? String(raw.zone) : 'other',
    title: String(raw.title || 'Untitled session'),
    note: raw.note ? String(raw.note) : undefined,
    taskIds: Array.isArray(raw.taskIds) ? raw.taskIds.map(String) : [],
    resourceUrl: raw.resourceUrl ? String(raw.resourceUrl) : undefined,
    resourceExternal: Boolean(raw.resourceExternal),
    status,
    origin: raw.origin ? String(raw.origin) : 'recovered',
    locked: Boolean(raw.locked),
    dayLabel: raw.dayLabel,
    dayTag: raw.dayTag,
    timetableDayId: raw.timetableDayId,
  }
}

/**
 * Recover a usable schedule from malformed / partial data.
 * Never throws; always returns a valid store shape.
 */
export function sanitizeSchedule(raw) {
  const base = createEmptySchedule()
  if (!raw || typeof raw !== 'object') {
    return { schedule: base, recovered: true, reason: 'not-object' }
  }

  const tasksIn = Array.isArray(raw.tasks) ? raw.tasks : []
  const sessionsIn = Array.isArray(raw.sessions) ? raw.sessions : []
  const notesIn = raw.notes && typeof raw.notes === 'object' && !Array.isArray(raw.notes)
    ? raw.notes
    : {}

  const tasks = tasksIn.map(sanitizeTask).filter(Boolean)
  const sessions = sessionsIn
    .map(sanitizeSession)
    .filter(Boolean)
    .filter(s => isValidIsoDate(s.date))

  // Preserve allowlisted app meta (victory clear/seed flags, curated stamps, effort).
  // saveSchedule always sanitizes — a previous whitelist-of-none wiped
  // victoryPlanClearedAt and caused clear→refresh to soft-reseed.
  const rawMeta = raw.meta && typeof raw.meta === 'object' && !Array.isArray(raw.meta)
    ? raw.meta
    : {}
  const preservedMeta = pickPersistedMeta(rawMeta)

  const recovered = !isScheduleStore(raw)
    || tasksIn.length !== tasks.length
    || sessionsIn.length !== sessions.length

  const meta = {
    ...preservedMeta,
    engineVersion: SCHEDULE_ENGINE_VERSION,
    migratedFrom: Array.isArray(preservedMeta.migratedFrom)
      ? preservedMeta.migratedFrom
      : ['sanitized'],
    taskCountSeed: Number(preservedMeta.taskCountSeed) || tasks.length,
    sessionCountSeed: Number(preservedMeta.sessionCountSeed) || sessions.length,
  }
  if (recovered) {
    meta.recoveredAt = new Date().toISOString()
  } else if (typeof preservedMeta.recoveredAt === 'string') {
    meta.recoveredAt = preservedMeta.recoveredAt
  } else {
    delete meta.recoveredAt
  }

  const schedule = {
    ...base,
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    tasks,
    sessions,
    notes: Object.fromEntries(
      Object.entries(notesIn).filter(([, v]) => typeof v === 'string')
    ),
    availability: Array.isArray(raw.availability) && raw.availability.length
      ? raw.availability
      : base.availability,
    exams: Array.isArray(raw.exams) && raw.exams.length ? raw.exams : base.exams,
    meta,
  }

  return { schedule, recovered, reason: recovered ? 'sanitized' : 'ok' }
}

/**
 * Build a fresh schedule from legacy localStorage sources + HTML plan seed.
 */
export function buildScheduleFromSources({
  htmlState,
  timetableDays,
  seedTimetableDays,
} = {}) {
  const schedule = createEmptySchedule()
  const seededTasks = buildTasksFromHtmlPlan()
  const daysMap = htmlState?.days && typeof htmlState.days === 'object' ? htmlState.days : {}
  schedule.tasks = applyHtmlCompletions(seededTasks, daysMap)
  schedule.notes = htmlState?.notes && typeof htmlState.notes === 'object'
    ? Object.fromEntries(Object.entries(htmlState.notes).filter(([, v]) => typeof v === 'string'))
    : {}

  const days = Array.isArray(timetableDays) && timetableDays.length
    ? timetableDays
    : (Array.isArray(seedTimetableDays) ? seedTimetableDays : [])
  schedule.sessions = sessionsFromTimetableDays(days)

  const sources = []
  if (htmlState) sources.push('kru_thp_69_v1')
  if (Array.isArray(timetableDays) && timetableDays.length) sources.push('daily_timetable_v8')
  else if (Array.isArray(seedTimetableDays) && seedTimetableDays.length) sources.push('timetable-seed')
  sources.push('html-plan')

  schedule.meta.migratedFrom = sources
  schedule.meta.taskCountSeed = schedule.tasks.length
  schedule.meta.sessionCountSeed = schedule.sessions.length
  return schedule
}

/**
 * Ensure HTML plan tasks exist (139) without wiping completions.
 */
export function ensureCanonicalHtmlTasks(schedule) {
  const seeded = buildTasksFromHtmlPlan()
  const tasks = mergeHtmlTasks(schedule.tasks || [], seeded)
  return {
    ...schedule,
    tasks,
    meta: {
      ...schedule.meta,
      taskCountSeed: seeded.length,
      engineVersion: SCHEDULE_ENGINE_VERSION,
    },
  }
}

/**
 * Load `kru_schedule_v1` or migrate from legacy keys.
 * Never deletes legacy keys. Idempotent when schedule already valid.
 *
 * @param {Storage} [storage]
 * @param {{ seedTimetableDays?: unknown[], force?: boolean }} [options]
 */
export function loadOrMigrateSchedule(storage = globalThis.localStorage, options = {}) {
  const report = {
    migrated: false,
    skipped: false,
    reason: '',
    sources: [],
    recovered: false,
    taskCount: 0,
    sessionCount: 0,
  }

  if (!storage) {
    const empty = createEmptySchedule()
    report.skipped = true
    report.reason = 'no-storage'
    return { schedule: empty, report }
  }

  const existingRaw = storage.getItem(SCHEDULE_KEY)
  if (existingRaw != null && !options.force) {
    const parsed = safeParse(existingRaw)
    if (isScheduleStore(parsed)) {
      let schedule = ensureCanonicalHtmlTasks(parsed)
      // Re-import any newer legacy completions not yet in schedule (safe merge).
      const legacyHtml = readJson(storage, LEGACY_HTML_KEY)
      if (legacyHtml.present && legacyHtml.value?.days) {
        schedule = {
          ...schedule,
          tasks: applyHtmlCompletions(schedule.tasks, legacyHtml.value.days),
          notes: {
            ...schedule.notes,
            ...(legacyHtml.value.notes && typeof legacyHtml.value.notes === 'object'
              ? legacyHtml.value.notes
              : {}),
          },
        }
      }
      report.skipped = true
      report.reason = 'already-migrated'
      report.taskCount = schedule.tasks.length
      report.sessionCount = schedule.sessions.length
      // Persist canonical merge if task set grew
      if (schedule.tasks.length !== parsed.tasks.length) {
        saveSchedule(schedule, storage, { dualWrite: true })
        report.migrated = true
        report.skipped = false
        report.reason = 'canonical-tasks-merged'
      }
      return { schedule, report }
    }

    const sanitized = sanitizeSchedule(parsed)
    let schedule = ensureCanonicalHtmlTasks(sanitized.schedule)
    const recovered = sanitized.recovered
    const reason = sanitized.reason
    const legacyHtml = readJson(storage, LEGACY_HTML_KEY)
    if (legacyHtml.present && legacyHtml.value?.days) {
      schedule = {
        ...schedule,
        tasks: applyHtmlCompletions(schedule.tasks, legacyHtml.value.days),
      }
    }
    if (!schedule.sessions.length) {
      const tt = readJson(storage, LEGACY_TIMETABLE_KEY)
      if (tt.present && Array.isArray(tt.value)) {
        schedule = { ...schedule, sessions: sessionsFromTimetableDays(tt.value) }
      } else if (options.seedTimetableDays) {
        schedule = {
          ...schedule,
          sessions: sessionsFromTimetableDays(options.seedTimetableDays),
        }
      }
    }
    saveSchedule(schedule, storage, { dualWrite: true })
    report.migrated = true
    report.recovered = recovered
    report.reason = reason || 'recovered-malformed'
    report.taskCount = schedule.tasks.length
    report.sessionCount = schedule.sessions.length
    return { schedule, report }
  }

  const html = readJson(storage, LEGACY_HTML_KEY)
  const tt = readJson(storage, LEGACY_TIMETABLE_KEY)
  const htmlState = html.present && html.value && typeof html.value === 'object'
    ? {
      days: html.value.days && typeof html.value.days === 'object' ? html.value.days : {},
      notes: html.value.notes && typeof html.value.notes === 'object' ? html.value.notes : {},
    }
    : { days: {}, notes: {} }

  let schedule = buildScheduleFromSources({
    htmlState,
    timetableDays: tt.present && Array.isArray(tt.value) ? tt.value : null,
    seedTimetableDays: options.seedTimetableDays,
  })
  schedule = ensureCanonicalHtmlTasks(schedule)

  saveSchedule(schedule, storage, { dualWrite: true })
  report.migrated = true
  report.reason = existingRaw == null ? 'migrated' : 'force-migrated'
  report.sources = schedule.meta.migratedFrom
  report.taskCount = schedule.tasks.length
  report.sessionCount = schedule.sessions.length
  return { schedule, report }
}

/**
 * Persist schedule SSOT and dual-write legacy keys (never delete them).
 * Writes SSOT first. Legacy dual-writes are best-effort: a quota/error on a legacy
 * key must not roll back or clear the SSOT write, and must never delete existing keys.
 */
export function saveSchedule(schedule, storage = globalThis.localStorage, options = {}) {
  if (!storage) throw new Error('No storage available')
  const { schedule: clean } = sanitizeSchedule(schedule)
  storage.setItem(SCHEDULE_KEY, JSON.stringify(clean))

  if (options.dualWrite !== false) {
    try {
      const htmlState = scheduleToHtmlPlannerState(clean)
      // Preserve unknown legacy fields if present
      const prevHtml = readJson(storage, LEGACY_HTML_KEY)
      const mergedHtml = {
        days: htmlState.days,
        notes: htmlState.notes,
        ...(prevHtml.present && prevHtml.value && typeof prevHtml.value === 'object'
          ? Object.fromEntries(
            Object.entries(prevHtml.value).filter(([k]) => k !== 'days' && k !== 'notes')
          )
          : {}),
      }
      storage.setItem(LEGACY_HTML_KEY, JSON.stringify(mergedHtml))
    } catch {
      // Keep SSOT; leave previous legacy HTML key untouched on failure.
    }

    try {
      // Dual-write timetable tree from sessions (preserve day order/labels when possible)
      const prevTt = readJson(storage, LEGACY_TIMETABLE_KEY)
      const seedDays = prevTt.present && Array.isArray(prevTt.value) ? prevTt.value : []
      const days = timetableDaysFromSessions(clean.sessions, seedDays)
      storage.setItem(LEGACY_TIMETABLE_KEY, JSON.stringify(days))
    } catch {
      // Keep SSOT; leave previous legacy timetable key untouched on failure.
    }
  }

  return clean
}

export function loadSchedule(storage = globalThis.localStorage) {
  if (!storage) return createEmptySchedule()
  const raw = storage.getItem(SCHEDULE_KEY)
  if (!raw) return null
  const parsed = safeParse(raw)
  if (isScheduleStore(parsed)) return ensureCanonicalHtmlTasks(parsed)
  return sanitizeSchedule(parsed).schedule
}

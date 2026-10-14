import {
  LEGACY_ENGLISH_KEYS,
  LEGACY_EXAM_HTML_KEY,
  UNIFIED_KEY,
} from './constants.js'
import { backupLegacyKeys, backupUnifiedStore } from './backup.js'
import { createEmptyStore, createId, isUnifiedStore } from './schema.js'
import { sanitizeUrl, urlHadSensitiveParams } from './sanitize.js'

/**
 * @param {string} raw
 * @returns {unknown}
 */
function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * @param {Storage} storage
 * @param {string} key
 */
function readJson(storage, key) {
  const raw = storage.getItem(key)
  if (raw == null) return { present: false, value: null }
  return { present: true, value: safeParse(raw) }
}

/**
 * Import English Study Desk localStorage blobs into the canonical store.
 * Keeps original shapes under `legacy` for coexistence with existing hooks (M1).
 * @param {Record<string, any>} store
 * @param {Storage} storage
 * @param {{ strippedSensitiveUrls: number }} report
 */
function importEnglish(store, storage, report) {
  const theme = readJson(storage, 'app_theme_v1')
  if (theme.present && (theme.value === 'dark' || theme.value === 'light')) {
    store.prefs.theme = theme.value
  }

  const plan = readJson(storage, 'study_plan')
  if (plan.present && Array.isArray(plan.value)) {
    store.legacy.studyPlan = plan.value
    store.topics = plan.value.map((item, index) => ({
      id: String(item.id || `topic_${index}`),
      subjectId: 'general-a',
      title: String(item.title || 'Untitled topic'),
      subtitle: item.subtitle ? String(item.subtitle) : undefined,
      priority: Number(item.priority) || index + 1,
      targetScore: item.targetScore ? String(item.targetScore) : undefined,
      color: item.color ? String(item.color) : undefined,
    }))
    store.tasks = plan.value.flatMap((item) => {
      const topicId = String(item.id || 'topic')
      const details = Array.isArray(item.details) ? item.details : []
      return details.map((detail, detailIndex) => ({
        id: `${topicId}_${detailIndex}`,
        topicId,
        title: String(detail),
        priority: 'med',
        status: 'pending',
        origin: 'seed-english',
      }))
    })
  }

  const progress = readJson(storage, 'plan_progress')
  if (progress.present && progress.value && typeof progress.value === 'object') {
    store.legacy.planProgress = progress.value
    for (const [key, done] of Object.entries(progress.value)) {
      if (!done) continue
      const task = store.tasks.find(t => t.id === key)
      if (task) {
        task.status = 'done'
        task.completedAt = task.completedAt || new Date().toISOString()
      }
    }
  }

  const mocks = readJson(storage, 'mock_exams')
  if (mocks.present && Array.isArray(mocks.value)) {
    store.legacy.mockExams = mocks.value
    store.examAttempts = mocks.value.map((item, index) => ({
      id: String(item.id || `attempt_${index}`),
      name: String(item.name || 'Mock'),
      part: String(item.part || ''),
      totalScore: Number(item.totalScore) || 0,
      userScore: typeof item.userScore === 'number' ? item.userScore : null,
      date: item.date || null,
      note: item.note ? String(item.note) : undefined,
    }))
  }

  const timetable = readJson(storage, 'daily_timetable_v8')
  if (timetable.present && Array.isArray(timetable.value)) {
    store.legacy.timetable = timetable.value
    store.sessions = timetable.value.flatMap((day) => {
      const date = String(day.date || '')
      const slots = Array.isArray(day.slots) ? day.slots : []
      return slots.map((slot, index) => {
        const sourceUrl = slot._link ? sanitizeUrl(slot._link) : null
        if (slot._link && urlHadSensitiveParams(slot._link)) {
          report.strippedSensitiveUrls += 1
        }
        const timeParts = String(slot.time || '').split(/\s*-\s*/)
        return {
          id: String(slot.id || `${day.id || 'd'}_s${index}`),
          date,
          startTime: normalizeTime(timeParts[0]),
          endTime: normalizeTime(timeParts[1] || timeParts[0]),
          zone: slot.zone || 'other',
          title: String(slot.title || ''),
          note: slot.note ? String(slot.note) : undefined,
          taskIds: [],
          videoId: undefined,
          status: slot.done ? 'done' : 'planned',
          origin: 'seed',
          sourceUrl: sourceUrl || undefined,
        }
      })
    })
  }

  const videos = readJson(storage, 'study_videos')
  if (videos.present && Array.isArray(videos.value)) {
    for (const video of videos.value) {
      const sourceUrl = sanitizeUrl(video.url)
      if (video.url && urlHadSensitiveParams(video.url)) {
        report.strippedSensitiveUrls += 1
      }
      if (!sourceUrl) continue
      const id = String(video.id || createId('video'))
      store.videos.push({
        id,
        title: String(video.title || 'Untitled video'),
        subjectId: undefined,
        topicId: undefined,
        tags: [],
        sourceUrl,
        thumbnailUrl: typeof video.thumbnail === 'string' ? video.thumbnail : undefined,
        category: video.category ? String(video.category) : undefined,
        isLiveCapable: Boolean(video.isLive),
        durationMinutes: undefined,
      })
      store.videoProgress[id] = {
        watched: Boolean(video.isWatched),
        note: video.note ? String(video.note) : undefined,
      }
    }
  }

  const notes = readJson(storage, 'study_notes')
  if (notes.present && Array.isArray(notes.value)) {
    store.notes = notes.value.map((note, index) => ({
      id: String(note.id || `note_${index}`),
      kind: 'study',
      category: note.category ? String(note.category) : undefined,
      title: String(note.title || 'Untitled'),
      content: String(note.content || ''),
      createdAt: note.createdAt || new Date().toISOString(),
    }))
  }

  const quizzes = readJson(storage, 'study_quizzes')
  if (quizzes.present) store.legacy.quizzes = quizzes.value
  const quizResults = readJson(storage, 'quiz_results')
  if (quizResults.present) store.legacy.quizResults = quizResults.value
  const rates = readJson(storage, 'competition_rates_v1')
  if (rates.present) store.legacy.competitionRates = rates.value
}

/**
 * Import HTML planner state `{ days, notes }` and optional seed task links.
 * @param {Record<string, any>} store
 * @param {Storage} storage
 * @param {{ strippedSensitiveUrls: number }} report
 * @param {{ dailyPlanByDate?: Record<string, Array<{ text: string, pri?: string, link?: string }>> }} [options]
 */
function importExamHtml(store, storage, report, options = {}) {
  const legacy = readJson(storage, LEGACY_EXAM_HTML_KEY)
  if (!legacy.present || !legacy.value || typeof legacy.value !== 'object') return

  const days = legacy.value.days && typeof legacy.value.days === 'object'
    ? legacy.value.days
    : {}
  const notes = legacy.value.notes && typeof legacy.value.notes === 'object'
    ? legacy.value.notes
    : {}

  for (const [date, completionMap] of Object.entries(days)) {
    const seedTasks = options.dailyPlanByDate?.[date] || []
    const map = completionMap && typeof completionMap === 'object' ? completionMap : {}

    if (seedTasks.length > 0) {
      seedTasks.forEach((seed, index) => {
        const sourceUrl = seed.link ? sanitizeUrl(seed.link) : null
        if (seed.link && urlHadSensitiveParams(seed.link)) {
          report.strippedSensitiveUrls += 1
        }
        const id = `html_${date}_${index}`
        const existing = store.tasks.find(t => t.id === id)
        const status = map[index] || map[String(index)] ? 'done' : 'pending'
        if (existing) {
          if (status === 'done') {
            existing.status = 'done'
            existing.completedAt = existing.completedAt || new Date().toISOString()
          }
          return
        }
        store.tasks.push({
          id,
          title: String(seed.text || `Task ${index + 1}`),
          priority: seed.pri === 'high' || seed.pri === 'med' || seed.pri === 'low' ? seed.pri : 'med',
          plannedDate: date,
          sourceUrl: sourceUrl || undefined,
          status,
          completedAt: status === 'done' ? new Date().toISOString() : undefined,
          origin: 'seed-exam-html',
        })
      })
    } else {
      for (const [index, done] of Object.entries(map)) {
        if (!done) continue
        const id = `html_${date}_${index}`
        if (store.tasks.some(t => t.id === id)) continue
        store.tasks.push({
          id,
          title: `Completed task ${Number(index) + 1} (${date})`,
          priority: 'med',
          plannedDate: date,
          status: 'done',
          completedAt: new Date().toISOString(),
          origin: 'seed-exam-html',
        })
      }
    }
  }

  for (const [date, content] of Object.entries(notes)) {
    if (!content || !String(content).trim()) continue
    const id = `daily_${date}`
    if (store.notes.some(n => n.id === id)) continue
    store.notes.push({
      id,
      kind: 'daily',
      date,
      title: `บันทึก ${date}`,
      content: String(content),
      createdAt: new Date().toISOString(),
    })
  }
}

function normalizeTime(value) {
  if (!value) return '00:00'
  const cleaned = String(value).trim().replace('.', ':')
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return cleaned
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

function hasAnyLegacy(storage) {
  if (storage.getItem(LEGACY_EXAM_HTML_KEY) != null) return true
  return LEGACY_ENGLISH_KEYS.some(key => storage.getItem(key) != null)
}

/**
 * Migrate legacy localStorage into `kru_unified_v1`.
 * Never deletes legacy keys. Idempotent if unified store already valid.
 *
 * @param {Storage} [storage]
 * @param {{ dailyPlanByDate?: Record<string, Array<{ text: string, pri?: string, link?: string }>>, force?: boolean }} [options]
 */
export function migrateFromLegacy(storage = globalThis.localStorage, options = {}) {
  const report = {
    migrated: false,
    skipped: false,
    reason: '',
    sources: [],
    backupKey: '',
    legacyBackupKey: '',
    strippedSensitiveUrls: 0,
    taskCount: 0,
    sessionCount: 0,
    videoCount: 0,
    noteCount: 0,
  }

  if (!storage) {
    report.skipped = true
    report.reason = 'no-storage'
    return report
  }

  const existingRaw = storage.getItem(UNIFIED_KEY)
  if (existingRaw != null && !options.force) {
    const existing = safeParse(existingRaw)
    if (isUnifiedStore(existing)) {
      report.skipped = true
      report.reason = 'already-unified'
      return report
    }
  }

  if (!hasAnyLegacy(storage) && existingRaw == null) {
    const empty = createEmptyStore()
    storage.setItem(UNIFIED_KEY, JSON.stringify(empty))
    report.migrated = true
    report.reason = 'empty-initialized'
    report.taskCount = 0
    return report
  }

  const legacyBackup = backupLegacyKeys(storage, [...LEGACY_ENGLISH_KEYS, LEGACY_EXAM_HTML_KEY])
  report.legacyBackupKey = legacyBackup.key
  const unifiedBackup = backupUnifiedStore(storage, 'pre-migrate')
  report.backupKey = unifiedBackup.key

  const store = createEmptyStore()

  if (LEGACY_ENGLISH_KEYS.some(key => storage.getItem(key) != null)) {
    importEnglish(store, storage, report)
    report.sources.push('english')
  }
  if (storage.getItem(LEGACY_EXAM_HTML_KEY) != null) {
    importExamHtml(store, storage, report, options)
    report.sources.push('exam-html')
  }

  // Exams always come from examCalendar module (authoritative), already seeded in createEmptyStore.
  storage.setItem(UNIFIED_KEY, JSON.stringify(store))

  report.migrated = true
  report.reason = 'migrated'
  report.taskCount = store.tasks.length
  report.sessionCount = store.sessions.length
  report.videoCount = store.videos.length
  report.noteCount = store.notes.length
  return report
}

/**
 * @param {Storage} [storage]
 */
export function loadUnifiedStore(storage = globalThis.localStorage) {
  if (!storage) return createEmptyStore()
  const raw = storage.getItem(UNIFIED_KEY)
  if (!raw) return null
  const parsed = safeParse(raw)
  return isUnifiedStore(parsed) ? parsed : null
}

/**
 * @param {Record<string, unknown>} store
 * @param {Storage} [storage]
 */
export function saveUnifiedStore(store, storage = globalThis.localStorage) {
  if (!storage) throw new Error('No storage available')
  if (!isUnifiedStore(store)) throw new Error('Invalid unified store')
  storage.setItem(UNIFIED_KEY, JSON.stringify(store))
}

export { hasAnyLegacy }

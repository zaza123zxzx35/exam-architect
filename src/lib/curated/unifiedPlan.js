/**
 * Unified Part A + Part B (English major) study draft from curated catalog.
 * Score-first packing: must-score → if-time within user daily budget.
 * Pure: does not write storage. Caller merges with confirm.
 */

import { getExams } from '../../data/examCalendar.js'
import { enrichCuratedResources } from './catalog.js'
import {
  normalizePriorityMode,
  PRIORITY_MODE_LABELS_TH,
  PRIORITY_TIERS,
  rankCuratedCatalog,
  weaknessMapFromAnalysis,
} from './priorityScoring.js'

function isoDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00+07:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

function daysBetween(startIso, endIso) {
  const a = new Date(`${startIso}T12:00:00+07:00`).getTime()
  const b = new Date(`${endIso}T12:00:00+07:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

/**
 * Default daily budget minutes when user has not configured availability.
 * Explicitly an estimate for draft planning.
 */
export const DEFAULT_DAILY_STUDY_MINUTES = 120

/**
 * Minutes already committed on each plannedDate from existing schedule tasks.
 * Used so a regenerated draft cannot overfill days after a prior curated merge.
 * By default only counts curated_* / curated-unified-plan rows so the HTML seed
 * track does not silently zero-out curated packing (separate planning lane).
 * @param {Array<{ plannedDate?: string, estimatedMinutes?: number, durationMinutes?: number, id?: string, origin?: string }>|undefined} tasks
 * @param {{ curatedOnly?: boolean }} [options]
 * @returns {Map<string, number>}
 */
export function committedMinutesByDate(tasks, options = {}) {
  const curatedOnly = options.curatedOnly !== false
  /** @type {Map<string, number>} */
  const map = new Map()
  for (const t of tasks || []) {
    if (!t) continue
    if (curatedOnly) {
      const id = String(t.id || '')
      const origin = String(t.origin || '')
      if (
        !id.startsWith('curated_')
        && origin !== 'curated-unified-plan'
        && origin !== 'curated-part-b-29'
      ) continue
    }
    const date = String(t.plannedDate || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const fromEstimate = Number(t.estimatedMinutes)
    const fromDuration = Number(t.durationMinutes)
    const minutes = Number.isFinite(fromEstimate) && fromEstimate > 0
      ? fromEstimate
      : Number.isFinite(fromDuration) && fromDuration > 0
        ? fromDuration
        : 0
    map.set(date, (map.get(date) || 0) + minutes)
  }
  return map
}

function estimateMinutes(row) {
  const m = Number(row?.estimatedMinutes)
  return Number.isFinite(m) && m > 0 ? m : 45
}

/**
 * Build part-separated queues: must-score then if-time. Defer excluded from scheduling.
 * @param {ReturnType<typeof rankCuratedCatalog>} ranked
 */
export function buildPriorityQueues(ranked) {
  const partA = []
  const partB = []
  const deferred = []
  for (const entry of ranked) {
    const { row, score } = entry
    if (score.tier === PRIORITY_TIERS.DEFER) {
      deferred.push(entry)
      continue
    }
    // All official Part ข subjects (education, law, english-major, …) — not major-only.
    if (row.examPart === 'ข') {
      partB.push(entry)
    } else if (row.examPart === 'ก') {
      partA.push(entry)
    } else {
      deferred.push(entry)
    }
  }
  const tierOrder = { [PRIORITY_TIERS.MUST]: 0, [PRIORITY_TIERS.IF_TIME]: 1 }
  const urlReadyRank = (row) => {
    if (row.urlStatus === 'needs_full_url' || row.urlStatus === 'unreachable') return 2
    if (row.urlStatus === 'unchecked' || row.urlStatus === 'needs_login') return 1
    if (row.urlStatus === 'verified_accessible' || row.urlStatus === 'openable') return 0
    return 1
  }
  const sortFn = (a, b) => {
    const td = (tierOrder[a.score.tier] ?? 9) - (tierOrder[b.score.tier] ?? 9)
    if (td !== 0) return td
    // Within a tier, prefer structurally usable URLs, then higher score.
    const ud = urlReadyRank(a.row) - urlReadyRank(b.row)
    if (ud !== 0) return ud
    return b.score.priorityScore - a.score.priorityScore || String(a.row.id).localeCompare(String(b.row.id))
  }
  partA.sort(sortFn)
  partB.sort(sortFn)
  return { partA, partB, deferred }
}

/**
 * @param {{
 *   todayIso?: string,
 *   dailyMinutes?: number,
 *   existingTaskIds?: string[],
 *   existingTasks?: Array<{ id?: string, plannedDate?: string, estimatedMinutes?: number, durationMinutes?: number, origin?: string, status?: string }>,
 *   catalog?: ReturnType<typeof enrichCuratedResources>,
 *   mode?: import('./priorityScoring.js').PriorityMode,
 *   weaknessAnalysis?: { observedWeaknesses?: Array<object> },
 * }} [options]
 */
export function generateUnifiedStudyDraft(options = {}) {
  const exams = getExams()
  const examA = exams.find(e => e.id === 'exam-part-a-2569') || exams[0]
  const examB = exams.find(e => e.id === 'exam-part-b-2569') || exams[1]
  const todayIso = options.todayIso || isoDate(new Date())
  const dailyMinutes = Number(options.dailyMinutes) > 0
    ? Number(options.dailyMinutes)
    : DEFAULT_DAILY_STUDY_MINUTES
  const mode = normalizePriorityMode(options.mode)
  const existingIdsFromTasks = (options.existingTasks || []).map(t => t?.id).filter(Boolean)
  const existing = new Set([...existingIdsFromTasks, ...(options.existingTaskIds || [])].map(String))
  const doneResourceIds = new Set(
    (options.existingTasks || [])
      .filter(t => t && t.status === 'done' && String(t.id || '').startsWith('curated_'))
      .map(t => String(t.id).replace(/^curated_/, '')),
  )
  const committed = committedMinutesByDate(options.existingTasks, { curatedOnly: true })
  const catalog = options.catalog || enrichCuratedResources()
  const weaknessBySubject = weaknessMapFromAnalysis(options.weaknessAnalysis)
  const ranked = rankCuratedCatalog(catalog, { mode, weaknessBySubject })
  const { partA: partAQueue, partB: partBQueue, deferred } = buildPriorityQueues(ranked)

  const endIso = String(examB?.startsAt || examA?.startsAt || todayIso).slice(0, 10)
  const dayCount = Math.max(1, daysBetween(todayIso, endIso))
  const reviewBufferDays = Math.min(3, Math.floor(dayCount / 8) || 1)
  const studyDays = Math.max(1, dayCount - reviewBufferDays)

  const proposedTasks = []
  let aIdx = 0
  let bIdx = 0

  for (let day = 0; day < studyDays; day += 1) {
    const date = addDaysIso(todayIso, day)
    if (date < todayIso) continue
    let budget = Math.max(0, dailyMinutes - (committed.get(date) || 0))
    const order = day % 2 === 0 ? ['ก', 'ข'] : ['ข', 'ก']

    for (const part of order) {
      const queue = part === 'ก' ? partAQueue : partBQueue
      let qi = part === 'ก' ? aIdx : bIdx
      while (budget > 0 && qi < queue.length) {
        const entry = queue[qi]
        const res = entry.row
        const taskId = `curated_${res.id}`
        if (
          existing.has(taskId)
          || proposedTasks.some(t => t.id === taskId)
          || doneResourceIds.has(String(res.id))
        ) {
          qi += 1
          continue
        }
        const minutes = estimateMinutes(res)
        const dayAlreadyHasWork = (committed.get(date) || 0) > 0
          || proposedTasks.some(t => t.plannedDate === date)
        if (minutes > budget && dayAlreadyHasWork) break
        if (minutes > budget && !dayAlreadyHasWork && budget < dailyMinutes) break

        proposedTasks.push({
          id: taskId,
          title: res.title,
          plannedDate: date,
          status: 'pending',
          origin: 'curated-unified-plan',
          examPart: res.examPart,
          subjectId: res.subjectId,
          resourceId: res.id,
          resourceUrl: res.safeUrl || res.originalUrl || res.url || '',
          originalUrl: res.originalUrl || res.url || '',
          urlStatus: res.urlStatus,
          tutorTh: res.tutorTh || '',
          estimatedMinutes: minutes,
          durationMinutes: minutes,
          durationIsEstimate: true,
          priorityTier: entry.score.tier,
          priorityScore: entry.score.priorityScore,
          priorityMode: mode,
          reasonTh: entry.score.reasonTh,
          reasonCodes: entry.score.reasonCodes,
        })
        budget -= minutes
        qi += 1
      }
      if (part === 'ก') aIdx = qi
      else bIdx = qi
    }
  }

  for (let day = studyDays; day < dayCount; day += 1) {
    const date = addDaysIso(todayIso, day)
    if (date < todayIso) continue
    const taskId = `curated_review_day_${date}`
    if (existing.has(taskId)) continue
    proposedTasks.push({
      id: taskId,
      title: day === dayCount - 1
        ? 'ทบทวนรวม + ข้อสอบจำลองก่อนสอบภาค ข'
        : 'วันทบทวนจุดอ่อน / ทำข้อสอบย่อย',
      plannedDate: date,
      status: 'pending',
      origin: 'curated-unified-plan',
      examPart: 'mixed',
      subjectId: 'unknown',
      resourceId: null,
      resourceUrl: '',
      urlStatus: 'unchecked',
      estimatedMinutes: dailyMinutes,
      durationMinutes: dailyMinutes,
      durationIsEstimate: true,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 1,
      priorityMode: mode,
      reasonTh: `กัน ${reviewBufferDays} วันสุดท้ายสำหรับทบทวน/ข้อสอบจำลอง (ภาค ก ${String(examA?.startsAt || '').slice(0, 10)} · ภาค ข ${endIso})`,
      reasonCodes: ['review-buffer'],
    })
  }

  const scheduledResourceIds = new Set(
    proposedTasks.filter(t => t.resourceId).map(t => String(t.resourceId)),
  )
  const unscheduledMust = ranked.filter(
    e => e.score.tier === PRIORITY_TIERS.MUST && !scheduledResourceIds.has(String(e.row.id)),
  )
  const unscheduledIfTime = ranked.filter(
    e => e.score.tier === PRIORITY_TIERS.IF_TIME && !scheduledResourceIds.has(String(e.row.id)),
  )

  const unscheduled = {
    partA: partAQueue.filter(e => !scheduledResourceIds.has(String(e.row.id))).length,
    partB: partBQueue.filter(e => !scheduledResourceIds.has(String(e.row.id))).length,
    deferred: deferred.length,
    mustScoreLeft: unscheduledMust.length,
    ifTimeLeft: unscheduledIfTime.length,
  }

  const tierCounts = {
    must: ranked.filter(e => e.score.tier === PRIORITY_TIERS.MUST).length,
    ifTime: ranked.filter(e => e.score.tier === PRIORITY_TIERS.IF_TIME).length,
    defer: deferred.length,
    scheduledMust: proposedTasks.filter(t => t.priorityTier === PRIORITY_TIERS.MUST && t.resourceId).length,
    scheduledIfTime: proposedTasks.filter(t => t.priorityTier === PRIORITY_TIERS.IF_TIME && t.resourceId).length,
  }

  return {
    version: '10.0-priority',
    todayIso,
    examPartA: String(examA?.startsAt || '').slice(0, 10),
    examPartB: endIso,
    dayCount,
    studyDays,
    reviewBufferDays,
    dailyMinutes,
    dailyMinutesIsDefault: !(Number(options.dailyMinutes) > 0),
    mode,
    modeLabelTh: PRIORITY_MODE_LABELS_TH[mode],
    proposedTasks,
    unscheduled,
    tierCounts,
    deferredSample: deferred.slice(0, 12).map(e => ({
      id: e.row.id,
      title: e.row.title,
      subjectId: e.row.subjectId,
      examPart: e.row.examPart,
      reasonTh: e.score.reasonTh,
      tier: e.score.tier,
    })),
    limitationsTh: [
      'ไม่มีสถิติความถี่ข้อสอบเก่าหรือน้ำหนักคะแนนรายข้อใน repo — มิติเหล่านี้เป็น unknown',
      'ห้ามอ้างว่าออกบ่อยจากชื่อคลิปโฆษณา',
      'URL unchecked ไม่เท่ากับ verified_accessible',
    ],
    notesTh: [
      `โหมด: ${PRIORITY_MODE_LABELS_TH[mode]} — เลือกต้องเก็บคะแนนก่อน แล้วเติมควรอ่านถ้ามีเวลา`,
      'ระยะเวลาแต่ละตอนเป็นค่าประมาณ หากวิดีโอไม่มีความยาวที่ยืนยัน',
      'อังกฤษภาค ก (english-skills-a) กับวิชาเอกอังกฤษ (english-major) แยกคิวชัดเจน',
      'ไม่เขียนทับงานเดิม — ใช้ id curated_* และข้ามถ้ามีอยู่แล้ว / done / userEdited',
      'ระบบไม่เพิ่มนาทีต่อวันอัตโนมัติเกินงบที่คุณกำหนด',
      `จัด must ${tierCounts.scheduledMust} · if-time ${tierCounts.scheduledIfTime} · พักไว้ ${tierCounts.defer} (ยังอยู่ในคลัง)`,
      unscheduled.mustScoreLeft > 0
        ? `ยังมีหัวข้อต้องเก็บคะแนนที่งบไม่พอ ${unscheduled.mustScoreLeft} รายการ — ไม่เพิ่มเวลาให้อัตโนมัติ`
        : 'จัดกลุ่มต้องเก็บคะแนนได้ครบภายใต้งบปัจจุบัน (ตามการประมาณ)',
    ],
  }
}

/**
 * Merge draft tasks into a schedule clone — add-only for curated ids.
 * @param {object} schedule
 * @param {ReturnType<typeof generateUnifiedStudyDraft>} draft
 */
export function mergeUnifiedDraftIntoSchedule(schedule, draft) {
  const safeSchedule = schedule && typeof schedule === 'object' ? schedule : { tasks: [], sessions: [] }
  const rawTasks = Array.isArray(safeSchedule.tasks) ? safeSchedule.tasks : []
  const next = {
    ...safeSchedule,
    tasks: [...rawTasks],
  }
  const byId = new Map()
  for (const t of next.tasks) {
    if (!t || t.id == null) continue
    const id = String(t.id)
    if (!byId.has(id)) byId.set(id, t)
  }
  let added = 0
  let skippedExisting = 0
  let skippedInvalid = 0
  const seenDraftIds = new Set()
  for (const task of draft?.proposedTasks || []) {
    if (!task || task.id == null) {
      skippedInvalid += 1
      continue
    }
    const id = String(task.id)
    if (seenDraftIds.has(id)) {
      skippedInvalid += 1
      continue
    }
    seenDraftIds.add(id)
    const prev = byId.get(id)
    if (prev) {
      skippedExisting += 1
      continue
    }
    const date = String(task.plannedDate || '')
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      skippedInvalid += 1
      continue
    }
    byId.set(id, { ...task, id })
    added += 1
  }
  next.tasks = [...byId.values()]
  next.updatedAt = new Date().toISOString()
  next.lastCuratedMerge = {
    added,
    skippedExisting,
    skippedInvalid,
    at: next.updatedAt,
    mode: draft?.mode,
  }
  return next
}

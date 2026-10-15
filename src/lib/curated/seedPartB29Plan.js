/**
 * One-shot seed: แผนพาบรรจุ 100 (Part ข 29 + Thai/Math force + Lady wins + mocks + Drive substitutes).
 * Add-only on soft seed. force:true drops pending managed rows and reseeds, but keeps
 * status===done and userEdited===true (same spirit as AI apply).
 */

import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import {
  buildForceRegenPreview,
  ensureVictoryPlanSeed,
  isVictoryManagedTask,
  VICTORY_PLAN_VERSION,
  VICTORY_SEED_META_KEY,
} from './victoryPlan.js'

export const CURATED_PLAN_SEED_META_KEY = 'curatedPartB29SeededAt'
export const CURATED_PLAN_SEED_VERSION = VICTORY_PLAN_VERSION

/**
 * Clear seed meta flags so force reseed is allowed. Does not touch tasks.
 * @param {object} meta
 */
export function clearCuratedSeedMetaFlags(meta = {}) {
  const next = { ...meta }
  delete next[CURATED_PLAN_SEED_META_KEY]
  delete next[VICTORY_SEED_META_KEY]
  delete next.curatedPlanSeedVersion
  delete next.curatedPlanSeedTodayIso
  delete next.curatedPlanSeedTaskCount
  delete next.curatedPlanSeedPartBOk
  delete next.curatedPlanVictoryScore
  return next
}

/**
 * Read-only preview for「ล้างงาน curated/ไลฟ์」.
 * Scope matches historical Today clear: all victory-managed tasks including done/userEdited.
 * Never mutates schedule.
 * @param {object} schedule
 */
export function buildClearManagedPreview(schedule) {
  const tasks = Array.isArray(schedule?.tasks) ? schedule.tasks : []
  const remove = []
  const keep = []
  for (const t of tasks) {
    if (isVictoryManagedTask(t)) remove.push(t)
    else keep.push(t)
  }
  const removeDone = remove.filter((t) => t.status === 'done')
  const removeEdited = remove.filter((t) => t.userEdited === true && t.status !== 'done')
  const removePending = remove.filter((t) => t.status !== 'done' && t.userEdited !== true)
  return {
    originalTaskCount: tasks.length,
    originalTaskIds: tasks.map((t) => String(t.id)),
    removeCount: remove.length,
    removeDoneCount: removeDone.length,
    removeUserEditedCount: removeEdited.length,
    removePendingCount: removePending.length,
    keepCount: keep.length,
    sampleRemove: remove.slice(0, 10).map((t) => ({
      id: String(t.id),
      title: String(t.title || t.id),
      plannedDate: t.plannedDate ? String(t.plannedDate) : null,
      status: t.status === 'done' ? 'done' : (t.userEdited ? 'userEdited' : 'pending'),
    })),
    summaryTh: remove.length > 0
      ? `จะลบงาน curated/live/victory ทั้งหมด ${remove.length} รายการ (รวม done ${removeDone.length} · userEdited ${removeEdited.length} · pending ${removePending.length}) · คงงานอื่น ${keep.length}`
      : 'ไม่มีงาน curated/live/victory ให้ลบ',
  }
}

/**
 * Commit clear of all victory-managed tasks (including done / userEdited).
 * Pure w.r.t. input: returns a new schedule; does not mutate the argument.
 * @param {object} schedule
 */
export function commitClearManagedTasks(schedule) {
  const preview = buildClearManagedPreview(schedule)
  const tasks = Array.isArray(schedule?.tasks) ? schedule.tasks : []
  const kept = tasks.filter((t) => !isVictoryManagedTask(t)).map((t) => ({ ...t }))
  return {
    schedule: {
      ...schedule,
      tasks: kept,
      meta: clearCuratedSeedMetaFlags(schedule?.meta || {}),
      updatedAt: new Date().toISOString(),
    },
    preview,
    removedCount: preview.removeCount,
    keptCount: preview.keepCount,
  }
}

/**
 * Commit force victory plan after user confirmation.
 * Pure w.r.t. input: returns a new schedule object; does not mutate the argument.
 * @param {object} schedule
 * @param {{ todayIso?: string, declareBelief?: boolean, mode?: string }} [options]
 */
export function commitForceVictoryPlan(schedule, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const preview = buildForceRegenPreview(schedule)
  const base = {
    ...schedule,
    meta: clearCuratedSeedMetaFlags(schedule?.meta || {}),
    // Clone task objects so force/conflict steps never mutate the caller's rows.
    tasks: Array.isArray(schedule?.tasks)
      ? schedule.tasks.map((t) => ({ ...t }))
      : [],
  }
  const out = ensureCuratedPartB29Seed(base, {
    todayIso,
    force: true,
    declareBelief: options.declareBelief !== false,
    mode: options.mode || 'score-max',
  })
  return {
    ...out,
    preview,
  }
}

/**
 * @param {object} schedule
 * @param {{
 *   todayIso?: string,
 *   force?: boolean,
 *   mode?: import('./priorityScoring.js').PriorityMode,
 *   declareBelief?: boolean,
 * }} [options]
 * @returns {{ schedule: object, seeded: boolean, reason: string, draft?: object, readiness?: object }}
 */
export function ensureCuratedPartB29Seed(schedule, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  if (!schedule || typeof schedule !== 'object') {
    return { schedule, seeded: false, reason: 'no-schedule' }
  }

  const out = ensureVictoryPlanSeed(schedule, {
    todayIso,
    force: options.force === true,
    mode: options.mode || 'score-max',
    declareBelief: options.declareBelief !== false,
  })

  if (!out.seeded && out.reason !== 'belief-declared') {
    return out
  }

  const next = {
    ...out.schedule,
    meta: {
      ...out.schedule.meta,
      [CURATED_PLAN_SEED_META_KEY]: out.schedule.meta?.[VICTORY_SEED_META_KEY]
        || new Date().toISOString(),
      curatedPlanSeedVersion: CURATED_PLAN_SEED_VERSION,
      curatedPlanSeedTodayIso: todayIso,
      curatedPlanSeedTaskCount: (out.draft?.proposedTasks || out.schedule.tasks || []).length,
      curatedPlanSeedPartBOk: out.draft?.partBCoverageOk !== false,
      curatedPlanVictoryScore: out.readiness?.score ?? null,
    },
    updatedAt: new Date().toISOString(),
  }

  return {
    ...out,
    schedule: next,
  }
}

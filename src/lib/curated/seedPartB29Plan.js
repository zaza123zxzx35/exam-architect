/**
 * One-shot seed: Part ข 29-day plan + VIP live/content blocks into schedule SSOT.
 * Add-only. Never overwrites done / userEdited / existing curated_* or live_* tasks.
 */

import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import { generatePartB29Draft, mergePartB29DraftIntoSchedule } from './partB29Plan.js'

export const CURATED_PLAN_SEED_META_KEY = 'curatedPartB29SeededAt'
export const CURATED_PLAN_SEED_VERSION = '15.2-tutor-ownership-lady-eng'

function hasCuratedOrLiveTasks(schedule) {
  return (schedule?.tasks || []).some((t) => {
    const id = String(t?.id || '')
    const origin = String(t?.origin || '')
    return id.startsWith('curated_')
      || id.startsWith('live_')
      || origin === 'curated-part-b-29'
      || origin === 'curated-unified-plan'
      || origin === 'live-tutor-schedule'
  })
}

/**
 * @param {object} schedule
 * @param {{
 *   todayIso?: string,
 *   force?: boolean,
 *   mode?: import('./priorityScoring.js').PriorityMode,
 * }} [options]
 * @returns {{ schedule: object, seeded: boolean, reason: string, draft?: object }}
 */
export function ensureCuratedPartB29Seed(schedule, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  if (!schedule || typeof schedule !== 'object') {
    return { schedule, seeded: false, reason: 'no-schedule' }
  }
  if (!options.force && schedule.meta?.[CURATED_PLAN_SEED_META_KEY]) {
    return { schedule, seeded: false, reason: 'already-seeded' }
  }
  if (!options.force && hasCuratedOrLiveTasks(schedule)) {
    return { schedule, seeded: false, reason: 'has-curated-tasks' }
  }

  const draft = generatePartB29Draft({
    todayIso,
    mode: options.mode || 'score-max',
    existingTasks: schedule.tasks || [],
    existingTaskIds: (schedule.tasks || []).map(t => t?.id).filter(Boolean),
  })

  const merged = mergePartB29DraftIntoSchedule(schedule, draft)
  const next = {
    ...merged,
    meta: {
      ...merged.meta,
      [CURATED_PLAN_SEED_META_KEY]: new Date().toISOString(),
      curatedPlanSeedVersion: CURATED_PLAN_SEED_VERSION,
      curatedPlanSeedTodayIso: todayIso,
      curatedPlanSeedTaskCount: draft.proposedTasks.length,
      curatedPlanSeedPartBOk: draft.partBCoverageOk === true,
    },
    updatedAt: new Date().toISOString(),
  }

  return {
    schedule: next,
    seeded: true,
    reason: 'seeded',
    draft,
  }
}

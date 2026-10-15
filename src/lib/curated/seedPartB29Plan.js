/**
 * One-shot seed: แผนพาบรรจุ 100 (Part ข 29 + Thai/Math force + Lady wins + mocks + Drive substitutes).
 * Add-only unless force. Never overwrites done / userEdited tasks on non-force path.
 */

import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import {
  ensureVictoryPlanSeed,
  VICTORY_PLAN_VERSION,
  VICTORY_SEED_META_KEY,
} from './victoryPlan.js'

export const CURATED_PLAN_SEED_META_KEY = 'curatedPartB29SeededAt'
export const CURATED_PLAN_SEED_VERSION = VICTORY_PLAN_VERSION

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

import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  CURATED_PLAN_SEED_META_KEY,
  ensureCuratedPartB29Seed,
} from './seedPartB29Plan.js'

describe('ensureCuratedPartB29Seed', () => {
  it('seeds Part ข 29-day + live tasks into an empty schedule', () => {
    const empty = { tasks: [], sessions: [], notes: {}, meta: {} }
    const { schedule, seeded, reason, draft } = ensureCuratedPartB29Seed(empty, {
      todayIso: '2026-10-15',
    })
    expect(seeded).toBe(true)
    expect(reason).toBe('seeded')
    expect(schedule.meta[CURATED_PLAN_SEED_META_KEY]).toBeTruthy()
    expect(schedule.tasks.length).toBeGreaterThan(0)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.LAW)).toBe(true)
    expect(draft.partBCoverageOk).toBe(true)
  })

  it('does not re-seed when meta flag or curated tasks already exist', () => {
    const empty = { tasks: [], sessions: [], notes: {}, meta: {} }
    const first = ensureCuratedPartB29Seed(empty, { todayIso: '2026-10-15' })
    const second = ensureCuratedPartB29Seed(first.schedule, { todayIso: '2026-10-15' })
    expect(second.seeded).toBe(false)
    expect(second.reason).toBe('already-seeded')
    expect(second.schedule.tasks.length).toBe(first.schedule.tasks.length)
  })
})

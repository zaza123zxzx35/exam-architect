import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { LIVE_TUTOR_EVENTS, listLiveTutorEvents, subjectFocusForDate } from '../../data/liveTutorSchedule.js'
import {
  generateLiveScheduleTasks,
  reorderQueueForDateFocus,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveTutorSchedule clean slate', () => {
  it('has no poster events until the next tutor pack is loaded', () => {
    expect(LIVE_TUTOR_EVENTS).toHaveLength(0)
    expect(listLiveTutorEvents('2026-10-15', { includePast: false })).toHaveLength(0)
    expect(subjectFocusForDate('2026-10-20')).toBeNull()
  })
})

describe('liveSchedulePlan helpers', () => {
  it('generates zero tasks on empty live schedule', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-15', untilIso: '2026-11-14' })
    expect(draft.proposedTasks).toHaveLength(0)
    expect(draft.upcomingLiveCount).toBe(0)
  })

  it('sortCatalogByPriority follows ranked order', () => {
    const ranked = [
      { row: { id: 'b' }, score: { tier: PRIORITY_TIERS.MUST, priorityScore: 0.9 } },
      { row: { id: 'a' }, score: { tier: PRIORITY_TIERS.IF_TIME, priorityScore: 0.5 } },
      { row: { id: 'c' }, score: { tier: PRIORITY_TIERS.DEFER, priorityScore: 0.1 } },
    ]
    const items = [{ id: 'c' }, { id: 'a' }, { id: 'b' }]
    expect(sortCatalogByPriority(items, ranked).map(i => i.id)).toEqual(['b', 'a', 'c'])
  })

  it('reorderQueueForDateFocus is a no-op without focus events', () => {
    const queue = [
      { row: { id: '1', subjectId: SUBJECT_IDS.LAW, examPart: 'ข' }, score: {} },
      { row: { id: '2', subjectId: SUBJECT_IDS.EDUCATION, examPart: 'ข' }, score: {} },
    ]
    expect(reorderQueueForDateFocus('2026-10-20', queue).map(e => e.row.id)).toEqual(['1', '2'])
  })
})

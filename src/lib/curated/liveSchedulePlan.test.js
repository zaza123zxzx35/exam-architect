import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { LIVE_TUTOR_EVENTS, listLiveTutorEvents, subjectFocusForDate } from '../../data/liveTutorSchedule.js'
import {
  generateLiveScheduleTasks,
  reorderQueueForDateFocus,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveTutorSchedule Lady Kaekae flyer', () => {
  it('loads VIP flyer events for English ก+ข', () => {
    expect(LIVE_TUTOR_EVENTS.length).toBeGreaterThan(0)
    expect(LIVE_TUTOR_EVENTS.every(e => e.sourceTh.includes('ครูเลดี้เก๋เก๋'))).toBe(true)
    const upcoming = listLiveTutorEvents('2026-10-15', { includePast: false })
    expect(upcoming.length).toBeGreaterThan(0)
    expect(subjectFocusForDate('2026-10-28')?.subjectId).toBe(SUBJECT_IDS.ENGLISH_MAJOR)
  })
})

describe('liveSchedulePlan helpers', () => {
  it('generates live tasks from flyer schedule', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-15', untilIso: '2026-11-14' })
    expect(draft.proposedTasks.length).toBeGreaterThan(0)
    expect(draft.upcomingLiveCount).toBeGreaterThan(0)
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

  it('reorderQueueForDateFocus elevates major on flyer nights', () => {
    const queue = [
      { row: { id: '1', subjectId: SUBJECT_IDS.LAW, examPart: 'ข' }, score: {} },
      { row: { id: '2', subjectId: SUBJECT_IDS.ENGLISH_MAJOR, examPart: 'ข' }, score: {} },
    ]
    const ordered = reorderQueueForDateFocus('2026-10-28', queue).map(e => e.row.id)
    expect(ordered[0]).toBe('2')
  })
})

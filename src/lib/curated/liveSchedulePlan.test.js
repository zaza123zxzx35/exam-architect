import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { LIVE_PRIORITY, listLiveTutorEvents, subjectFocusForDate } from '../../data/liveTutorSchedule.js'
import {
  generateLiveScheduleTasks,
  reorderQueueForDateFocus,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveTutorSchedule posters', () => {
  it('lists Part ข major lives ahead of Part ก howl by priorityRank', () => {
    const upcoming = listLiveTutorEvents('2026-10-15', { includePast: false })
    expect(upcoming.length).toBeGreaterThan(5)
    const firstMajor = upcoming.find(e => e.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)
    const firstHowl = upcoming.find(e => e.tags?.includes('หมาหอน'))
    expect(firstMajor).toBeTruthy()
    expect(firstHowl).toBeTruthy()
    expect(firstMajor.priorityRank).toBe(LIVE_PRIORITY.PART_B_MAJOR)
    expect(firstMajor.priorityRank).toBeLessThan(firstHowl.priorityRank)
  })

  it('focuses education on 2026-10-19–22 VIP block', () => {
    const focus = subjectFocusForDate('2026-10-20')
    expect(focus?.subjectId).toBe(SUBJECT_IDS.EDUCATION)
    expect(focus?.examPart).toBe('ข')
  })

  it('keeps civil-servant as Part ก, not Part ข law', () => {
    const civil = listLiveTutorEvents('2026-10-01', { includePast: true })
      .find(e => e.id === 'vip-2026-10-07-10-civil')
    expect(civil?.examPart).toBe('ก')
    expect(civil?.subjectId).toBe('civil-servant-a')
  })
})

describe('liveSchedulePlan', () => {
  it('generates upcoming live tasks sorted by priority then date', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-15', untilIso: '2026-11-14' })
    expect(draft.upcomingLiveCount).toBeGreaterThan(0)
    expect(draft.proposedTasks.every(t => t.origin === 'live-tutor-schedule')).toBe(true)
    expect(draft.proposedTasks.every(t => t.plannedDate >= '2026-10-15')).toBe(true)
    // First task should be high-priority Part ข (major or education/law block).
    const top = draft.proposedTasks[0]
    expect(['ข', 'mixed'].includes(top.examPart) || top.priorityScore >= 0.7).toBe(true)
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

  it('reorderQueueForDateFocus pulls matching subject first', () => {
    const queue = [
      { row: { id: '1', subjectId: SUBJECT_IDS.LAW, examPart: 'ข' }, score: {} },
      { row: { id: '2', subjectId: SUBJECT_IDS.EDUCATION, examPart: 'ข' }, score: {} },
      { row: { id: '3', subjectId: SUBJECT_IDS.ENGLISH_MAJOR, examPart: 'ข' }, score: {} },
    ]
    const ordered = reorderQueueForDateFocus('2026-10-20', queue)
    expect(ordered[0].row.subjectId).toBe(SUBJECT_IDS.EDUCATION)
  })
})

import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  LIVE_TUTOR_EVENTS,
  listLiveTutorEvents,
  subjectFocusForDate,
} from '../../data/liveTutorSchedule.js'
import {
  generateLiveScheduleTasks,
  reorderQueueForDateFocus,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveTutorSchedule VIP + Lady Kaekae', () => {
  it('loads Lady lives and VIP October content blocks', () => {
    expect(LIVE_TUTOR_EVENTS.length).toBeGreaterThan(15)
    expect(LIVE_TUTOR_EVENTS.some(e => e.id.startsWith('lady-live-'))).toBe(true)
    expect(LIVE_TUTOR_EVENTS.some(e => e.id.startsWith('vip-'))).toBe(true)
    expect(LIVE_TUTOR_EVENTS.some(e => e.id.startsWith('online-'))).toBe(true)
    const onlineCivil = LIVE_TUTOR_EVENTS.find(e => e.id === 'online-civil-2026-10-15')
    expect(onlineCivil?.titleTh).toMatch(/ดร\.วิรัตน์/)
    expect(LIVE_TUTOR_EVENTS.find(e => e.id === 'online-edu-2026-10-15')?.titleTh).toMatch(/ดร\.ธนากร/)
    expect(LIVE_TUTOR_EVENTS.find(e => e.id === 'online-english-2026-10-19')?.titleTh).toMatch(/ธนารีย์รัฐ/)
    expect(LIVE_TUTOR_EVENTS.find(e => e.id === 'online-math-2026-10-21')?.titleTh).toMatch(/ศรัญภรณ์/)
    const upcoming = listLiveTutorEvents('2026-10-15', { includePast: false })
    expect(upcoming.length).toBeGreaterThan(0)
    expect(subjectFocusForDate('2026-10-19')?.subjectId).toBe(SUBJECT_IDS.EDUCATION)
    expect(subjectFocusForDate('2026-10-28')?.subjectId).toBe(SUBJECT_IDS.ENGLISH_MAJOR)
  })
})

describe('liveSchedulePlan helpers', () => {
  it('generates live + content-block tasks from flyers', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-15', untilIso: '2026-11-14' })
    expect(draft.proposedTasks.length).toBeGreaterThan(0)
    expect(draft.upcomingLiveCount).toBeGreaterThan(0)
    expect(draft.contentBlockCount).toBeGreaterThan(0)
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

  it('reorderQueueForDateFocus elevates major on Lady flyer nights', () => {
    const queue = [
      { row: { id: '1', subjectId: SUBJECT_IDS.LAW, examPart: 'ข' }, score: {} },
      { row: { id: '2', subjectId: SUBJECT_IDS.ENGLISH_MAJOR, examPart: 'ข' }, score: {} },
    ]
    const ordered = reorderQueueForDateFocus('2026-10-28', queue).map(e => e.row.id)
    expect(ordered[0]).toBe('2')
  })
})

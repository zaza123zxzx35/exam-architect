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
  resolveLadyLiveConflicts,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { buildDayTimeline, DEFAULT_COACH_PREFS } from './dayTimeline.js'
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

  it('P0 regression: Oct 7 keeps VIP source clock and flags conflict', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-07', untilIso: '2026-10-07' })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-07')
    const vip = day.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    const haek = day.find((t) => t.liveEventId === 'lady-live-a-haek-2026-10-07')
    expect(haek?.startTime).toBe('21:00')
    expect(vip?.startTime).toBe('20:00')
    expect(vip?.endTime).toBe('22:30')
    expect(vip?.scheduleConflictPending).toBe(true)
    expect(draft.conflictsPending).toContain(vip.id)
    const tl = buildDayTimeline({ tasks: day, prefs: DEFAULT_COACH_PREFS })
    const vipBlock = tl.blocks.find((b) => b.taskId === vip.id)
    expect(vipBlock?.startTime).toBe('20:00')
    expect(vipBlock?.endTime).toBe('22:30')
  })

  it('P0 regression: Oct 16 preserves online clocks without conflict flags', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-16', untilIso: '2026-10-16' })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-16')
    expect(day.find((t) => t.liveEventId === 'online-civil-2026-10-15')?.startTime).toBe('11:00')
    expect(day.find((t) => t.liveEventId === 'online-edu-2026-10-15')?.startTime).toBe('20:00')
    expect(day.every((t) => !t.scheduleConflictPending)).toBe(true)
  })

  it('P0 regression: Oct 21 keeps อ.ศรัญภรณ์ 20:00–22:00 while flagging lady overlap', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-21', untilIso: '2026-10-21' })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-21')
    const math = day.find((t) => t.liveEventId === 'online-math-2026-10-21')
    expect(math?.startTime).toBe('20:00')
    expect(math?.endTime).toBe('22:00')
    expect(math?.scheduleConflictPending).toBe(true)
    expect(math?.title).not.toMatch(/ทบทวนกลางวัน/)
    const { conflictIds } = resolveLadyLiveConflicts(day)
    expect(conflictIds).toContain(math.id)
  })
})

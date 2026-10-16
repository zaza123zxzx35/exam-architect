import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  LIVE_TUTOR_EVENTS,
  listLiveTutorEvents,
  subjectFocusForDate,
} from '../../data/liveTutorSchedule.js'
import {
  classifySilentLadyDemotion,
  decideLivePlannedClockSync,
  generateLiveScheduleTasks,
  markLiveTaskClockLocked,
  reorderQueueForDateFocus,
  resolveLadyLiveConflicts,
  restoreSilentLadyDemotion,
  sortCatalogByPriority,
} from './liveSchedulePlan.js'
import { buildDayTimeline, DEFAULT_COACH_PREFS } from './dayTimeline.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

function systemLegacyDemotionShell(overrides = {}) {
  return {
    id: 'live_vip',
    plannedDate: '2026-10-07',
    liveKind: 'content-block',
    liveEventId: 'vip-civil-2026-10-07',
    startTime: '09:00',
    endTime: '11:00',
    demotedFromStartTime: '20:00',
    demotedFromEndTime: '22:30',
    conflictResolved: true,
    title: 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · VIP',
    reasonTh: 'vip · ชนไลฟ์เลดี้เก๋เก๋ (21:00–22:30) — เลื่อนเป็นทบทวนกลางวันตามแผน 100',
    reasonCodes: ['vip', 'victory-lady-wins'],
    ...overrides,
  }
}

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

describe('P0.3 legacy demotion restore safety', () => {
  it('restores only when full pre-P0 system fingerprint is present', () => {
    const block = systemLegacyDemotionShell()
    expect(classifySilentLadyDemotion(block)).toBe('system_legacy')
    expect(restoreSilentLadyDemotion(block)).toBe(true)
    expect(block.startTime).toBe('20:00')
    expect(block.endTime).toBe('22:30')
    expect(block.demotedFromStartTime).toBeUndefined()
    expect(block.conflictResolved).toBe(false)
    expect(block.title).toBe('โฟกัสเนื้อหา · VIP')
  })

  it('does not overwrite userEdited 09:00–11:00 even with leftover demotedFrom markers', () => {
    const block = systemLegacyDemotionShell({
      userEdited: true,
      title: 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · VIP ที่ผู้ใช้ยืนยันช่วงเช้า',
    })
    expect(classifySilentLadyDemotion(block)).toBe('user_protected')
    expect(restoreSilentLadyDemotion(block)).toBe(false)
    expect(block.startTime).toBe('09:00')
    expect(block.endTime).toBe('11:00')
    expect(block.demotedFromStartTime).toBe('20:00')
    expect(block.legacyDemotionReviewNeeded).toBe(true)
    expect(block.conflictResolved).toBe(false)
    expect(block.reasonTh).toMatch(/userEdited|ผู้ใช้ตั้งไว้|ตรวจสอบด้วยมือ/)
  })

  it('preserves user-edited clocks that are not 09:00–11:00 (even with leftover demotedFrom markers)', () => {
    const block = {
      id: 'user_other',
      plannedDate: '2026-10-07',
      liveKind: 'content-block',
      liveEventId: 'vip-civil-2026-10-07',
      startTime: '14:00',
      endTime: '16:00',
      demotedFromStartTime: '20:00',
      demotedFromEndTime: '22:30',
      conflictResolved: true,
      userEdited: true,
      title: 'โฟกัสเนื้อหา · VIP ที่ผู้ใช้ย้ายเอง',
      reasonTh: 'ผู้ใช้ตั้งเวลาเอง',
      reasonCodes: ['victory-lady-wins'],
    }
    expect(classifySilentLadyDemotion(block)).toBe('none')
    expect(restoreSilentLadyDemotion(block)).toBe(false)
    expect(block.startTime).toBe('14:00')
    expect(block.endTime).toBe('16:00')
    expect(block.demotedFromStartTime).toBe('20:00')
  })

  it('keeps both overlapping items when lady live conflicts with content-block', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-07', untilIso: '2026-10-07' })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-07')
    const vip = day.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    const haek = day.find((t) => t.liveEventId === 'lady-live-a-haek-2026-10-07')
    expect(vip).toBeTruthy()
    expect(haek).toBeTruthy()
    expect(vip.startTime).toBe('20:00')
    expect(haek.startTime).toBe('21:00')
    expect(vip.scheduleConflictPending).toBe(true)
    expect(day.map((t) => t.liveEventId)).toEqual(expect.arrayContaining([
      'vip-civil-2026-10-07',
      'lady-live-a-haek-2026-10-07',
    ]))
  })

  it('does not auto-restore ambiguous 09:00–11:00 shells lacking system fingerprint', () => {
    const block = systemLegacyDemotionShell({
      title: 'ช่วงเช้าที่ตั้งเอง',
      reasonTh: 'ผู้ใช้อาจย้ายเอง',
      reasonCodes: ['vip'], // no victory-lady-wins
    })
    expect(classifySilentLadyDemotion(block)).toBe('ambiguous')
    expect(restoreSilentLadyDemotion(block)).toBe(false)
    expect(block.startTime).toBe('09:00')
    expect(block.endTime).toBe('11:00')
    expect(block.demotedFromStartTime).toBe('20:00')
    expect(block.legacyDemotionReviewNeeded).toBe(true)
    expect(block.title).toBe('ช่วงเช้าที่ตั้งเอง')
  })

  it('clock alone (09:00–11:00) is not enough without demotedFrom + conflictResolved', () => {
    expect(classifySilentLadyDemotion({
      liveKind: 'content-block',
      startTime: '09:00',
      endTime: '11:00',
      title: 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · VIP',
      reasonCodes: ['victory-lady-wins'],
      reasonTh: 'เลื่อนเป็นทบทวนกลางวันตามแผน 100',
    })).toBe('none')
  })

  it('re-resolve is idempotent for system restore and for review-held rows', () => {
    const lady = {
      id: 'live_lady',
      plannedDate: '2026-10-07',
      liveKind: 'live',
      liveEventId: 'lady-live-a-haek-2026-10-07',
      startTime: '21:00',
      endTime: '22:30',
      title: 'ไลฟ์',
    }
    const system = systemLegacyDemotionShell({ id: 'sys' })
    const ambiguous = systemLegacyDemotionShell({
      id: 'amb',
      title: 'เช้าของฉัน',
      reasonTh: 'ไม่รู้ที่มา',
      reasonCodes: [],
    })
    const first = resolveLadyLiveConflicts([{ ...lady }, { ...system }, { ...ambiguous }])
    const sys1 = first.tasks.find((t) => t.id === 'sys')
    const amb1 = first.tasks.find((t) => t.id === 'amb')
    expect(sys1.startTime).toBe('20:00')
    expect(amb1.startTime).toBe('09:00')
    expect(amb1.legacyDemotionReviewNeeded).toBe(true)
    const reasonAmb1 = amb1.reasonTh

    const second = resolveLadyLiveConflicts(first.tasks)
    const sys2 = second.tasks.find((t) => t.id === 'sys')
    const amb2 = second.tasks.find((t) => t.id === 'amb')
    expect(sys2.startTime).toBe('20:00')
    expect(sys2.endTime).toBe('22:30')
    expect(amb2.startTime).toBe('09:00')
    expect(amb2.endTime).toBe('11:00')
    expect(amb2.reasonTh).toBe(reasonAmb1)
    expect(classifySilentLadyDemotion(amb2)).toBe('review_held')
  })

  it('clockLocked 09:00 demotion shell is user_protected (no auto-restore)', () => {
    const block = systemLegacyDemotionShell({
      clockLocked: true,
      userEdited: false,
      title: 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · VIP',
    })
    expect(classifySilentLadyDemotion(block)).toBe('user_protected')
    expect(restoreSilentLadyDemotion(block)).toBe(false)
    expect(block.startTime).toBe('09:00')
  })
})

describe('Strategy D clock helpers + conflict source stamp', () => {
  it('decideLivePlannedClockSync covers lock, drift, legacy, and track', () => {
    expect(decideLivePlannedClockSync(
      { clockLocked: true, startTime: '14:00', sourceStartTime: '20:00' },
      { startTime: '20:00', endTime: '22:30' },
    )).toMatchObject({ protectPlanned: true, reason: 'clockLocked' })

    expect(decideLivePlannedClockSync(
      { startTime: '14:00', endTime: '16:00', sourceStartTime: '20:00', sourceEndTime: '22:30' },
      { startTime: '20:00', endTime: '22:30' },
    )).toMatchObject({ protectPlanned: true, reason: 'drift', shouldStampClockLocked: true })

    expect(decideLivePlannedClockSync(
      { startTime: '14:00', endTime: '16:00' },
      { startTime: '20:00', endTime: '22:30' },
    )).toMatchObject({ protectPlanned: true, reason: 'legacy-no-source', shouldStampClockLocked: true })

    expect(decideLivePlannedClockSync(
      { startTime: '20:00', endTime: '22:30', sourceStartTime: '20:00', sourceEndTime: '22:30' },
      { startTime: '20:00', endTime: '22:30' },
    )).toMatchObject({ protectPlanned: false, reason: 'track' })

    expect(decideLivePlannedClockSync(
      { startTime: '19:00', endTime: '21:30', sourceStartTime: '19:00', sourceEndTime: '21:30' },
      { startTime: '20:00', endTime: '22:30' },
    )).toMatchObject({ protectPlanned: false, reason: 'track' })
  })

  it('markLiveTaskClockLocked sets planned clocks without touching source*', () => {
    const task = {
      startTime: '20:00',
      endTime: '22:30',
      sourceStartTime: '20:00',
      sourceEndTime: '22:30',
      reasonCodes: [],
    }
    markLiveTaskClockLocked(task, { startTime: '14:00', endTime: '16:00' })
    expect(task.startTime).toBe('14:00')
    expect(task.sourceStartTime).toBe('20:00')
    expect(task.clockLocked).toBe(true)
    expect(task.reasonCodes).toContain('clock-locked-protect')
  })

  it('resolveLadyLiveConflicts does not overwrite trusted source* with drifted planned', () => {
    const tasks = [
      {
        id: 'live_lady',
        plannedDate: '2026-10-07',
        liveKind: 'live',
        liveEventId: 'lady-live-a-haek-2026-10-07',
        startTime: '21:00',
        endTime: '22:30',
        sourceStartTime: '21:00',
        sourceEndTime: '22:30',
      },
      {
        id: 'live_vip',
        plannedDate: '2026-10-07',
        liveKind: 'content-block',
        liveEventId: 'vip-civil-2026-10-07',
        // Planned still overlaps lady (21:00) but end drifted vs source*.
        startTime: '20:00',
        endTime: '22:00',
        sourceStartTime: '20:00',
        sourceEndTime: '22:30',
        clockLocked: true,
      },
    ]
    resolveLadyLiveConflicts(tasks)
    const vip = tasks.find((t) => t.id === 'live_vip')
    expect(vip.sourceStartTime).toBe('20:00')
    expect(vip.sourceEndTime).toBe('22:30')
    expect(vip.startTime).toBe('20:00')
    expect(vip.endTime).toBe('22:00')
    expect(vip.scheduleConflictPending).toBe(true)
  })

  it('generateLiveScheduleTasks stamps source* from flyer on new rows', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-07', untilIso: '2026-10-07' })
    const vip = draft.proposedTasks.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    expect(vip?.startTime).toBe('20:00')
    expect(vip?.sourceStartTime).toBe('20:00')
    expect(vip?.sourceEndTime).toBe('22:30')
  })
})

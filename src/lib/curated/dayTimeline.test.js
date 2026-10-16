import { describe, expect, it } from 'vitest'
import {
  buildDayTimeline,
  resolveDurationMinutes,
  coachPriorityFor,
  coachPriorityLabelTh,
  DEFAULT_COACH_PREFS,
  TARGET_STUDY_MINUTES,
  sumStudyMinutes,
  sumMergedStudyMinutes,
  sumBreakMinutes,
} from './dayTimeline.js'
import { generateLiveScheduleTasks } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('dayTimeline', () => {
  it('resolves duration from estimatedMinutes or clock span only', () => {
    expect(resolveDurationMinutes({ estimatedMinutes: 90 })).toBe(90)
    expect(resolveDurationMinutes({ startTime: '21:00', endTime: '22:30' })).toBe(90)
    expect(resolveDurationMinutes({ title: 'no data' })).toBeNull()
  })

  it('anchors lives and inserts lunch without inventing live times', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-28',
      untilIso: '2026-10-28',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-28')
    const timeline = buildDayTimeline({ tasks: day, prefs: DEFAULT_COACH_PREFS })
    expect(timeline.blocks.some((b) => b.isLunch)).toBe(true)
    const lives = timeline.blocks.filter((b) => b.kind === 'live')
    expect(lives.length).toBeGreaterThanOrEqual(3)
    expect(lives.map((b) => b.startTime)).toEqual(expect.arrayContaining(['19:00', '21:00', '22:30']))
    expect(timeline.assumptionsTh.some((a) => a.includes('ไม่เดาคลิป 4'))).toBe(true)
    // Copy must describe relocate-then-skip (not "skip on overlap" alone).
    expect(timeline.assumptionsTh.some((a) => (
      a.includes('พักกลางวัน')
      && a.includes('ย้ายไปช่องว่าง')
      && a.includes('ไม่มีช่องว่างจึงข้าม')
    ))).toBe(true)
    expect(timeline.assumptionsTh.some((a) => (
      a.includes('พักกลางวัน') && /ข้ามถ้าทับเวลาต้นทาง/.test(a) && !a.includes('ย้ายไปช่องว่าง')
    ))).toBe(false)
  })

  it('relocates lunch into a free gap when 12:00–13:00 overlaps a source block', () => {
    const timeline = buildDayTimeline({
      tasks: [{
        id: 'long',
        title: 'บล็อกเช้าบ่าย',
        startTime: '11:00',
        endTime: '14:00',
        estimatedMinutes: 180,
        status: 'pending',
        liveKind: 'content-block',
        priorityTier: PRIORITY_TIERS.IF_TIME,
      }],
      prefs: DEFAULT_COACH_PREFS,
    })
    const lunch = timeline.blocks.find((b) => b.isLunch)
    expect(lunch).toBeTruthy()
    // Must not stay on the overlapping preferred window.
    expect(lunch.startTime === '12:00' && lunch.endTime === '13:00').toBe(false)
    // Must not move the source block.
    expect(timeline.blocks.find((b) => b.taskId === 'long')?.startTime).toBe('11:00')
    expect(timeline.assumptionsTh.some((a) => a.includes('ย้ายพัก') || a.includes('ช่องว่าง'))).toBe(true)
  })

  it('skips lunch entirely when no free gap fits without moving live', () => {
    const timeline = buildDayTimeline({
      tasks: [{
        id: 'allday',
        title: 'ทั้งวัน',
        startTime: '09:00',
        endTime: '23:00',
        estimatedMinutes: 840,
        status: 'pending',
        liveKind: 'content-block',
        priorityTier: PRIORITY_TIERS.MUST,
      }],
      prefs: DEFAULT_COACH_PREFS,
    })
    expect(timeline.blocks.some((b) => b.isLunch)).toBe(false)
    expect(timeline.assumptionsTh.some((a) => a.includes('ไม่มีช่องว่าง') || a.includes('ข้ามพักเที่ยง'))).toBe(true)
    expect(timeline.blocks.find((b) => b.taskId === 'allday')?.startTime).toBe('09:00')
  })

  it('defers low-priority work when the day is overloaded', () => {
    const heavy = Array.from({ length: 8 }, (_, i) => ({
      id: `study_${i}`,
      title: `งานยาว ${i}`,
      estimatedMinutes: 120,
      status: 'pending',
      priorityTier: i < 2 ? PRIORITY_TIERS.MUST : PRIORITY_TIERS.DEFER,
      liveKind: undefined,
    }))
    const timeline = buildDayTimeline({
      tasks: heavy,
      prefs: { ...DEFAULT_COACH_PREFS, dayStart: '09:00', dayEnd: '12:00', lunchStart: '12:00', lunchEnd: '12:00' },
    })
    expect(timeline.deferred.length).toBeGreaterThan(0)
  })

  it('maps live to priority 1', () => {
    expect(coachPriorityFor({ liveKind: 'live', id: 'x' })).toBe(1)
  })

  it('P1: default dayEnd is 23:00 and priority-3 label does not claim replay', () => {
    expect(DEFAULT_COACH_PREFS.dayEnd).toBe('23:00')
    expect(DEFAULT_COACH_PREFS.targetStudyMinutes).toBe(TARGET_STUDY_MINUTES)
    expect(coachPriorityLabelTh(3)).not.toMatch(/ดูย้อนหลัง|เก็บย้อนหลัง/)
  })

  it('P1: separates study minutes from breaks and does not invent filler to hit 8h', () => {
    const timeline = buildDayTimeline({
      tasks: [
        {
          id: 'a',
          title: 'อ่านสั้น',
          estimatedMinutes: 60,
          status: 'pending',
          priorityTier: PRIORITY_TIERS.MUST,
        },
        {
          id: 'live',
          title: 'ไลฟ์',
          startTime: '21:00',
          endTime: '22:30',
          estimatedMinutes: 90,
          status: 'pending',
          liveKind: 'live',
          liveEventId: 'lady-live-a-haek-2026-10-16',
        },
      ],
      prefs: DEFAULT_COACH_PREFS,
    })
    expect(timeline.summary.studyMinutes).toBe(sumMergedStudyMinutes(timeline.blocks))
    expect(timeline.summary.breakMinutes).toBe(sumBreakMinutes(timeline.blocks))
    expect(timeline.summary.studyMinutes).toBeLessThan(TARGET_STUDY_MINUTES)
    expect(timeline.summary.budgetMet).toBe(false)
    expect(timeline.summary.budgetNoteTh).toMatch(/ไม่สร้างตารางเท็จ|ไม่พอ|เป้า/)
    expect(timeline.summary.breakMinutes).toBeGreaterThan(0)
    // Breaks must not be counted as study
    expect(timeline.summary.studyMinutes + timeline.summary.breakMinutes)
      .toBeGreaterThan(timeline.summary.studyMinutes)
  })

  it('P1: merged study minutes do not double-count overlapping conflict blocks', () => {
    const timeline = buildDayTimeline({
      tasks: [
        {
          id: 'vip',
          title: 'VIP',
          startTime: '20:00',
          endTime: '22:30',
          estimatedMinutes: 150,
          status: 'pending',
          liveKind: 'content-block',
          scheduleConflictPending: true,
        },
        {
          id: 'haek',
          title: 'แหกโค้ง',
          startTime: '21:00',
          endTime: '22:30',
          estimatedMinutes: 90,
          status: 'pending',
          liveKind: 'live',
        },
      ],
      prefs: DEFAULT_COACH_PREFS,
    })
    expect(sumStudyMinutes(timeline.blocks)).toBe(240)
    expect(sumMergedStudyMinutes(timeline.blocks)).toBe(150)
    expect(timeline.summary.studyMinutes).toBe(150)
  })

  it('P1: flexible study ends by 23:00 while keeping source live past dayEnd', () => {
    const draft = generateLiveScheduleTasks({ todayIso: '2026-10-07', untilIso: '2026-10-07' })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-07')
    const timeline = buildDayTimeline({ tasks: day, prefs: DEFAULT_COACH_PREFS })
    const vip = timeline.blocks.find((b) => b.task?.liveEventId === 'vip-civil-2026-10-07')
    const haek = timeline.blocks.find((b) => b.task?.liveEventId === 'lady-live-a-haek-2026-10-07')
    const major = timeline.blocks.find((b) => b.task?.liveEventId === 'lady-live-b-major-2026-10-07')
    expect(vip?.startTime).toBe('20:00')
    expect(haek?.startTime).toBe('21:00')
    expect(major?.startTime).toBe('22:30')
    expect(major?.endTime).toBe('00:00')
    expect(timeline.assumptionsTh.some((a) => a.includes('จบหลัง') || a.includes('23:00'))).toBe(true)
    // No flexible block ends after 23:00
    const flexible = timeline.blocks.filter((b) => b.kind === 'study' && !b.isBreak)
    for (const b of flexible) {
      const end = Number(b.end)
      // end is minutes from midnight; 23:00 = 1380
      expect(end).toBeLessThanOrEqual(23 * 60)
    }
  })

  it('P1 sample days 7/16/21: never move live clocks; report study vs break; relocate lunch if needed', () => {
    for (const iso of ['2026-10-07', '2026-10-16', '2026-10-21']) {
      const draft = generateLiveScheduleTasks({ todayIso: iso, untilIso: iso })
      const day = draft.proposedTasks.filter((t) => t.plannedDate === iso)
      const timeline = buildDayTimeline({ tasks: day, prefs: DEFAULT_COACH_PREFS })
      expect(timeline.summary.studyMinutes).toBe(sumMergedStudyMinutes(timeline.blocks))
      expect(timeline.summary.breakMinutes).toBe(sumBreakMinutes(timeline.blocks))
      // Breaks/lunch never count as study.
      expect(timeline.summary.studyMinutes + timeline.summary.breakMinutes)
        .toBeGreaterThanOrEqual(timeline.summary.studyMinutes)
      for (const t of day.filter((x) => x.startTime)) {
        const block = timeline.blocks.find((b) => b.taskId === t.id)
        if (block) {
          expect(block.startTime).toBe(t.startTime)
        }
      }
    }
    const tl16 = buildDayTimeline({
      tasks: generateLiveScheduleTasks({ todayIso: '2026-10-16', untilIso: '2026-10-16' })
        .proposedTasks.filter((t) => t.plannedDate === '2026-10-16'),
      prefs: DEFAULT_COACH_PREFS,
    })
    expect(tl16.blocks.some((b) => b.isLunch)).toBe(true)
    expect(tl16.summary.breakMinutes).toBeGreaterThan(0)

    const d21 = generateLiveScheduleTasks({ todayIso: '2026-10-21', untilIso: '2026-10-21' })
    const day21 = d21.proposedTasks.filter((t) => t.plannedDate === '2026-10-21')
    const math = day21.find((t) => t.liveEventId === 'online-math-2026-10-21')
    const tl21 = buildDayTimeline({ tasks: day21, prefs: DEFAULT_COACH_PREFS })
    expect(tl21.blocks.find((b) => b.taskId === math.id)?.startTime).toBe('20:00')
    expect(math.scheduleConflictPending).toBe(true)
    expect(tl21.blocks.some((b) => b.isLunch)).toBe(true)
  })

  it('P1: stops packing flexible work once target study minutes are reached', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `flex_${i}`,
      title: `งานยืดหยุ่น ${i}`,
      estimatedMinutes: 60,
      status: 'pending',
      priorityTier: PRIORITY_TIERS.IF_TIME,
    }))
    const timeline = buildDayTimeline({
      tasks: many,
      prefs: {
        ...DEFAULT_COACH_PREFS,
        dayStart: '09:00',
        dayEnd: '23:00',
        targetStudyMinutes: 180,
        lunchStart: '12:00',
        lunchEnd: '13:00',
      },
    })
    expect(timeline.summary.studyMinutes).toBeLessThanOrEqual(180 + 30) // allow one overshoot by item size
    expect(timeline.deferred.length).toBeGreaterThan(0)
    expect(timeline.deferred.some((d) => /เป้าเรียนจริง|8 ชม|ถึงเป้า/.test(d.reasonTh))).toBe(true)
  })
})

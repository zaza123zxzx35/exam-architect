import { describe, expect, it } from 'vitest'
import {
  buildDayTimeline,
  resolveDurationMinutes,
  coachPriorityFor,
  DEFAULT_COACH_PREFS,
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
  })

  it('skips lunch when it would overlap a timed source block', () => {
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
    expect(timeline.blocks.some((b) => b.isLunch)).toBe(false)
    expect(timeline.assumptionsTh.some((a) => a.includes('ข้ามพักเที่ยง'))).toBe(true)
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
})

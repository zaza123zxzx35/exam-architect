import { describe, expect, it } from 'vitest'
import { adviseLiveConflicts } from './liveConflictAdvisor.js'
import { generateLiveScheduleTasks } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveConflictAdvisor', () => {
  it('advises attend the overlapping haek live (not major) on 2026-10-21', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-21',
      untilIso: '2026-10-21',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-21')
    const demoted = day.find((t) => t.conflictResolved)
    expect(demoted?.conflictWithLiveEventIds).toContain('lady-live-a-haek-2026-10-21')
    const advice = adviseLiveConflicts(day)
    expect(advice.conflictCount).toBeGreaterThan(0)
    const resolved = advice.decisions.find((d) => d.type === 'resolved')
    expect(resolved).toBeTruthy()
    expect(resolved.attendLive.liveKind).toBe('live')
    expect(resolved.attendLive.liveEventId || resolved.attendLive.id).toMatch(/haek-2026-10-21/)
    expect(resolved.attendLive.title).toMatch(/แหกโค้ง/)
    expect(resolved.watchLater.id).toBe(demoted.id)
    expect(resolved.overlapTh).toMatch(/20:00/)
    expect(resolved.reasonTh.length).toBeGreaterThan(10)
  })

  it('advises attend haek live on 2026-10-07 vip-civil conflict', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-07',
      untilIso: '2026-10-07',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-07')
    const advice = adviseLiveConflicts(day)
    const resolved = advice.decisions.find((d) => d.type === 'resolved')
    expect(resolved?.attendLive.title).toMatch(/แหกโค้ง/)
    expect(resolved?.watchLater.title).toMatch(/ทบทวนกลางวัน|ข้าราชการ/)
  })

  it('does not invent conflicts when no clock overlap', () => {
    const advice = adviseLiveConflicts([
      {
        id: 'a',
        title: 'เช้า',
        startTime: '09:00',
        endTime: '10:00',
        liveKind: 'content-block',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.IF_TIME,
      },
      {
        id: 'b',
        title: 'ค่ำ',
        startTime: '20:00',
        endTime: '21:00',
        liveKind: 'live',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.MUST,
      },
    ])
    expect(advice.conflictCount).toBe(0)
  })
})

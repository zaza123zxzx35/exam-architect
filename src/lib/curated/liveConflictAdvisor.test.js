import { describe, expect, it } from 'vitest'
import { adviseLiveConflicts } from './liveConflictAdvisor.js'
import { generateLiveScheduleTasks } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveConflictAdvisor', () => {
  it('advises attend live and watch later when lady live overlaps content-block', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-21',
      untilIso: '2026-10-21',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-21')
    const advice = adviseLiveConflicts(day)
    expect(advice.conflictCount).toBeGreaterThan(0)
    const resolved = advice.decisions.find((d) => d.type === 'resolved')
    expect(resolved).toBeTruthy()
    expect(resolved.attendLive.liveKind).toBe('live')
    expect(resolved.reasonTh.length).toBeGreaterThan(10)
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

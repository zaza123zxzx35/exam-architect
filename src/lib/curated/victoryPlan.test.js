import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  ensureVictoryPlanSeed,
  generateVictoryDraft,
  resolveLadyLiveConflicts,
  scoreVictoryReadiness,
  VICTORY_DRIVE_AWAITING,
  VICTORY_LEVERS,
} from './victoryPlan.js'

describe('victoryPlan แผนพาบรรจุ 100', () => {
  it('lever weights sum to 100', () => {
    expect(VICTORY_LEVERS.reduce((s, l) => s + l.weight, 0)).toBe(100)
  })

  it('resolves Lady live vs overlapping content-block', () => {
    const tasks = [
      {
        id: 'live_lady',
        plannedDate: '2026-10-07',
        liveKind: 'live',
        liveEventId: 'lady-live-a-haek-2026-10-07',
        startTime: '21:00',
        endTime: '22:30',
        title: 'ไลฟ์เลดี้',
      },
      {
        id: 'live_vip',
        plannedDate: '2026-10-07',
        liveKind: 'content-block',
        liveEventId: 'vip-civil-2026-10-07',
        startTime: '20:00',
        endTime: '22:30',
        title: 'โฟกัสเนื้อหา · VIP',
        reasonTh: 'vip',
        reasonCodes: ['vip'],
      },
    ]
    const { demotedIds, tasks: out } = resolveLadyLiveConflicts(tasks)
    expect(demotedIds).toContain('live_vip')
    expect(out.find((t) => t.id === 'live_vip')?.startTime).toBe('09:00')
    expect(out.find((t) => t.id === 'live_vip')?.title).toMatch(/ทบทวนกลางวัน/)
  })

  it('seeds a schedule that scores 100/100 with belief', () => {
    const empty = { tasks: [], meta: {}, version: 1 }
    const { schedule, readiness, draft } = ensureVictoryPlanSeed(empty, {
      todayIso: '2026-10-15',
      force: true,
      declareBelief: true,
    })
    expect(readiness.isPerfect).toBe(true)
    expect(readiness.score).toBe(100)
    expect(draft.victory.mockCount).toBeGreaterThanOrEqual(3)
    expect(draft.victory.driveEffortCount).toBe(VICTORY_DRIVE_AWAITING.length)

    const curated = schedule.tasks.filter((t) => String(t.id).startsWith('curated_'))
    expect(curated.filter((t) => t.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A).length).toBeGreaterThanOrEqual(6)
    expect(curated.filter((t) => t.subjectId === SUBJECT_IDS.MATH).length).toBeGreaterThanOrEqual(8)
    expect(schedule.tasks.some((t) => String(t.id).startsWith('victory_mock_'))).toBe(true)
    expect(schedule.tasks.some((t) => String(t.id).startsWith('victory_drive_'))).toBe(true)

    const rescored = scoreVictoryReadiness(schedule, { todayIso: '2026-10-15' })
    expect(rescored.score).toBe(100)
  })

  it('generateVictoryDraft forces Thai/Math and notes creed', () => {
    const draft = generateVictoryDraft({ todayIso: '2026-10-15' })
    expect(draft.victory.creedTh).toMatch(/ความเชื่อและพยายาม/)
    expect(draft.victoryForce.thaiTarget).toBe(6)
    expect(draft.victoryForce.mathTarget).toBe(8)
  })
})

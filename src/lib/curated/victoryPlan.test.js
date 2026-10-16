import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  buildForceRegenPreview,
  ensureVictoryPlanSeed,
  generateVictoryDraft,
  resolveLadyLiveConflicts,
  retainTasksForForceRegen,
  scoreVictoryReadiness,
  VICTORY_DRIVE_AWAITING,
  VICTORY_LEVERS,
} from './victoryPlan.js'
import { commitForceVictoryPlan } from './seedPartB29Plan.js'

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
    const vip = out.find((t) => t.id === 'live_vip')
    expect(vip?.startTime).toBe('09:00')
    expect(vip?.title).toMatch(/ทบทวนกลางวัน/)
    expect(vip?.demotedFromStartTime).toBe('20:00')
    expect(vip?.demotedFromEndTime).toBe('22:30')
    expect(vip?.conflictWithLiveEventIds).toEqual(['lady-live-a-haek-2026-10-07'])
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

  it('force regen keeps done and userEdited managed tasks', () => {
    const first = ensureVictoryPlanSeed({ tasks: [], meta: {} }, {
      todayIso: '2026-10-15',
      force: true,
      declareBelief: true,
    })
    const curated = first.schedule.tasks.find((t) => String(t.id).startsWith('curated_') && t.resourceId)
    expect(curated).toBeTruthy()
    const live = first.schedule.tasks.find((t) => t.liveKind === 'live')
    const withProgress = {
      ...first.schedule,
      tasks: first.schedule.tasks.map((t) => {
        if (t.id === curated.id) return { ...t, status: 'done' }
        if (live && t.id === live.id) return { ...t, userEdited: true, title: 'edited-live' }
        return t
      }),
    }
    const retained = retainTasksForForceRegen(withProgress.tasks)
    expect(retained.some((t) => t.id === curated.id && t.status === 'done')).toBe(true)
    if (live) {
      expect(retained.some((t) => t.id === live.id && t.userEdited === true)).toBe(true)
    }
    expect(retained.some((t) => t.status === 'pending' && !t.userEdited && String(t.id).startsWith('curated_'))).toBe(false)

    const second = ensureVictoryPlanSeed(withProgress, {
      todayIso: '2026-10-15',
      force: true,
      declareBelief: true,
    })
    expect(second.preservedManagedCount).toBeGreaterThanOrEqual(1)
    const keptDone = second.schedule.tasks.find((t) => t.id === curated.id)
    expect(keptDone).toMatchObject({ status: 'done', resourceId: curated.resourceId })
    // Same resource must not be duplicated as a fresh pending curated_* row
    expect(second.schedule.tasks.filter((t) => t.resourceId === curated.resourceId)).toHaveLength(1)
    expect(second.readiness.score).toBe(100)
  })

  it('buildForceRegenPreview is read-only and counts replace vs keep', () => {
    const seeded = ensureVictoryPlanSeed({ tasks: [], meta: {} }, {
      todayIso: '2026-10-15',
      force: true,
      declareBelief: true,
    })
    const curated = seeded.schedule.tasks.find((t) => String(t.id).startsWith('curated_') && t.resourceId)
    const live = seeded.schedule.tasks.find((t) => t.liveKind === 'live')
    const beforeIds = seeded.schedule.tasks.map((t) => t.id)
    const withProgress = {
      ...seeded.schedule,
      tasks: seeded.schedule.tasks.map((t) => {
        if (t.id === curated.id) return { ...t, status: 'done' }
        if (live && t.id === live.id) return { ...t, userEdited: true, title: 'keep-me' }
        return t
      }),
    }
    const snapshot = structuredClone(withProgress)
    const preview = buildForceRegenPreview(withProgress)
    expect(preview.replaceCount).toBeGreaterThan(0)
    expect(preview.keepDoneCount).toBe(1)
    expect(preview.keepUserEditedCount).toBe(live ? 1 : 0)
    expect(preview.sampleReplace.length).toBeGreaterThan(0)
    // Opening preview must not mutate schedule
    expect(withProgress).toEqual(snapshot)
    expect(withProgress.tasks.map((t) => t.id)).toEqual(
      snapshot.tasks.map((t) => t.id),
    )
    void beforeIds
  })

  it('cancel path: preview alone leaves schedule unchanged; confirm preserves done/userEdited', () => {
    const seeded = ensureVictoryPlanSeed({ tasks: [], meta: {} }, {
      todayIso: '2026-10-15',
      force: true,
      declareBelief: true,
    })
    const curated = seeded.schedule.tasks.find((t) => String(t.id).startsWith('curated_') && t.resourceId)
    const live = seeded.schedule.tasks.find((t) => t.liveKind === 'live')
    const withProgress = {
      ...seeded.schedule,
      tasks: seeded.schedule.tasks.map((t) => {
        if (t.id === curated.id) return { ...t, status: 'done' }
        if (live && t.id === live.id) return { ...t, userEdited: true, title: 'edited-live' }
        return t
      }),
    }
    const frozen = structuredClone(withProgress)
    const preview = buildForceRegenPreview(withProgress)
    // Simulate cancel: discard preview, do not commit
    expect(withProgress).toEqual(frozen)
    expect(preview.replaceCount).toBeGreaterThan(0)

    const committed = commitForceVictoryPlan(withProgress, {
      todayIso: '2026-10-15',
      declareBelief: true,
    })
    // Input schedule object must remain untouched (commit clones tasks array)
    expect(withProgress.tasks).toEqual(frozen.tasks)
    expect(committed.schedule.tasks.find((t) => t.id === curated.id)?.status).toBe('done')
    if (live) {
      expect(committed.schedule.tasks.find((t) => t.id === live.id)).toMatchObject({
        userEdited: true,
        title: 'edited-live',
      })
    }
    expect(
      committed.schedule.tasks.filter((t) => t.resourceId === curated.resourceId),
    ).toHaveLength(1)
    expect(committed.readiness.score).toBe(100)
    expect(committed.preview.replaceCount).toBe(preview.replaceCount)
  })
})

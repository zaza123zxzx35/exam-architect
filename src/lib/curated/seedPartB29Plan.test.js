import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { SCHEDULE_KEY } from '../schedule/constants.js'
import { loadSchedule, saveSchedule } from '../schedule/migrate.js'
import {
  CURATED_PLAN_SEED_META_KEY,
  VICTORY_CLEARED_META_KEY,
  buildClearManagedPreview,
  clearCuratedSeedMetaFlags,
  commitClearManagedTasks,
  commitForceVictoryPlan,
  ensureCuratedPartB29Seed,
} from './seedPartB29Plan.js'
import { buildForceRegenPreview, isVictoryManagedTask } from './victoryPlan.js'

describe('ensureCuratedPartB29Seed', () => {
  it('seeds Part ข 29-day + live tasks into an empty schedule', () => {
    const empty = { tasks: [], sessions: [], notes: {}, meta: {} }
    const { schedule, seeded, reason, draft } = ensureCuratedPartB29Seed(empty, {
      todayIso: '2026-10-15',
    })
    expect(seeded).toBe(true)
    expect(reason).toBe('seeded')
    expect(schedule.meta[CURATED_PLAN_SEED_META_KEY]).toBeTruthy()
    expect(schedule.tasks.length).toBeGreaterThan(0)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(schedule.tasks.some(t => t.subjectId === SUBJECT_IDS.LAW)).toBe(true)
    expect(draft.partBCoverageOk).toBe(true)
  })

  it('does not re-seed when meta flag or curated tasks already exist', () => {
    const empty = { tasks: [], sessions: [], notes: {}, meta: {} }
    const first = ensureCuratedPartB29Seed(empty, { todayIso: '2026-10-15' })
    const second = ensureCuratedPartB29Seed(first.schedule, { todayIso: '2026-10-15' })
    expect(second.seeded).toBe(false)
    expect(second.reason).toBe('already-seeded')
    expect(second.schedule.tasks.length).toBe(first.schedule.tasks.length)
  })
})

describe('commitForceVictoryPlan + preview confirm contract', () => {
  it('clearCuratedSeedMetaFlags does not touch tasks', () => {
    const meta = {
      [CURATED_PLAN_SEED_META_KEY]: 'x',
      curatedPlanSeedTaskCount: 9,
      keepMe: true,
    }
    const next = clearCuratedSeedMetaFlags(meta)
    expect(next.keepMe).toBe(true)
    expect(next[CURATED_PLAN_SEED_META_KEY]).toBeUndefined()
    expect(meta[CURATED_PLAN_SEED_META_KEY]).toBe('x')
  })

  it('preview then skip commit leaves caller schedule identical', () => {
    const first = ensureCuratedPartB29Seed({ tasks: [], meta: {} }, { todayIso: '2026-10-15' })
    const frozenTasks = structuredClone(first.schedule.tasks)
    const preview = buildForceRegenPreview(first.schedule)
    expect(preview.replaceCount).toBeGreaterThan(0)
    expect(first.schedule.tasks).toEqual(frozenTasks)
  })

  it('commit replaces pending, keeps done/userEdited, no duplicate resources, score 100', () => {
    const first = ensureCuratedPartB29Seed({ tasks: [], meta: {} }, { todayIso: '2026-10-15' })
    const curated = first.schedule.tasks.find(t => String(t.id).startsWith('curated_') && t.resourceId)
    const live = first.schedule.tasks.find(t => t.liveKind === 'live')
    const withProgress = {
      ...first.schedule,
      tasks: first.schedule.tasks.map((t) => {
        if (t.id === curated.id) return { ...t, status: 'done' }
        if (live && t.id === live.id) return { ...t, userEdited: true, title: 'my-edit' }
        return t
      }),
    }
    const beforePending = buildForceRegenPreview(withProgress).replaceCount
    const out = commitForceVictoryPlan(withProgress, { todayIso: '2026-10-15', declareBelief: true })
    expect(out.preview.replaceCount).toBe(beforePending)
    expect(out.schedule.tasks.find(t => t.id === curated.id)?.status).toBe('done')
    if (live) {
      expect(out.schedule.tasks.find(t => t.id === live.id)).toMatchObject({
        userEdited: true,
        title: 'my-edit',
      })
    }
    expect(out.schedule.tasks.filter(t => t.resourceId === curated.resourceId)).toHaveLength(1)
    expect(out.readiness.score).toBe(100)
    expect(out.schedule.meta[CURATED_PLAN_SEED_META_KEY]).toBeTruthy()
  })
})

describe('clear managed tasks — preview confirm contract', () => {
  function seededWithMixedProgress() {
    const first = ensureCuratedPartB29Seed({ tasks: [], meta: {} }, { todayIso: '2026-10-15' })
    const curated = first.schedule.tasks.find(t => String(t.id).startsWith('curated_') && t.resourceId)
    const live = first.schedule.tasks.find(t => t.liveKind === 'live')
    const manual = {
      id: 'manual_keep_me',
      title: 'งานมือที่ต้องคง',
      status: 'pending',
      origin: 'user-manual',
      plannedDate: '2026-10-15',
    }
    const withProgress = {
      ...first.schedule,
      tasks: [
        ...first.schedule.tasks.map((t) => {
          if (t.id === curated.id) return { ...t, status: 'done' }
          if (live && t.id === live.id) return { ...t, userEdited: true, title: 'edited-live-clear' }
          return t
        }),
        manual,
      ],
    }
    return { withProgress, curated, live, manual }
  }

  it('buildClearManagedPreview is read-only and counts done/userEdited/pending remove', () => {
    const { withProgress, curated, live, manual } = seededWithMixedProgress()
    const snapshot = structuredClone(withProgress)
    const preview = buildClearManagedPreview(withProgress)
    expect(preview.removeCount).toBeGreaterThan(0)
    expect(preview.removeDoneCount).toBe(1)
    expect(preview.removeUserEditedCount).toBe(live ? 1 : 0)
    expect(preview.removePendingCount).toBe(
      preview.removeCount - preview.removeDoneCount - preview.removeUserEditedCount,
    )
    expect(preview.keepCount).toBeGreaterThanOrEqual(1)
    expect(preview.sampleRemove.some((r) => r.id === curated.id)).toBe(true)
    expect(preview.summaryTh).toMatch(/รวม done/)
    // Opening preview must not mutate schedule
    expect(withProgress).toEqual(snapshot)
    expect(withProgress.tasks.find((t) => t.id === manual.id)).toBeTruthy()
  })

  it('cancel path: preview alone leaves schedule unchanged', () => {
    const { withProgress } = seededWithMixedProgress()
    const frozen = structuredClone(withProgress)
    const preview = buildClearManagedPreview(withProgress)
    // Simulate cancel: discard preview, do not commit
    expect(preview.removeCount).toBeGreaterThan(0)
    expect(withProgress).toEqual(frozen)
  })

  it('confirm removes only victory-managed (incl. done/userEdited) and preserves manual', () => {
    const { withProgress, curated, live, manual } = seededWithMixedProgress()
    const frozen = structuredClone(withProgress)
    const preview = buildClearManagedPreview(withProgress)
    const out = commitClearManagedTasks(withProgress)
    // Input schedule must remain untouched
    expect(withProgress.tasks).toEqual(frozen.tasks)
    expect(out.preview.removeCount).toBe(preview.removeCount)
    expect(out.removedCount).toBe(preview.removeCount)
    expect(out.schedule.tasks.find((t) => t.id === curated.id)).toBeUndefined()
    if (live) {
      expect(out.schedule.tasks.find((t) => t.id === live.id)).toBeUndefined()
    }
    expect(out.schedule.tasks.find((t) => t.id === manual.id)).toMatchObject({
      id: manual.id,
      title: manual.title,
    })
    expect(out.schedule.tasks.every((t) => !isVictoryManagedTask(t))).toBe(true)
    expect(out.schedule.meta[CURATED_PLAN_SEED_META_KEY]).toBeUndefined()
    expect(out.schedule.meta[VICTORY_CLEARED_META_KEY]).toBeTruthy()
    expect(out.keptCount).toBe(out.schedule.tasks.length)
  })

  it('soft seed after clear does not restore managed tasks; force regen does', () => {
    const { withProgress, manual } = seededWithMixedProgress()
    const cleared = commitClearManagedTasks(withProgress)
    expect(cleared.removedCount).toBeGreaterThan(0)
    expect(cleared.schedule.meta[VICTORY_CLEARED_META_KEY]).toBeTruthy()

    const soft = ensureCuratedPartB29Seed(cleared.schedule, { todayIso: '2026-10-15' })
    expect(soft.seeded).toBe(false)
    expect(soft.reason).toBe('user-cleared')
    expect(soft.schedule.tasks.every((t) => !isVictoryManagedTask(t))).toBe(true)
    expect(soft.schedule.tasks.find((t) => t.id === manual.id)).toBeTruthy()

    const forced = commitForceVictoryPlan(cleared.schedule, {
      todayIso: '2026-10-15',
      declareBelief: true,
    })
    expect(forced.seeded).toBe(true)
    expect(forced.schedule.meta[VICTORY_CLEARED_META_KEY]).toBeUndefined()
    expect(forced.schedule.tasks.some(isVictoryManagedTask)).toBe(true)
    expect(forced.schedule.tasks.find((t) => t.id === manual.id)).toBeTruthy()
  })

  it('clear marker survives saveSchedule sanitize (refresh / bootstrap path)', () => {
    const { withProgress } = seededWithMixedProgress()
    const cleared = commitClearManagedTasks(withProgress)
    const mem = new Map()
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)) },
      removeItem: (k) => { mem.delete(k) },
    }
    saveSchedule(cleared.schedule, storage)
    const raw = JSON.parse(storage.getItem(SCHEDULE_KEY))
    expect(raw.meta[VICTORY_CLEARED_META_KEY]).toBeTruthy()
    const loaded = loadSchedule(storage)
    expect(loaded.meta[VICTORY_CLEARED_META_KEY]).toBeTruthy()
    const soft = ensureCuratedPartB29Seed(loaded, { todayIso: '2026-10-15' })
    expect(soft.seeded).toBe(false)
    expect(soft.reason).toBe('user-cleared')
  })

  it('confirm with empty managed set is a no-op on tasks', () => {
    const empty = {
      tasks: [{ id: 'manual_only', title: 'only', origin: 'user-manual' }],
      meta: { keepMe: true },
    }
    const preview = buildClearManagedPreview(empty)
    expect(preview.removeCount).toBe(0)
    const out = commitClearManagedTasks(empty)
    expect(out.removedCount).toBe(0)
    expect(out.schedule.tasks).toHaveLength(1)
    expect(out.schedule.tasks[0].id).toBe('manual_only')
    expect(out.schedule.meta.keepMe).toBe(true)
  })
})

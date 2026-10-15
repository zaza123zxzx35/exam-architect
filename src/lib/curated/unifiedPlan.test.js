import { describe, expect, it } from 'vitest'
import { generateUnifiedStudyDraft, mergeUnifiedDraftIntoSchedule } from './unifiedPlan.js'
import { enrichCuratedResources } from './catalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('unified study draft (priority-first)', () => {
  it('builds a draft spanning exam dates without mutating inputs', () => {
    const catalog = enrichCuratedResources()
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 180,
      catalog,
      mode: 'balanced',
    })
    expect(draft.examPartA).toBe('2026-11-14')
    expect(draft.examPartB).toBe('2026-11-15')
    expect(draft.proposedTasks.length).toBeGreaterThan(5)
    expect(draft.proposedTasks.every(t => t.origin === 'curated-unified-plan')).toBe(true)
    expect(draft.proposedTasks.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(draft.proposedTasks.some(t => t.examPart === 'ก')).toBe(true)
    expect(
      draft.proposedTasks
        .filter(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)
        .every(t => t.examPart === 'ข'),
    ).toBe(true)
    expect(
      draft.proposedTasks
        .filter(t => t.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
        .every(t => t.examPart === 'ก'),
    ).toBe(true)
    expect(draft.proposedTasks.every(t => t.plannedDate >= '2026-10-14' && t.plannedDate <= '2026-11-15')).toBe(true)
    expect(draft.mode).toBe('balanced')
  })

  it('skips existing task ids when generating draft (idempotent proposal)', () => {
    const draftFull = generateUnifiedStudyDraft({ todayIso: '2026-10-14', dailyMinutes: 120 })
    const firstId = draftFull.proposedTasks[0].id
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      existingTaskIds: [firstId],
    })
    expect(draft.proposedTasks.some(t => t.id === firstId)).toBe(false)
  })

  it('merge is add-only: preserves done, pending, and user-edited curated tasks', () => {
    const draft = generateUnifiedStudyDraft({ todayIso: '2026-10-14', dailyMinutes: 120 })
    const [first, second, third] = draft.proposedTasks
    const schedule = {
      tasks: [
        {
          id: first.id,
          title: 'done-title',
          status: 'done',
          plannedDate: '2026-10-01',
          origin: 'curated-unified-plan',
        },
        {
          id: second.id,
          title: 'user-renamed',
          status: 'pending',
          plannedDate: '2026-10-02',
          origin: 'curated-unified-plan',
          userEdited: true,
        },
        {
          id: third.id,
          title: 'pending-kept',
          status: 'pending',
          plannedDate: '2026-10-03',
          origin: 'curated-unified-plan',
        },
      ],
      sessions: [],
    }
    const snap = JSON.stringify(schedule.tasks)
    const merged = mergeUnifiedDraftIntoSchedule(schedule, draft)
    expect(JSON.stringify(schedule.tasks)).toBe(snap)
    expect(merged.tasks.find(t => t.id === first.id)).toMatchObject({
      title: 'done-title',
      status: 'done',
      plannedDate: '2026-10-01',
    })
    expect(merged.tasks.find(t => t.id === second.id)).toMatchObject({
      title: 'user-renamed',
      plannedDate: '2026-10-02',
      userEdited: true,
    })
    expect(merged.tasks.find(t => t.id === third.id)).toMatchObject({
      title: 'pending-kept',
      plannedDate: '2026-10-03',
    })
    expect(merged.lastCuratedMerge.skippedExisting).toBeGreaterThanOrEqual(3)
  })

  it('repeated merge does not duplicate curated ids', () => {
    const draft = generateUnifiedStudyDraft({ todayIso: '2026-10-14', dailyMinutes: 120 })
    const schedule = { tasks: [], sessions: [] }
    const once = mergeUnifiedDraftIntoSchedule(schedule, draft)
    const twice = mergeUnifiedDraftIntoSchedule(once, draft)
    const thrice = mergeUnifiedDraftIntoSchedule(twice, draft)
    const curated = thrice.tasks.filter(t => String(t.id).startsWith('curated_'))
    expect(new Set(curated.map(t => t.id)).size).toBe(curated.length)
    expect(thrice.lastCuratedMerge.added).toBe(0)
    expect(thrice.lastCuratedMerge.skippedExisting).toBe(draft.proposedTasks.length)
  })

  it('skips invalid plannedDate rows and ignores missing resource fields without corrupting schedule', () => {
    const schedule = {
      tasks: [{ id: 'keep-me', title: 'manual', status: 'pending', plannedDate: '2026-10-20' }],
      sessions: [],
    }
    const draft = {
      proposedTasks: [
        {
          id: 'curated_bad_date',
          title: 'bad',
          plannedDate: 'not-a-date',
          status: 'pending',
          origin: 'curated-unified-plan',
        },
        {
          id: 'curated_ok_missing_res',
          title: 'ok without resource',
          plannedDate: '2026-10-21',
          status: 'pending',
          origin: 'curated-unified-plan',
          resourceId: null,
          resourceUrl: '',
        },
      ],
    }
    const merged = mergeUnifiedDraftIntoSchedule(schedule, draft)
    expect(merged.tasks.find(t => t.id === 'keep-me')).toBeTruthy()
    expect(merged.tasks.find(t => t.id === 'curated_bad_date')).toBeUndefined()
    expect(merged.tasks.find(t => t.id === 'curated_ok_missing_res')).toBeTruthy()
    expect(schedule.tasks).toHaveLength(1)
  })

  it('prefers must-score before if-time within the same budget', () => {
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'score-max',
    })
    const resourceTasks = draft.proposedTasks.filter(t => t.resourceId)
    const firstNonMust = resourceTasks.findIndex(t => t.priorityTier === PRIORITY_TIERS.IF_TIME)
    if (firstNonMust >= 0) {
      expect(resourceTasks.slice(0, firstNonMust).every(t => t.priorityTier === PRIORITY_TIERS.MUST)).toBe(true)
    }
    expect(draft.tierCounts.defer).toBeGreaterThan(0)
    expect(draft.deferredSample.length).toBeGreaterThan(0)
  })

  it('regenerated draft after merge respects committed curated day minutes', () => {
    const first = generateUnifiedStudyDraft({ todayIso: '2026-10-14', dailyMinutes: 120, mode: 'balanced' })
    const schedule = mergeUnifiedDraftIntoSchedule({ tasks: [], sessions: [] }, first)
    const second = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'balanced',
      existingTaskIds: schedule.tasks.map(t => t.id),
      existingTasks: schedule.tasks,
    })
    const mergedAgain = mergeUnifiedDraftIntoSchedule(schedule, second)
    const curated = mergedAgain.tasks.filter(t => String(t.id).startsWith('curated_'))
    expect(new Set(curated.map(t => t.id)).size).toBe(curated.length)
    expect(curated.length).toBeLessThan(first.proposedTasks.length * 1.5)
  })

  it('tolerates null/corrupt schedule and duplicate ids in draft without throwing', () => {
    const draft = {
      proposedTasks: [
        { id: 'curated_x', title: 'A', plannedDate: '2026-10-20', status: 'pending' },
        { id: 'curated_x', title: 'A-dup', plannedDate: '2026-10-21', status: 'pending' },
        { id: null, title: 'bad', plannedDate: '2026-10-22' },
      ],
    }
    expect(() => mergeUnifiedDraftIntoSchedule(null, draft)).not.toThrow()
    const merged = mergeUnifiedDraftIntoSchedule({ tasks: [{ id: 'curated_x', title: 'kept' }] }, draft)
    expect(merged.tasks.filter(t => t.id === 'curated_x')).toHaveLength(1)
    expect(merged.tasks.find(t => t.id === 'curated_x').title).toBe('kept')
  })
})

import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { enrichCuratedResources } from './catalog.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import {
  PART_B_29_CAPS,
  PART_B_29_ORIGIN,
  buildPartB29CutPolicy,
  buildPartB29Pack,
  generatePartB29Draft,
  mergePartB29DraftIntoSchedule,
  selectSubjectPack,
} from './partB29Plan.js'
import { rankCuratedCatalog } from './priorityScoring.js'

describe('partB29Plan cut policy', () => {
  it('states cuts are budget/caps — never "will not appear"', () => {
    const policy = buildPartB29CutPolicy()
    expect(policy.honestyTh.some(t => t.includes('ไม่น่าออกสอบ'))).toBe(true)
    expect(policy.honestyTh.some(t => /สถิติความถี่/.test(t))).toBe(true)
    expect(policy.cutGroupsTh.some(g => g.id === 'major-dupes')).toBe(true)
    expect(policy.cutGroupsTh.some(g => g.id === 'part-a-slim')).toBe(true)
    expect(PART_B_29_CAPS[SUBJECT_IDS.ENGLISH_MAJOR].maxItems).toBe(12)
    expect(PART_B_29_CAPS[SUBJECT_IDS.LAW].maxItems).toBe(6)
  })
})

describe('partB29Pack selection', () => {
  it('caps english-major and keeps education must core', () => {
    const ranked = rankCuratedCatalog(enrichCuratedResources(), { mode: 'score-max' })
    const pack = buildPartB29Pack(ranked)
    expect(pack.packs[SUBJECT_IDS.ENGLISH_MAJOR].kept.length).toBeLessThanOrEqual(12)
    expect(pack.packs[SUBJECT_IDS.ENGLISH_MAJOR].minutesKept).toBeLessThanOrEqual(1080)
    expect(pack.packs[SUBJECT_IDS.EDUCATION].kept.length).toBeGreaterThanOrEqual(4)
    expect(pack.packs[SUBJECT_IDS.LAW].kept.length).toBeLessThanOrEqual(6)
    expect(pack.partBQueue.every(e => e.row.examPart === 'ข')).toBe(true)
    expect(pack.partAQueue.every(e => e.row.examPart === 'ก')).toBe(true)
    expect(pack.cutList.length).toBeGreaterThan(10)
  })

  it('deprioritizes bare-share / late major duplicates', () => {
    const ranked = rankCuratedCatalog(enrichCuratedResources(), { mode: 'score-max' })
    const major = selectSubjectPack(ranked, SUBJECT_IDS.ENGLISH_MAJOR)
    const keptIds = new Set(major.kept.map(e => e.row.id))
    expect(keptIds.has('eng-major-share-028')).toBe(false)
    expect(keptIds.has('eng-major-share-029')).toBe(false)
    expect(keptIds.has('eng-major-share-018') || keptIds.has('eng-major-share-001')).toBe(true)
  })
})

describe('generatePartB29Draft', () => {
  it('forces Part ข subjects before exhausting Part ก, within ~29 days', () => {
    const draft = generatePartB29Draft({
      todayIso: '2026-10-15',
      dailyMinutes: 120,
      dayTarget: 29,
      mode: 'score-max',
    })
    expect(draft.dayCount).toBeLessThanOrEqual(29)
    expect(draft.dayCount).toBeGreaterThanOrEqual(1)
    expect(draft.planKind).toBe('part-b-29-forced')
    expect(draft.proposedTasks.every(t => t.origin === PART_B_29_ORIGIN)).toBe(true)

    const resourceTasks = draft.proposedTasks.filter(t => t.resourceId)
    const partB = resourceTasks.filter(t => t.examPart === 'ข')
    const partA = resourceTasks.filter(t => t.examPart === 'ก')
    expect(partB.some(t => t.subjectId === SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(partB.some(t => t.subjectId === SUBJECT_IDS.LAW)).toBe(true)
    expect(partB.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(partA.every(t => t.subjectId !== SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(
      partA.filter(t => t.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
        .every(t => t.examPart === 'ก'),
    ).toBe(true)

    // First study day should be Part ข only (forced phase).
    const firstDate = draft.proposedTasks
      .filter(t => t.resourceId)
      .map(t => t.plannedDate)
      .sort()[0]
    const firstDayParts = new Set(
      draft.proposedTasks
        .filter(t => t.plannedDate === firstDate && t.resourceId)
        .map(t => t.examPart),
    )
    expect(firstDayParts.has('ข')).toBe(true)

    expect(draft.partBMustScheduled).toBeGreaterThan(0)
    expect(draft.partBCoverageOk).toBe(true)
    expect(draft.cutList.length).toBeGreaterThan(0)
    expect(draft.notesTh.some(n => n.includes('ตัดออก'))).toBe(true)
  })

  it('schedules all Part ข pack must items under 120×29 when starting 2026-10-15', () => {
    const draft = generatePartB29Draft({
      todayIso: '2026-10-15',
      dailyMinutes: 120,
      dayTarget: 29,
    })
    expect(draft.unscheduled.partBMustLeft).toBe(0)
    expect(draft.bySubject[SUBJECT_IDS.ENGLISH_MAJOR].scheduled).toBeGreaterThanOrEqual(8)
    expect(draft.bySubject[SUBJECT_IDS.EDUCATION].scheduled).toBeGreaterThanOrEqual(4)
    expect(draft.bySubject[SUBJECT_IDS.LAW].scheduled).toBeGreaterThanOrEqual(4)
    // Part ก is slim — not the full must dump
    expect(draft.bySubject[SUBJECT_IDS.GENERAL_KNOWLEDGE_A].scheduled).toBeLessThanOrEqual(8)
  })

  it('merge is add-only and preserves done / userEdited', () => {
    const draft = generatePartB29Draft({ todayIso: '2026-10-15', dailyMinutes: 120 })
    const [first, second] = draft.proposedTasks.filter(t => t.resourceId)
    const schedule = {
      tasks: [
        {
          id: first.id,
          title: 'done-keep',
          status: 'done',
          plannedDate: '2026-10-01',
          origin: PART_B_29_ORIGIN,
        },
        {
          id: second.id,
          title: 'user-renamed',
          status: 'pending',
          plannedDate: '2026-10-02',
          origin: PART_B_29_ORIGIN,
          userEdited: true,
        },
      ],
      sessions: [],
    }
    const merged = mergePartB29DraftIntoSchedule(schedule, draft)
    expect(merged.tasks.find(t => t.id === first.id)).toMatchObject({
      title: 'done-keep',
      status: 'done',
    })
    expect(merged.tasks.find(t => t.id === second.id)).toMatchObject({
      title: 'user-renamed',
      userEdited: true,
    })
    expect(merged.lastCuratedMerge.added).toBeGreaterThan(0)
  })

  it('does not mix english-skills-a into Part ข queue', () => {
    const ranked = rankCuratedCatalog(enrichCuratedResources(), { mode: 'score-max' })
    const pack = buildPartB29Pack(ranked)
    expect(pack.partBQueue.some(e => e.row.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(false)
    expect(pack.partAQueue.some(e => e.row.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)
    expect(
      pack.partBQueue.filter(e => e.score.tier === PRIORITY_TIERS.MUST).length,
    ).toBeGreaterThan(0)
  })
})

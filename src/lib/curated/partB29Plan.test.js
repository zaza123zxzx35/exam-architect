import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { enrichCuratedResources } from './catalog.js'
import { FIXTURE_CURATED_RESOURCES } from '../../data/curatedCatalog.fixture.js'
import {
  PART_B_29_ORIGIN,
  buildPartB29CutPolicy,
  buildPartB29Pack,
  generatePartB29Draft,
  mergePartB29DraftIntoSchedule,
  selectSubjectPack,
} from './partB29Plan.js'
import { rankCuratedCatalog } from './priorityScoring.js'

function fixtureCatalog() {
  return enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
}

describe('partB29Plan cut policy', () => {
  it('states cuts are budget/caps — never "will not appear"', () => {
    const policy = buildPartB29CutPolicy()
    expect(policy.honestyTh.some(t => t.includes('ไม่น่าออกสอบ'))).toBe(true)
  })
})

describe('partB29Pack selection (fixture catalog)', () => {
  it('builds Part ข pack from fixture without mixing skills-a', () => {
    const ranked = rankCuratedCatalog(fixtureCatalog(), { mode: 'score-max' })
    const pack = buildPartB29Pack(ranked)
    expect(pack.partBQueue.every(e => e.row.examPart === 'ข')).toBe(true)
    expect(pack.partAQueue.every(e => e.row.examPart === 'ก')).toBe(true)
    expect(pack.partBQueue.some(e => e.row.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(false)
  })
})

describe('generatePartB29Draft', () => {
  it('schedules Lady Kaekae major + อ.นนท์ education (law still empty)', () => {
    const draft = generatePartB29Draft({
      todayIso: '2026-10-15',
      dailyMinutes: 120,
      dayTarget: 29,
      catalog: enrichCuratedResources(),
    })
    expect(draft.dayCount).toBeLessThanOrEqual(29)
    const resourceTasks = draft.proposedTasks.filter(t => t.resourceId)
    expect(resourceTasks.length).toBeGreaterThan(0)
    expect(resourceTasks.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(resourceTasks.some(t => t.subjectId === SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(resourceTasks.every(t => (
      t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR
      || t.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A
      || t.subjectId === SUBJECT_IDS.EDUCATION
    ))).toBe(true)
    // law pack not loaded yet — may leave must coverage incomplete
    expect(draft.packSummary.partBItems).toBeGreaterThan(0)
  })

  it('schedules fixture Part ข subjects and keeps merge add-only', () => {
    const draft = generatePartB29Draft({
      todayIso: '2026-10-15',
      dailyMinutes: 120,
      dayTarget: 29,
      catalog: fixtureCatalog(),
    })
    expect(draft.proposedTasks.every(t => (
      t.origin === PART_B_29_ORIGIN || t.origin === 'live-tutor-schedule'
    ))).toBe(true)
    const resourceTasks = draft.proposedTasks.filter(t => t.resourceId)
    expect(resourceTasks.some(t => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(resourceTasks.some(t => t.subjectId === SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(resourceTasks.some(t => t.subjectId === SUBJECT_IDS.LAW)).toBe(true)

    const [first] = resourceTasks
    const schedule = {
      tasks: [{
        id: first.id,
        title: 'done-keep',
        status: 'done',
        plannedDate: '2026-10-01',
        origin: PART_B_29_ORIGIN,
      }],
      sessions: [],
    }
    const merged = mergePartB29DraftIntoSchedule(schedule, draft)
    expect(merged.tasks.find(t => t.id === first.id)).toMatchObject({
      title: 'done-keep',
      status: 'done',
    })
  })

  it('selectSubjectPack respects caps on fixture major rows', () => {
    const ranked = rankCuratedCatalog(fixtureCatalog(), { mode: 'score-max' })
    const major = selectSubjectPack(ranked, SUBJECT_IDS.ENGLISH_MAJOR)
    expect(major.kept.length).toBeLessThanOrEqual(12)
    expect(major.kept.length).toBeGreaterThan(0)
  })
})

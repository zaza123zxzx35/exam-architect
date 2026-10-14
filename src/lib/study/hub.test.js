import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initialQuizzes } from '../../data/quizData.js'
import { initialNotes } from '../../data/notesData.js'
import { initialVideos } from '../../data/videoData.js'
import { initialStudyPlan } from '../../data/planData.js'
import { importantLinks } from '../../data/htmlPlannerData.js'
import { SUBJECT_IDS } from './taxonomy.js'
import {
  buildStudyHubCatalog,
  countByExamPart,
  describeHubFilterStatus,
  filterStudyHubItems,
  HUB_EXAM_PART_FILTERS,
} from './hub.js'

const hubSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'hub.js'),
  'utf8',
)

function seedCatalog() {
  return buildStudyHubCatalog({
    quizzes: initialQuizzes,
    notes: initialNotes,
    videos: initialVideos,
    planItems: initialStudyPlan,
    links: importantLinks.map((link, index) => ({
      id: `important_${index}`,
      title: link.name,
      url: link.url,
      source: 'importantLinks',
    })),
  })
}

describe('study resource hub (Phase 3)', () => {
  it('defaults filters to all and never reads scheduleExamId for filtering', () => {
    expect(hubSource).toContain('Intentionally ignores taxonomy.scheduleExamId')
    expect(hubSource).not.toMatch(/filters\.scheduleExamId|scheduleExamId\s*===|scheduleExamId\s*!==/)
    const catalog = seedCatalog()
    const unfiltered = filterStudyHubItems(catalog)
    expect(unfiltered.length).toBe(catalog.length)
    expect(unfiltered.length).toBeGreaterThan(20)
  })

  it('classifies on read and keeps english-skills-a ≠ english-major', () => {
    const catalog = seedCatalog()
    const skills = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const major = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    expect(skills.length).toBeGreaterThan(0)
    expect(major.length).toBeGreaterThan(0)
    expect(skills.every(i => i.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(major.every(i => i.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(skills.some(i => i.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)
  })

  it('filters by examPart and kind without inventing items', () => {
    const catalog = seedCatalog()
    const partA = filterStudyHubItems(catalog, { examPart: 'ก' })
    const quizzes = filterStudyHubItems(catalog, { kind: 'quiz' })
    expect(partA.every(i => i.taxonomy.examPart === 'ก')).toBe(true)
    expect(quizzes.every(i => i.kind === 'quiz')).toBe(true)
    expect(quizzes.length).toBe(initialQuizzes.length)
  })

  it('exposes stable examPart filter ids including unknown/mixed', () => {
    expect(HUB_EXAM_PART_FILTERS).toEqual([
      'all', 'ก', 'ข', 'ค', 'admin', 'mixed', 'unknown',
    ])
    const counts = countByExamPart(seedCatalog())
    expect(counts.all).toBeGreaterThan(0)
    expect(Object.keys(counts)).toEqual(expect.arrayContaining(HUB_EXAM_PART_FILTERS))
  })

  it('describeHubFilterStatus reflects default, ภาค ก, and English subject selections', () => {
    const catalog = seedCatalog()
    const defaultStatus = describeHubFilterStatus({
      catalogCount: catalog.length,
      filteredCount: catalog.length,
      examPart: 'all',
      subjectId: 'all',
      kind: 'all',
    })
    expect(defaultStatus).toContain('ตัวกรองเริ่มต้น')
    expect(defaultStatus).toContain('ทุกภาค')
    expect(defaultStatus).not.toContain('ค่าเริ่มต้น: ทุกภาค)')

    const partA = filterStudyHubItems(catalog, { examPart: 'ก' })
    const partAStatus = describeHubFilterStatus({
      catalogCount: catalog.length,
      filteredCount: partA.length,
      examPart: 'ก',
      subjectId: 'all',
      kind: 'all',
    })
    expect(partAStatus).toContain('ภาค ก')
    expect(partAStatus).toContain(`แสดง ${partA.length} รายการตามตัวกรอง`)
    expect(partAStatus).not.toContain('ตัวกรองเริ่มต้น')

    const skills = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const major = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    const skillsStatus = describeHubFilterStatus({
      catalogCount: catalog.length,
      filteredCount: skills.length,
      examPart: 'all',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      kind: 'all',
    })
    const majorStatus = describeHubFilterStatus({
      catalogCount: catalog.length,
      filteredCount: major.length,
      examPart: 'all',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      kind: 'all',
    })
    expect(skillsStatus).toContain('อังกฤษ ภาค ก')
    expect(majorStatus).toContain('วิชาเอกอังกฤษ')
    expect(skillsStatus).not.toContain('วิชาเอกอังกฤษ')
    expect(majorStatus).not.toContain('อังกฤษ ภาค ก')
    expect(skills.length).not.toBe(major.length)
  })

  it('does not use task.examId / scheduleExamId to assign content filters', () => {
    const catalog = buildStudyHubCatalog({
      quizzes: [],
      notes: [],
      videos: [],
      planItems: [],
      links: [{ id: 'l1', title: 'เอกสารสมัคร', url: 'https://example.com/a', source: 'test' }],
    })
    // Even if a caller stuffed scheduleExamId onto taxonomy, filter must ignore it.
    const poisoned = catalog.map(item => ({
      ...item,
      taxonomy: { ...item.taxonomy, scheduleExamId: 'exam-ก-fake' },
    }))
    const filtered = filterStudyHubItems(poisoned, { examPart: 'ก' })
    expect(filtered.every(i => i.taxonomy.examPart === 'ก')).toBe(true)
    // Admin/unknown links must not appear under ก solely because of scheduleExamId
    expect(filtered.every(i => i.taxonomy.scheduleExamId === 'exam-ก-fake' ? i.taxonomy.examPart === 'ก' : true)).toBe(true)
    const onlyByFakeSchedule = poisoned.filter(i => i.taxonomy.scheduleExamId === 'exam-ก-fake' && i.taxonomy.examPart !== 'ก')
    expect(filterStudyHubItems(onlyByFakeSchedule, { examPart: 'ก' })).toHaveLength(0)
  })
})

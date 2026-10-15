import { describe, expect, it } from 'vitest'
import { curatedResources } from '../../data/curatedCatalog.js'
import {
  auditCuratedCatalog,
  curationStageForKind,
  CURATION_STAGE_ORDER,
  listNeedsFullUrlReport,
  validateCuratedRow,
} from './validateCatalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { URL_STATUS } from './urlStatus.js'

describe('curated catalog integrity audit', () => {
  it('audits all seed rows with no hard errors and stable inventory size', () => {
    const audit = auditCuratedCatalog()
    expect(audit.totalRows).toBe(217)
    expect(audit.totalRows).toBe(curatedResources.length)
    expect(audit.errorCount).toBe(0)
    expect(audit.ok).toBe(true)
    expect(audit.needsFullUrlIds.length).toBe(67)
    expect(CURATION_STAGE_ORDER).toEqual([
      'foundation',
      'lesson-or-video',
      'practice',
      'exam-review',
      'weakness-review',
    ])
  })

  it('reports needs_full_url list for user follow-up without deleting rows', () => {
    const audit = auditCuratedCatalog()
    const report = listNeedsFullUrlReport(audit)
    expect(report.count).toBe(67)
    expect(report.ids).toContain('math-spth69-01')
    expect(report.noteTh).toMatch(/URL เต็ม/)
  })

  it('flags invalid subject / english part mismatch / verified without evidence', () => {
    const badMajor = validateCuratedRow({
      id: 'x-major',
      title: 'test',
      kind: 'lesson',
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      url: 'https://example.com/a',
      series: 't',
      priority: 1,
      source: 'test',
    })
    expect(badMajor.some(i => i.code === 'english-major-part-mismatch')).toBe(true)

    const badSkills = validateCuratedRow({
      id: 'x-skills',
      title: 'test',
      kind: 'lesson',
      examPart: 'ข',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      url: 'https://example.com/a',
      series: 't',
      priority: 1,
      source: 'test',
    })
    expect(badSkills.some(i => i.code === 'english-skills-part-mismatch')).toBe(true)

    const fakeVerified = validateCuratedRow({
      id: 'x-ver',
      title: 'test',
      kind: 'lesson',
      examPart: 'ก',
      subjectId: 'math',
      url: 'https://example.com/ok',
      urlStatus: URL_STATUS.VERIFIED_ACCESSIBLE,
      series: 't',
      priority: 1,
      source: 'test',
    })
    expect(fakeVerified.some(i => i.code === 'verified-without-evidence')).toBe(true)
  })

  it('maps kinds to curation stages (estimates) and reports shared URLs without auto-delete', () => {
    expect(curationStageForKind('document')).toBe('foundation')
    expect(curationStageForKind('lesson')).toBe('lesson-or-video')
    expect(curationStageForKind('quiz-practice')).toBe('practice')
    expect(curationStageForKind('answer-key')).toBe('exam-review')

    const shared = [
      {
        id: 'a1',
        title: 'Same A',
        kind: 'lesson',
        examPart: 'ก',
        subjectId: 'math',
        url: 'https://drive.google.com/file/d/abc/view',
        series: 's',
        priority: 1,
        source: 't',
        estimatedMinutes: 30,
      },
      {
        id: 'a2',
        title: 'Same B',
        kind: 'lesson',
        examPart: 'ก',
        subjectId: 'math',
        url: 'https://drive.google.com/file/d/abc/view',
        series: 's',
        priority: 2,
        source: 't',
        estimatedMinutes: 30,
      },
    ]
    const audit = auditCuratedCatalog(shared)
    expect(audit.sharedUrls.length).toBe(1)
    expect(audit.warnings.some(w => w.code === 'shared-url')).toBe(true)
    expect(audit.totalRows).toBe(2)
  })

  it('detects duplicate ids as errors but does not mutate the catalog', () => {
    const snap = JSON.stringify(curatedResources)
    const dup = [
      { ...curatedResources[0], id: 'dup-id' },
      { ...curatedResources[1], id: 'dup-id', title: 'other' },
    ]
    const audit = auditCuratedCatalog(dup)
    expect(audit.errors.some(e => e.code === 'duplicate-id')).toBe(true)
    expect(JSON.stringify(curatedResources)).toBe(snap)
  })
})

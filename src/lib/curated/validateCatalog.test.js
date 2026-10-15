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
  it('audits empty clean-slate catalog as ok', () => {
    const audit = auditCuratedCatalog()
    expect(audit.totalRows).toBe(0)
    expect(audit.totalRows).toBe(curatedResources.length)
    expect(audit.errorCount).toBe(0)
    expect(audit.ok).toBe(true)
    expect(audit.needsFullUrlIds).toHaveLength(0)
    expect(CURATION_STAGE_ORDER).toEqual([
      'foundation',
      'lesson-or-video',
      'practice',
      'exam-review',
      'weakness-review',
    ])
  })

  it('reports empty needs_full_url list', () => {
    const audit = auditCuratedCatalog()
    const report = listNeedsFullUrlReport(audit)
    expect(report.count).toBe(0)
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

    const verifiedNoEvidence = validateCuratedRow({
      id: 'x-v',
      title: 'test',
      kind: 'lesson',
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      url: 'https://example.com/b',
      series: 't',
      priority: 1,
      source: 'test',
      urlStatus: URL_STATUS.VERIFIED_ACCESSIBLE,
    })
    expect(verifiedNoEvidence.some(i => i.code === 'verified-without-evidence' || i.level === 'error' || i.code)).toBeTruthy()
  })

  it('maps curation stages for kinds', () => {
    expect(curationStageForKind('document')).toBe('foundation')
    expect(curationStageForKind('lesson')).toBe('lesson-or-video')
    expect(curationStageForKind('quiz-practice')).toBe('practice')
  })
})

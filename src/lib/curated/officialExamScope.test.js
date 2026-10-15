import { describe, expect, it } from 'vitest'
import { enrichCuratedResources } from './catalog.js'
import { FIXTURE_CURATED_RESOURCES } from '../../data/curatedCatalog.fixture.js'
import { SUBJECT_IDS, subjectIdToExamPart } from '../study/taxonomy.js'
import {
  OFFICIAL_SCOPE_CHECKED_AT,
  OFFICIAL_SCOPE_SOURCES,
  SUBJECT_OFFICIAL_SCOPE,
  auditRowAgainstOfficialScope,
  buildOfficialScopeReport,
  getOfficialScopeForSubject,
} from './officialExamScope.js'

describe('official exam scope (Phase 8.2)', () => {
  it('records official sources with agency, date, and URL', () => {
    expect(OFFICIAL_SCOPE_CHECKED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(OFFICIAL_SCOPE_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const s of OFFICIAL_SCOPE_SOURCES) {
      expect(s.agencyTh.length).toBeGreaterThan(3)
      expect(s.dated.length).toBeGreaterThan(3)
      expect(s.url).toMatch(/^https?:\/\//)
      expect(s.titleTh.length).toBeGreaterThan(5)
    }
    expect(OFFICIAL_SCOPE_SOURCES.some(s => s.id === 'otepc-w14-2566')).toBe(true)
    expect(OFFICIAL_SCOPE_SOURCES.some(s => s.id === 'sesao1-announce-2569')).toBe(true)
  })

  it('places education and law in Part ข per official curriculum (not Part ก)', () => {
    expect(SUBJECT_OFFICIAL_SCOPE[SUBJECT_IDS.EDUCATION].examPart).toBe('ข')
    expect(SUBJECT_OFFICIAL_SCOPE[SUBJECT_IDS.EDUCATION].status).toBe('verified_official')
    expect(SUBJECT_OFFICIAL_SCOPE[SUBJECT_IDS.LAW].examPart).toBe('ข')
    expect(SUBJECT_OFFICIAL_SCOPE[SUBJECT_IDS.LAW].status).toBe('verified_official')
    expect(subjectIdToExamPart(SUBJECT_IDS.EDUCATION)).toBe('ข')
    expect(subjectIdToExamPart(SUBJECT_IDS.LAW)).toBe('ข')
  })

  it('keeps english-skills-a on ก and english-major on ข', () => {
    expect(getOfficialScopeForSubject(SUBJECT_IDS.ENGLISH_SKILLS_A).examPart).toBe('ก')
    expect(getOfficialScopeForSubject(SUBJECT_IDS.ENGLISH_MAJOR).examPart).toBe('ข')
    expect(subjectIdToExamPart(SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe('ก')
    expect(subjectIdToExamPart(SUBJECT_IDS.ENGLISH_MAJOR)).toBe('ข')
  })

  it('catalog education/law rows match official Part ข (no silent Part ก leftovers)', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const edu = catalog.filter(r => r.subjectId === SUBJECT_IDS.EDUCATION)
    const law = catalog.filter(r => r.subjectId === SUBJECT_IDS.LAW)
    expect(edu.length).toBeGreaterThan(0)
    expect(law.length).toBeGreaterThan(0)
    expect(edu.every(r => r.examPart === 'ข')).toBe(true)
    expect(law.every(r => r.examPart === 'ข')).toBe(true)
    const report = buildOfficialScopeReport(catalog)
    expect(report.mismatches.filter(m => m.subjectId === SUBJECT_IDS.EDUCATION || m.subjectId === SUBJECT_IDS.LAW)).toHaveLength(0)
  })

  it('flags a fabricated Part ก education row as mismatch without inventing URLs', () => {
    const audit = auditRowAgainstOfficialScope({
      id: 'fake-edu',
      subjectId: SUBJECT_IDS.EDUCATION,
      examPart: 'ก',
    })
    expect(audit.ok).toBe(false)
    expect(audit.officialExamPart).toBe('ข')
    expect(audit.messageTh).toMatch(/ภาค ข/)
  })

  it('does not mark catalog URLs as verified_accessible in scope report', () => {
    const catalog = enrichCuratedResources()
    expect(catalog.every(r => r.urlStatus !== 'verified_accessible')).toBe(true)
    const report = buildOfficialScopeReport(catalog)
    expect(report.limitationsTh.length).toBeGreaterThan(0)
    expect(report.checkedAt).toBe(OFFICIAL_SCOPE_CHECKED_AT)
  })
})

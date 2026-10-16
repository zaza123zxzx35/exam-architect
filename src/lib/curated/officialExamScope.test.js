import { describe, expect, it } from 'vitest'
import { enrichCuratedResources } from './catalog.js'
import { FIXTURE_CURATED_RESOURCES } from '../../data/curatedCatalog.fixture.js'
import { SUBJECT_IDS, subjectIdToExamPart } from '../study/taxonomy.js'
import {
  OFFICIAL_SCOPE_CHECKED_AT,
  OFFICIAL_SCOPE_SOURCES,
  OFFICIAL_CURRICULUM_BUCKETS,
  OFFICIAL_EXAM_TOTAL_SCORE,
  SUBJECT_OFFICIAL_SCOPE,
  auditRowAgainstOfficialScope,
  buildOfficialScopeReport,
  getOfficialScopeForSubject,
  resolveSubjectScoreBucket,
  sumOfficialBucketScores,
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

  it('official buckets sum to 400 with correct part totals and percents', () => {
    expect(OFFICIAL_EXAM_TOTAL_SCORE).toBe(400)
    expect(sumOfficialBucketScores('ก')).toBe(200)
    expect(sumOfficialBucketScores('ข')).toBe(200)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('คิดวิเคราะห์'))?.maxScore).toBe(100)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('ทักษะภาษาอังกฤษ'))?.maxScore).toBe(50)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('ข้าราชการที่ดี'))?.maxScore).toBe(50)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('วิชาเอก') || b.titleTh.includes('เนื้อหาวิชาที่สอน'))?.maxScore).toBe(100)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('จัดการเรียนการสอน'))?.maxScore).toBe(75)
    expect(OFFICIAL_CURRICULUM_BUCKETS.find((b) => b.titleTh.includes('กฎหมาย'))?.maxScore).toBe(25)
    const major = resolveSubjectScoreBucket(SUBJECT_IDS.ENGLISH_MAJOR)
    expect(major.status).toBe('mapped')
    expect(major.percentOfTotal).toBe(25)
    const law = resolveSubjectScoreBucket(SUBJECT_IDS.LAW)
    expect(law.percentOfTotal).toBe(6.25)
    const awaiting = resolveSubjectScoreBucket(SUBJECT_IDS.UNKNOWN)
    expect(awaiting.status).toBe('awaiting_subject_mapping')
    expect(awaiting.reasonTh).toMatch(/รอยืนยันหมวดวิชา/)
    expect(resolveSubjectScoreBucket('not-a-real-subject').status).toBe('awaiting_subject_mapping')
  })
})

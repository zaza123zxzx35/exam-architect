/**
 * Phase 6 integration checks — cross-module invariants without browser.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initialQuizzes } from '../../data/quizData.js'
import { initialNotes } from '../../data/notesData.js'
import { initialVideos } from '../../data/videoData.js'
import { initialStudyPlan } from '../../data/planData.js'
import { importantLinks } from '../../data/htmlPlannerData.js'
import { buildStudyHubCatalog, filterStudyHubItems } from './hub.js'
import { SUBJECT_IDS } from './taxonomy.js'
import { findTutorResources } from '../assistant/tutorResources.js'
import { districtEvidenceSummary, sanitizeCompetitionRecords } from '../district/intelligence.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('Phase 6 integration & QA invariants', () => {
  const catalog = buildStudyHubCatalog({
    quizzes: initialQuizzes,
    notes: initialNotes,
    videos: initialVideos,
    planItems: initialStudyPlan,
    links: importantLinks.map((link, i) => ({
      id: `important_${i}`,
      title: link.name,
      url: link.url,
      source: 'importantLinks',
    })),
  })

  it('hub + tutor agree on english-skills-a ≠ english-major', () => {
    const hubSkills = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const hubMajor = filterStudyHubItems(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    expect(hubSkills.length).toBeGreaterThan(0)
    expect(hubMajor.length).toBeGreaterThan(0)
    expect(hubSkills.some(i => i.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)

    const tutorSkills = findTutorResources('หาวิดีโอ ภาค ก ภาษาอังกฤษ', { catalog })
    const tutorMajor = findTutorResources('หาวิดีโอ วิชาเอกอังกฤษ', { catalog })
    expect(tutorSkills.hits.every(h => h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(tutorMajor.hits.every(h => h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
  })

  it('hub filter path never consults scheduleExamId', () => {
    const hubSrc = readFileSync(join(root, 'lib/study/hub.js'), 'utf8')
    expect(hubSrc).toContain('Intentionally ignores taxonomy.scheduleExamId')
    const poisoned = catalog.map(item => ({
      ...item,
      taxonomy: { ...item.taxonomy, scheduleExamId: 'should-not-match-ก' },
    }))
    const onlyUnknown = poisoned.filter(i => i.taxonomy.examPart === 'unknown')
    expect(filterStudyHubItems(onlyUnknown, { examPart: 'ก' })).toHaveLength(0)
  })

  it('district layer stays user-local and does not invent vacancies', () => {
    const summary = districtEvidenceSummary([
      { id: 'seed-x', district: 'seed' },
      { id: 'record-1', district: 'สพป.ทดสอบ', vacancies: 1, applicants: 10, updatedAt: '2026-10-01', sourceUrl: 'https://example.com' },
    ])
    expect(sanitizeCompetitionRecords([{ id: 'seed-x' }, { id: 'record-1', district: 'x' }])).toHaveLength(1)
    expect(summary.inventsVacancies).toBe(false)
    expect(summary.provenance).toBe('user-local-only')
    expect(summary.recordCount).toBe(1)
  })

  it('resources and assistant pages import shared UI + hub/tutor modules', () => {
    const resources = readFileSync(join(root, 'pages/Resources.jsx'), 'utf8')
    const assistant = readFileSync(join(root, 'pages/Assistant.jsx'), 'utf8')
    const handlers = readFileSync(join(root, 'lib/assistant/handlers.js'), 'utf8')
    expect(resources).toContain('buildStudyHubCatalog')
    expect(resources).toContain('FilterChips')
    expect(assistant).toContain('PageHeader')
    expect(handlers).toContain('findTutorResources')
  })
})

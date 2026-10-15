import { describe, expect, it } from 'vitest'
import { curatedResources } from '../../data/curatedCatalog.js'
import {
  enrichCuratedResources,
  filterCuratedResources,
  summarizeCuratedUrlStatuses,
  recommendCuratedForSubject,
} from './catalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

describe('curated catalog', () => {
  it('loads user-curated inventory with stable ids and no invented URLs for stubs', () => {
    expect(curatedResources.length).toBe(210)
    const ids = new Set(curatedResources.map(r => r.id))
    expect(ids.size).toBe(curatedResources.length)
    const stubs = curatedResources.filter(r => r.url.includes('...'))
    expect(stubs.length).toBe(55)
    const enriched = enrichCuratedResources()
    expect(enriched.filter(r => r.urlStatus === 'needs_full_url').length).toBe(55)
    expect(enriched.filter(r => r.urlStatus === 'unchecked').length).toBe(155)
    expect(enriched.filter(r => r.urlStatus === 'verified_accessible').length).toBe(0)
    expect(curatedResources.filter(r => r.id.startsWith('math-gab-'))).toHaveLength(19)
    expect(curatedResources.filter(r => r.id.startsWith('thai-tee-'))).toHaveLength(17)
  })

  it('keeps english-skills-a separate from english-major', () => {
    const catalog = enrichCuratedResources()
    const skills = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const major = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    expect(skills.length).toBeGreaterThan(0)
    expect(major.length).toBeGreaterThan(0)
    expect(skills.every(r => r.examPart === 'ก')).toBe(true)
    expect(major.every(r => r.examPart === 'ข')).toBe(true)
    expect(skills.some(r => r.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)
  })

  it('summarizes URL statuses and recommends by subject from real catalog', () => {
    const catalog = enrichCuratedResources()
    const summary = summarizeCuratedUrlStatuses(catalog)
    expect(summary.total).toBe(catalog.length)
    expect(summary.needs_full_url + summary.unchecked).toBeGreaterThan(0)
    const law = recommendCuratedForSubject('law', catalog, { limit: 3 })
    expect(law.length).toBeGreaterThan(0)
    expect(law.every(r => r.subjectId === 'law')).toBe(true)
  })
})

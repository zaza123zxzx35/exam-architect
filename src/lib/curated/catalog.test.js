import { describe, expect, it } from 'vitest'
import { curatedResources, CURATED_CATALOG_VERSION } from '../../data/curatedCatalog.js'
import {
  enrichCuratedResources,
  filterCuratedResources,
  summarizeCuratedUrlStatuses,
  recommendCuratedForSubject,
} from './catalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

describe('curated catalog', () => {
  it('ships Lady Kaekae สพฐ.69 English ก+ข pack', () => {
    expect(CURATED_CATALOG_VERSION).toMatch(/lady-kaekae/)
    expect(curatedResources.length).toBeGreaterThan(0)
    const enriched = enrichCuratedResources()
    expect(enriched.length).toBe(curatedResources.length)
    const summary = summarizeCuratedUrlStatuses(enriched)
    expect(summary.total).toBe(curatedResources.length)
    expect(summary.needs_full_url || 0).toBe(0)
  })

  it('keeps ภาค ก = english-skills-a and ภาค ข = english-major', () => {
    const catalog = enrichCuratedResources()
    const partA = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const partB = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    expect(partA.length).toBeGreaterThan(0)
    expect(partB.length).toBeGreaterThan(0)
    expect(partA.every(r => r.examPart === 'ก')).toBe(true)
    expect(partB.every(r => r.examPart === 'ข')).toBe(true)
    expect(recommendCuratedForSubject(SUBJECT_IDS.ENGLISH_MAJOR, catalog, { limit: 3 }).length).toBeGreaterThan(0)
  })

  it('excludes อปท / กทม / O-NET / ใบประกอบ from this pack', () => {
    const blocked = /อปท|กทม|O-NET|ใบประกอบ|ท้องถิ่น/i
    const hits = curatedResources.filter(r =>
      blocked.test(r.title) || blocked.test(r.series) || blocked.test(r.notes || ''),
    )
    expect(hits).toHaveLength(0)
  })

  it('marks must / if-time / defer packs in notes', () => {
    const packs = { must: 0, 'if-time': 0, defer: 0 }
    for (const r of curatedResources) {
      const m = String(r.notes || '').match(/pack:(must|if-time|defer)/)
      if (m) packs[m[1]] += 1
    }
    expect(packs.must).toBeGreaterThan(20)
    expect(packs['if-time']).toBeGreaterThan(10)
    expect(packs.defer).toBeGreaterThan(5)
  })
})

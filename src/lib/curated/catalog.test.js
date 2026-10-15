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
  it('ships v15 packs including Thai + civil-servant-a', () => {
    expect(CURATED_CATALOG_VERSION).toMatch(/fb-watch-csv|thai-civil/)
    expect(curatedResources.length).toBeGreaterThan(0)
    expect(curatedResources.every(Boolean)).toBe(true)
    const enriched = enrichCuratedResources()
    expect(enriched.length).toBe(curatedResources.length)
    const summary = summarizeCuratedUrlStatuses(enriched)
    expect(summary.total).toBe(curatedResources.length)
    // Only incomplete Drive stubs remain after facebook_drive_links_repaired.csv
    expect(summary.needs_full_url).toBe(4)
    expect(summary.unchecked).toBe(curatedResources.length - 4)
  })

  it('keeps Part ก/ข taxonomy across all packs', () => {
    const catalog = enrichCuratedResources()
    const partA = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const partB = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    const edu = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.EDUCATION })
    const law = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.LAW })
    const math = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.MATH })
    const thai = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A })
    const civil = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.CIVIL_SERVANT_A })
    expect(partA.length).toBeGreaterThan(0)
    expect(partB.length).toBeGreaterThan(0)
    expect(edu.length).toBeGreaterThan(0)
    expect(law.length).toBeGreaterThan(0)
    expect(math.length).toBe(28)
    expect(thai.length).toBe(6)
    expect(civil.length).toBe(16)
    expect(thai.every(r => r.examPart === 'ก')).toBe(true)
    expect(civil.every(r => r.examPart === 'ก')).toBe(true)
    expect(law.every(r => r.examPart === 'ข')).toBe(true)
    expect(civil.some(r => r.tutorTh === 'อ.นนท์')).toBe(true)
    expect(civil.some(r => r.tutorTh === 'ขงเบ้ง')).toBe(true)
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

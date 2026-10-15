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
  it('ships English + อ.นนท์ edu/law + math packs', () => {
    expect(CURATED_CATALOG_VERSION).toMatch(/math-num-gab/)
    expect(curatedResources.length).toBeGreaterThan(0)
    expect(curatedResources.every(Boolean)).toBe(true)
    const enriched = enrichCuratedResources()
    expect(enriched.length).toBe(curatedResources.length)
    const summary = summarizeCuratedUrlStatuses(enriched)
    expect(summary.total).toBe(curatedResources.length)
    // อ.นนท์ Facebook/Drive stubs are incomplete — honest needs_full_url
    expect(summary.needs_full_url).toBeGreaterThan(0)
  })

  it('keeps taxonomy and math ก packs (YT must + Gab supplement)', () => {
    const catalog = enrichCuratedResources()
    const partA = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A })
    const partB = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
    const edu = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.EDUCATION })
    const law = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.LAW })
    const math = filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.MATH })
    expect(partA.length).toBeGreaterThan(0)
    expect(partB.length).toBeGreaterThan(0)
    expect(edu.length).toBeGreaterThan(0)
    expect(law.length).toBeGreaterThan(0)
    expect(math.length).toBe(28)
    expect(partA.every(r => r.examPart === 'ก')).toBe(true)
    expect(math.every(r => r.examPart === 'ก')).toBe(true)
    expect(partB.every(r => r.examPart === 'ข')).toBe(true)
    expect(edu.every(r => r.examPart === 'ข' && r.tutorTh === 'อ.นนท์')).toBe(true)
    expect(law.every(r => r.examPart === 'ข' && r.tutorTh === 'อ.นนท์')).toBe(true)
    expect(math.filter(r => r.id.startsWith('math-num-')).every(r => /pack:must/.test(r.notes))).toBe(true)
    expect(math.filter(r => r.id.startsWith('math-gab-')).length).toBe(19)
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

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
  it('starts from a clean slate awaiting tutor packs', () => {
    expect(CURATED_CATALOG_VERSION).toMatch(/clean-slate/)
    expect(curatedResources.length).toBe(0)
    const enriched = enrichCuratedResources()
    expect(enriched).toHaveLength(0)
    const summary = summarizeCuratedUrlStatuses(enriched)
    expect(summary.total).toBe(0)
  })

  it('keeps filter / recommend helpers safe on empty catalog', () => {
    const catalog = enrichCuratedResources()
    expect(filterCuratedResources(catalog, { subjectId: SUBJECT_IDS.ENGLISH_MAJOR })).toHaveLength(0)
    expect(recommendCuratedForSubject('law', catalog, { limit: 3 })).toHaveLength(0)
  })
})

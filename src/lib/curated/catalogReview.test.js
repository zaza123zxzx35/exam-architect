import { describe, expect, it } from 'vitest'
import { buildCatalogReviewReport } from './catalogReview.js'
import { curatedResources } from '../../data/curatedCatalog.js'

describe('catalog review report', () => {
  it('reports Lady Kaekae inventory without inventing URLs', () => {
    const report = buildCatalogReviewReport()
    expect(report.summary.total).toBe(curatedResources.length)
    expect(report.summary.total).toBeGreaterThan(0)
    expect(report.summary.needs_full_url).toBeGreaterThan(0)
    expect(report.needsFullUrlSlots.length).toBeGreaterThan(0)
    expect(report.mathStubsNeedingFullUrl).toHaveLength(0)
    expect(report.officialScope.educationOfficialPart).toBe('ข')
    expect(report.officialScope.lawOfficialPart).toBe('ข')
    expect(report.confirmedSameSeriesUrlCollisions.some((g) => (
      g.ids.includes('law-nonn-22') && g.ids.includes('law-nonn-24')
    ))).toBe(true)
  })
})

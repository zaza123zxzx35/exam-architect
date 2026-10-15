import { describe, expect, it } from 'vitest'
import { buildCatalogReviewReport } from './catalogReview.js'
import { curatedResources } from '../../data/curatedCatalog.js'

describe('catalog review report', () => {
  it('reports empty clean-slate inventory without inventing URLs', () => {
    const report = buildCatalogReviewReport()
    expect(report.summary.total).toBe(0)
    expect(report.summary.needs_full_url).toBe(0)
    expect(report.summary.unchecked).toBe(0)
    expect(report.needsFullUrlSlots).toHaveLength(0)
    expect(report.mathStubsNeedingFullUrl).toHaveLength(0)
    expect(report.officialScope.educationOfficialPart).toBe('ข')
    expect(report.officialScope.lawOfficialPart).toBe('ข')
    expect(curatedResources).toHaveLength(0)
  })
})

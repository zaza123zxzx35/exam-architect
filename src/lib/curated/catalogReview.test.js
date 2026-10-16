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

  it('marks shared-url and law collisions as awaiting_confirmation, not confirmed duplicates', () => {
    const report = buildCatalogReviewReport()
    const law = report.confirmedSameSeriesUrlCollisions.find((g) => (
      g.ids.includes('law-nonn-22') && g.ids.includes('law-nonn-24')
    ))
    expect(law).toBeTruthy()
    expect(law.verificationStatus).toBe('awaiting_confirmation')
    expect(law.contentDuplicateConfirmed).toBe(false)
    expect(law.ownerHeldLawPair).toBe(true)
    expect(law.actionTh).toMatch(/ห้ามสลับ/)

    const ladyShare = report.sharedUrlGroups.find((g) => g.ladyAbPending)
    expect(ladyShare).toBeTruthy()
    expect(ladyShare.verificationStatus).toBe('awaiting_confirmation')
    expect(ladyShare.contentDuplicateConfirmed).toBe(false)
    expect(ladyShare.actionTh).toMatch(/รอยืนยัน/)

    expect(report.policyTh.some((p) => p.includes('ห้ามแนะนำข้ามบท'))).toBe(true)
    expect(curatedResources.some((r) => r.id === 'lady-a-013')).toBe(true)
    expect(curatedResources.some((r) => r.id === 'lady-b-011')).toBe(true)
  })
})

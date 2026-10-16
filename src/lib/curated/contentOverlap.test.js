import { describe, expect, it } from 'vitest'
import {
  analyzeContentOverlap,
  groupAllowsSkipLesson,
  VERIFICATION_STATUS,
} from './contentOverlap.js'
import { curatedResources } from '../../data/curatedCatalog.js'

describe('contentOverlap', () => {
  it('flags shared-url groups as awaiting_confirmation without deleting rows', () => {
    const report = analyzeContentOverlap()
    expect(report.sharedUrlPending.length).toBeGreaterThan(0)
    expect(report.chooseOne).toBe(report.sharedUrlPending)
    expect(report.summary.awaitingConfirmationGroups).toBe(report.sharedUrlPending.length)
    expect(report.chooseOne.some((g) => g.ids.includes('law-nonn-22'))).toBe(true)
    expect(report.chooseOne.some((g) => (
      g.ids.includes('lady-a-013') && g.ids.includes('lady-b-011')
    ))).toBe(true)
    expect(report.policyTh.some((p) => p.includes('ไม่ลบ'))).toBe(true)
    expect(curatedResources.some((r) => r.id === 'lady-a-013')).toBe(true)
    expect(curatedResources.some((r) => r.id === 'lady-b-011')).toBe(true)
    expect(curatedResources.some((r) => r.id === 'law-nonn-22')).toBe(true)
    expect(curatedResources.some((r) => r.id === 'law-nonn-24')).toBe(true)
  })

  it('never marks pending shared-url groups as confirmed duplicates or skippable', () => {
    const report = analyzeContentOverlap()
    for (const g of report.sharedUrlPending) {
      expect(g.verificationStatus).toBe(VERIFICATION_STATUS.AWAITING_CONFIRMATION)
      expect(g.contentDuplicateConfirmed).toBe(false)
      expect(g.maySkipLesson).toBe(false)
      expect(g.keepAllItems).toBe(true)
      expect(groupAllowsSkipLesson(g)).toBe(false)
      expect(g.warningTh).toMatch(/รอยืนยัน|ยังไม่/)
    }
  })

  it('tags lady-a/lady-b and law-nonn-22/24 with owner-hold messaging', () => {
    const report = analyzeContentOverlap()
    const lady = report.sharedUrlPending.find((g) => g.caseTag === 'lady-a-b-shared-url')
    expect(lady).toBeTruthy()
    expect(lady.ladyCrossPart).toBe(true)
    expect(lady.warningTh).toMatch(/lady-a และ lady-b/)
    expect(lady.warningTh).toMatch(/ไม่ใช่การยืนยันว่าซ้ำจริง/)
    expect(lady.maySkipLesson).toBe(false)

    const law = report.sharedUrlPending.find((g) => g.caseTag === 'law-nonn-22-24-url')
    expect(law).toBeTruthy()
    expect(law.ownerHeldLawPair).toBe(true)
    expect(law.ids).toEqual(expect.arrayContaining(['law-nonn-22', 'law-nonn-24']))
    expect(law.warningTh).toMatch(/ยังไม่สลับ/)
    expect(law.maySkipLesson).toBe(false)
    expect(report.summary.ladyAbPendingGroups).toBeGreaterThan(0)
    expect(report.summary.lawNonnPendingGroups).toBe(1)
  })

  it('keeps must_unique separate from shared-url members', () => {
    const report = analyzeContentOverlap()
    const shared = new Set(report.sharedUrlPending.flatMap((g) => g.ids))
    expect(report.mustUnique.every((r) => !shared.has(r.id))).toBe(true)
  })
})

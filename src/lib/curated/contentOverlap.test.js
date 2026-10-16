import { describe, expect, it } from 'vitest'
import { analyzeContentOverlap } from './contentOverlap.js'

describe('contentOverlap', () => {
  it('flags shared-url groups as choose_one without deleting', () => {
    const report = analyzeContentOverlap()
    expect(report.chooseOne.length).toBeGreaterThan(0)
    expect(report.chooseOne.some((g) => g.ids.includes('law-nonn-22'))).toBe(true)
    expect(report.chooseOne.some((g) => (
      g.ids.includes('lady-a-013') && g.ids.includes('lady-b-011')
    ))).toBe(true)
    expect(report.policyTh.some((p) => p.includes('ไม่ลบ'))).toBe(true)
  })

  it('keeps must_unique separate from shared-url members', () => {
    const report = analyzeContentOverlap()
    const shared = new Set(report.chooseOne.flatMap((g) => g.ids))
    expect(report.mustUnique.every((r) => !shared.has(r.id))).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { buildCatalogReviewReport } from './catalogReview.js'
import { curatedResources } from '../../data/curatedCatalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

describe('catalog review report', () => {
  it('lists 67 needs_full_url slots with empty user URL fields and 150 unchecked', () => {
    const report = buildCatalogReviewReport()
    expect(report.summary.total).toBe(217)
    expect(report.summary.needs_full_url).toBe(67)
    expect(report.summary.unchecked).toBe(150)
    expect(report.summary.verified_accessible).toBe(0)
    expect(report.needsFullUrlSlots).toHaveLength(67)
    expect(report.uncheckedSlots).toHaveLength(150)
    expect(report.needsFullUrlSlots.every(s => s.fullUrlFromUser === '')).toBe(true)
    expect(report.needsFullUrlSlots.every(s => s.stubUrl.includes('...') || s.status === 'needs_full_url')).toBe(true)
    expect(report.needsFullUrlSlots.every(s => s.missingTh)).toBe(true)
    expect(report.sharedUrlGroups).toHaveLength(8)
    expect(report.possibleDuplicateTitles).toHaveLength(5)
    expect(report.sharedUrlGroups.every(g => /อย่ารวมอัตโนมัติ/.test(g.actionTh))).toBe(true)
    expect(report.sharedUrlGroups.every(g => g.suspicionOnly === true)).toBe(true)
  })

  it('does not invent URLs for stubs and lists math stubs needing full URL', () => {
    const report = buildCatalogReviewReport(curatedResources)
    const stub = report.needsFullUrlSlots.find(s => s.id === 'math-spth69-01')
    expect(stub).toBeTruthy()
    expect(stub.stubUrl).toContain('...')
    expect(stub.fullUrlFromUser).toBe('')
    expect(report.mathStubsNeedingFullUrl.length).toBeGreaterThan(0)
    expect(report.mathStubsNeedingFullUrl.every(s => s.id.startsWith('math-'))).toBe(true)
    expect(report.mathStubsNeedingFullUrl.every(s => s.stubUrl.includes('...'))).toBe(true)
  })

  it('exposes official scope evidence: education/law are Part ข', () => {
    const report = buildCatalogReviewReport()
    expect(report.officialScope.educationOfficialPart).toBe('ข')
    expect(report.officialScope.lawOfficialPart).toBe('ข')
    expect(report.officialScope.sources.some(s => s.id === 'otepc-w14-2566')).toBe(true)
    expect(report.officialScope.mismatches).toHaveLength(0)
    const edu = curatedResources.filter(r => r.subjectId === SUBJECT_IDS.EDUCATION)
    expect(edu.every(r => r.examPart === 'ข')).toBe(true)
  })

  it('treats cross-part English shared URLs as suspicion only', () => {
    const report = buildCatalogReviewReport()
    for (const g of report.crossPartEnglishShareSuspicions) {
      expect(g.suspicionOnly).toBe(true)
      expect(g.confirmedSameSource).toBe(false)
      expect(g.actionTh).toMatch(/ข้อสงสัย/)
    }
  })
})

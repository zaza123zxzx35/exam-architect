import { describe, expect, it } from 'vitest'
import { buildCatalogReviewReport } from './catalogReview.js'
import { curatedResources } from '../../data/curatedCatalog.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

describe('catalog review report', () => {
  it('summarizes URL slots honestly after Gab/Tee catalog swap', () => {
    const report = buildCatalogReviewReport()
    expect(report.summary.total).toBe(curatedResources.length)
    expect(report.summary.total).toBe(210)
    expect(report.summary.needs_full_url).toBe(55)
    expect(report.summary.unchecked).toBe(155)
    expect(report.summary.verified_accessible).toBe(0)
    expect(report.needsFullUrlSlots).toHaveLength(55)
    expect(report.uncheckedSlots).toHaveLength(155)
    expect(report.needsFullUrlSlots.every(s => s.fullUrlFromUser === '')).toBe(true)
    expect(report.needsFullUrlSlots.every(s => s.stubUrl.includes('...') || s.status === 'needs_full_url')).toBe(true)
    expect(report.needsFullUrlSlots.every(s => s.missingTh)).toBe(true)
    expect(report.sharedUrlGroups).toHaveLength(8)
    expect(report.possibleDuplicateTitles).toHaveLength(5)
    expect(report.sharedUrlGroups.every(g => /อย่ารวมอัตโนมัติ/.test(g.actionTh))).toBe(true)
    expect(report.sharedUrlGroups.every(g => g.suspicionOnly === true)).toBe(true)
  })

  it('uses full Facebook share URLs for อ.แก็บ math (no stub invent)', () => {
    const report = buildCatalogReviewReport(curatedResources)
    expect(report.needsFullUrlSlots.find(s => s.id === 'math-spth69-01')).toBeFalsy()
    const gab = curatedResources.filter(r => r.subjectId === SUBJECT_IDS.MATH)
    expect(gab).toHaveLength(19)
    expect(gab.every(r => r.series.includes('อ.แก็บ'))).toBe(true)
    expect(gab.every(r => /facebook\.com\/share\/v\//.test(r.url))).toBe(true)
    expect(gab.every(r => !r.url.includes('...'))).toBe(true)
    expect(report.mathStubsNeedingFullUrl).toHaveLength(0)
  })

  it('uses ครูพี่ตี๋ series for Thai / general-knowledge-a', () => {
    const thai = curatedResources.filter(r => r.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A)
    expect(thai).toHaveLength(17)
    expect(thai.every(r => r.series.includes('ครูพี่ตี๋'))).toBe(true)
    expect(thai.every(r => /facebook\.com\/share\/v\//.test(r.url))).toBe(true)
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

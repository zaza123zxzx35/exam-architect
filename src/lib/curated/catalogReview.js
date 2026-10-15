/**
 * Auditable catalog URL / duplicate / official-scope review report.
 * Never invents missing URL segments. Never auto-merges shared/duplicate rows.
 * Never sets verified_accessible without evidence.
 */

import { enrichCuratedResources, summarizeCuratedUrlStatuses } from './catalog.js'
import { auditCuratedCatalog, listNeedsFullUrlReport } from './validateCatalog.js'
import { URL_STATUS } from './urlStatus.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { buildOfficialScopeReport, OFFICIAL_SCOPE_CHECKED_AT } from './officialExamScope.js'

function whatIsMissing(row) {
  const url = String(row?.originalUrl || row?.url || '')
  if (!url.trim()) return 'ไม่มี URL'
  if (url.includes('...')) return 'URL เป็น stub มีเครื่องหมาย ... — ต้องได้ลิงก์เต็มจากผู้ใช้'
  if (/facebook\.com\/(?:share|watch)/i.test(url) && row?.urlStatus === URL_STATUS.UNCHECKED) {
    return 'รูปแบบครบแต่ยังไม่ตรวจว่าเปิดได้/ต้องล็อกอิน — ห้ามตั้ง verified_accessible'
  }
  if (row?.urlStatus === URL_STATUS.NEEDS_FULL_URL) return 'URL ไม่ครบหรือมี placeholder'
  if (row?.urlStatus === URL_STATUS.UNCHECKED) return 'ยังไม่มีการตรวจสิทธิ์เข้าถึงจริง (unchecked)'
  return 'ต้องตรวจด้วยมือ'
}

/**
 * Build a user-facing review package for incomplete / unchecked URLs + official scope.
 * @param {import('../../data/curatedCatalog.js').CuratedResource[]} [resources]
 */
export function buildCatalogReviewReport(resources) {
  const enriched = enrichCuratedResources(resources)
  const summary = summarizeCuratedUrlStatuses(enriched)
  const audit = auditCuratedCatalog(resources)
  const needsFull = listNeedsFullUrlReport(audit)
  const officialScope = buildOfficialScopeReport(enriched)

  const byId = new Map(enriched.map(r => [r.id, r]))

  const needsFullUrlSlots = needsFull.ids.map(id => {
    const row = byId.get(id)
    return {
      id,
      title: row?.title || '(missing title)',
      series: row?.series || '',
      examPart: row?.examPart || '',
      subjectId: row?.subjectId || '',
      stubUrl: row?.originalUrl || row?.url || '',
      missingTh: whatIsMissing(row),
      /** Empty slot for the user to paste a complete URL — never prefilled with guesses. */
      fullUrlFromUser: '',
      status: URL_STATUS.NEEDS_FULL_URL,
    }
  })

  const uncheckedSlots = enriched
    .filter(r => r.urlStatus === URL_STATUS.UNCHECKED)
    .map(r => ({
      id: r.id,
      title: r.title,
      series: r.series,
      examPart: r.examPart,
      subjectId: r.subjectId,
      url: r.safeUrl || r.originalUrl,
      missingTh: whatIsMissing(r),
      status: URL_STATUS.UNCHECKED,
      noteTh: 'รูปแบบครบ แต่ยังไม่ตรวจสิทธิ์/ล็อกอิน — ห้ามอ้างว่า verified_accessible',
    }))

  const mathStubs = enriched
    .filter(r => r.subjectId === SUBJECT_IDS.MATH && r.urlStatus === URL_STATUS.NEEDS_FULL_URL)
    .map(r => ({
      id: r.id,
      title: r.title,
      examPart: r.examPart,
      stubUrl: r.originalUrl || r.url,
      missingTh: 'ต้องการ URL เต็มของโพสต์ Facebook (ไม่เดาจาก pcb stub)',
      status: URL_STATUS.NEEDS_FULL_URL,
    }))

  /** Shared URL groups that mix english-skills-a and english-major — suspicion only. */
  const crossPartEnglishShareSuspicions = audit.sharedUrls
    .map(g => {
      const rows = g.ids.map(id => byId.get(id)).filter(Boolean)
      const subjects = new Set(rows.map(r => r.subjectId))
      const parts = new Set(rows.map(r => r.examPart))
      const mixesSkillsAndMajor = subjects.has(SUBJECT_IDS.ENGLISH_SKILLS_A)
        && subjects.has(SUBJECT_IDS.ENGLISH_MAJOR)
      const mixesParts = parts.has('ก') && parts.has('ข')
      if (!mixesSkillsAndMajor && !mixesParts) return null
      return {
        ids: g.ids,
        subjects: [...subjects],
        examParts: [...parts],
        suspicionOnly: true,
        confirmedSameSource: false,
        actionTh: 'ข้อสงสัยเท่านั้น — อย่ารวมอัตโนมัติ จนกว่าผู้ใช้ยืนยันว่าเป็นแหล่งเดียวกัน',
      }
    })
    .filter(Boolean)

  return {
    version: '8.2-review',
    checkedAt: OFFICIAL_SCOPE_CHECKED_AT,
    summary: {
      total: summary.total,
      needs_full_url: summary.needs_full_url,
      unchecked: summary.unchecked,
      verified_accessible: summary.verified_accessible,
      openable_legacy: summary.openable,
    },
    officialScope: {
      checkedAt: officialScope.checkedAt,
      sources: officialScope.sources,
      subjects: officialScope.subjects,
      mismatches: officialScope.mismatches,
      limitationsTh: officialScope.limitationsTh,
      educationOfficialPart: 'ข',
      lawOfficialPart: 'ข',
      noteTh: 'education และ law อยู่ภาค ข ตาม ก.ค.ศ. ว14/2566 — ไม่ใช่ภาค ก',
    },
    needsFullUrlSlots,
    uncheckedSlots,
    mathStubsNeedingFullUrl: mathStubs,
    sharedUrlGroups: audit.sharedUrls.map(g => ({
      ids: g.ids,
      intentionalSharePossible: g.intentionalSharePossible,
      suspicionOnly: true,
      actionTh: 'อย่ารวมอัตโนมัติ — ให้ผู้ใช้ยืนยันว่าใช้ลิงก์ร่วมกันโดยตั้งใจหรือแยกตอน',
    })),
    crossPartEnglishShareSuspicions,
    possibleDuplicateTitles: audit.possibleDuplicates.map(d => ({
      titleKey: d.titleKey,
      ids: d.ids,
      actionTh: 'อย่ารวมอัตโนมัติ — ตรวจด้วยมือว่าเป็นตอนซ้ำหรือชื่อคล้ายกัน',
    })),
    policyTh: [
      'ไม่สร้าง URL จาก stub ที่ถูกตัดทอน',
      'ไม่เปลี่ยน unchecked → verified_accessible โดยไม่มีหลักฐาน method + วันที่ตรวจ',
      'ปุ่มเปิดลิงก์ใช้ได้เฉพาะ URL ที่ classify แล้วไม่ใช่ needs_full_url',
      'คัดลอก URL แยกจากการเปิด URL',
      'ไม่ลบรายการออกจากคลังเพียงเพราะ URL ยังไม่ยืนยัน',
      'หัวข้อสำคัญที่ลิงก์ไม่พร้อมต้องแสดงคำเตือน — ห้ามตัดออกเงียบ ๆ',
    ],
  }
}

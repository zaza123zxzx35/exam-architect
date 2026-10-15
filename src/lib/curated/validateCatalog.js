/**
 * Automated curated catalog integrity audit.
 * Reports issues; never deletes or mutates seed rows.
 */

import { curatedResources, CURATED_CATALOG_VERSION } from '../../data/curatedCatalog.js'
import { EXAM_PARTS, SUBJECT_IDS } from '../study/taxonomy.js'
import {
  classifyResourceUrl,
  isIncompleteUrl,
  isVerifiedAccessibleStatus,
  normalizeUrlStatus,
  URL_STATUS,
} from './urlStatus.js'

const ALLOWED_KINDS = new Set(['lesson', 'quiz-practice', 'answer-key', 'document', 'live'])
const ALLOWED_EXAM_PARTS = new Set(EXAM_PARTS)
const ALLOWED_SUBJECTS = new Set(Object.values(SUBJECT_IDS))

/**
 * Preferred learning order for curation (report / planning guidance).
 */
export const CURATION_STAGE_ORDER = Object.freeze([
  'foundation',
  'lesson-or-video',
  'practice',
  'exam-review',
  'weakness-review',
])

/**
 * Map curated kind → curation stage (heuristic, documented as estimate).
 * @param {string} kind
 */
export function curationStageForKind(kind) {
  switch (kind) {
    case 'document':
      return 'foundation'
    case 'lesson':
    case 'live':
      return 'lesson-or-video'
    case 'quiz-practice':
      return 'practice'
    case 'answer-key':
      return 'exam-review'
    default:
      return 'lesson-or-video'
  }
}

/**
 * @typedef {object} CatalogIssue
 * @property {'error' | 'warning' | 'info'} severity
 * @property {string} code
 * @property {string} id
 * @property {string} message
 */

/**
 * Validate one curated row.
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 * @param {Map<string, number>} idCounts
 * @param {Map<string, string[]>} urlToIds
 * @returns {CatalogIssue[]}
 */
export function validateCuratedRow(row, idCounts = new Map(), urlToIds = new Map()) {
  const issues = []
  const id = row && row.id != null ? String(row.id) : ''

  if (!id.trim()) {
    issues.push({ severity: 'error', code: 'missing-id', id: '(empty)', message: 'id ว่าง' })
  }
  if (!row || typeof row !== 'object') {
    issues.push({ severity: 'error', code: 'invalid-row', id: id || '(empty)', message: 'แถวไม่ใช่ object' })
    return issues
  }
  if (!String(row.title || '').trim()) {
    issues.push({ severity: 'error', code: 'missing-title', id, message: 'title ว่าง' })
  }
  if (!ALLOWED_KINDS.has(row.kind)) {
    issues.push({ severity: 'error', code: 'invalid-kind', id, message: `kind ไม่รองรับ: ${row.kind}` })
  }
  if (!ALLOWED_EXAM_PARTS.has(row.examPart)) {
    issues.push({ severity: 'error', code: 'invalid-examPart', id, message: `examPart ไม่รองรับ: ${row.examPart}` })
  }
  if (!ALLOWED_SUBJECTS.has(row.subjectId)) {
    issues.push({ severity: 'error', code: 'invalid-subjectId', id, message: `subjectId ไม่รองรับ: ${row.subjectId}` })
  }
  // Official / taxonomy contracts (ก.ค.ศ. ว14/2566): do not silently mis-bucket subjects.
  if (row.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A && row.examPart !== 'ก') {
    issues.push({
      severity: 'error',
      code: 'english-skills-part-mismatch',
      id,
      message: 'english-skills-a ต้องอยู่ภาค ก',
    })
  }
  if (row.subjectId === SUBJECT_IDS.ENGLISH_MAJOR && row.examPart !== 'ข') {
    issues.push({
      severity: 'error',
      code: 'english-major-part-mismatch',
      id,
      message: 'english-major ต้องอยู่ภาค ข',
    })
  }
  if (row.subjectId === SUBJECT_IDS.EDUCATION && row.examPart !== 'ข') {
    issues.push({
      severity: 'error',
      code: 'education-part-mismatch',
      id,
      message: 'education ต้องอยู่ภาค ข (มาตรฐานความรู้ทั่วไปในการจัดการเรียนการสอน)',
    })
  }
  if (row.subjectId === SUBJECT_IDS.LAW && row.examPart !== 'ข') {
    issues.push({
      severity: 'error',
      code: 'law-part-mismatch',
      id,
      message: 'law ต้องอยู่ภาค ข (ความรอบรู้กฎหมายฯ)',
    })
  }
  if (row.subjectId === SUBJECT_IDS.MATH && row.examPart !== 'ก') {
    issues.push({
      severity: 'error',
      code: 'math-part-mismatch',
      id,
      message: 'math ต้องอยู่ภาค ก (คิดวิเคราะห์เชิงปริมาณ)',
    })
  }
  if (row.subjectId === SUBJECT_IDS.CIVIL_SERVANT_A && row.examPart !== 'ก') {
    issues.push({
      severity: 'error',
      code: 'civil-servant-part-mismatch',
      id,
      message: 'civil-servant-a ต้องอยู่ภาค ก (ข้าราชการที่ดี) — ไม่ปนกฎหมายภาค ข',
    })
  }
  if (row.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A && row.examPart !== 'ก') {
    issues.push({
      severity: 'error',
      code: 'general-knowledge-part-mismatch',
      id,
      message: 'general-knowledge-a ต้องอยู่ภาค ก (ภาษาไทย/คิดวิเคราะห์เชิงภาษา)',
    })
  }

  const url = String(row.url || '')
  const classified = url.trim() ? classifyResourceUrl(url) : { status: URL_STATUS.NEEDS_FULL_URL, safeUrl: null }
  if (!url.trim()) {
    issues.push({ severity: 'error', code: 'missing-url', id, message: 'url ว่าง' })
  } else {
    if (isIncompleteUrl(url) || classified.status === URL_STATUS.NEEDS_FULL_URL) {
      issues.push({
        severity: 'warning',
        code: 'needs-full-url',
        id,
        message: 'URL ไม่ครบหรือมี placeholder — สถานะ needs_full_url',
      })
    } else if (classified.status === URL_STATUS.UNCHECKED) {
      issues.push({
        severity: 'info',
        code: 'url-unchecked',
        id,
        message: 'รูปแบบ URL ครบ แต่ยังไม่ตรวจสิทธิ์/ล็อกอิน (unchecked) — ห้ามอ้างว่าเปิดได้จริง',
      })
    }
    if (url.includes('...')) {
      issues.push({
        severity: 'warning',
        code: 'url-ellipsis-placeholder',
        id,
        message: 'URL มีเครื่องหมาย ...',
      })
    }
  }

  // Stored urlStatus (if any) must not claim verified_accessible without evidence,
  // and must not contradict classify-on-read for incomplete URLs.
  if (row.urlStatus != null && String(row.urlStatus).trim()) {
    const stored = String(row.urlStatus)
    if (isVerifiedAccessibleStatus(stored)) {
      const evidence = row.urlVerification || row.verificationEvidence
      const method = evidence && String(evidence.method || '').trim()
      const checkedAt = evidence && String(evidence.checkedAtIso || evidence.checkedAt || '').trim()
      if (!method || !checkedAt) {
        issues.push({
          severity: 'error',
          code: 'verified-without-evidence',
          id,
          message: `สถานะ ${normalizeUrlStatus(stored)} ต้องมีหลักฐาน method + วันที่ตรวจ`,
        })
      }
    }
    if (
      (isIncompleteUrl(url) || classified.status === URL_STATUS.NEEDS_FULL_URL)
      && stored !== URL_STATUS.NEEDS_FULL_URL
      && stored !== URL_STATUS.AWAITING_USER
    ) {
      issues.push({
        severity: 'warning',
        code: 'url-status-mismatch',
        id,
        message: `URL ไม่ครบแต่ urlStatus=${stored} — ควรเป็น needs_full_url`,
      })
    }
  }

  if (row.estimatedMinutes != null) {
    const m = Number(row.estimatedMinutes)
    if (!Number.isFinite(m) || m <= 0) {
      issues.push({ severity: 'warning', code: 'invalid-duration', id, message: 'estimatedMinutes ไม่ถูกต้อง' })
    } else {
      issues.push({
        severity: 'info',
        code: 'duration-is-estimate',
        id,
        message: `ระยะเวลา ${m} นาทีเป็นค่าประมาณ (ไม่มีการยืนยันความยาวจริง)`,
      })
    }
  } else {
    issues.push({
      severity: 'info',
      code: 'duration-missing',
      id,
      message: 'ไม่มี estimatedMinutes — แผนจะใช้ค่าประมาณสำรอง',
    })
  }

  if (!String(row.series || '').trim()) {
    issues.push({ severity: 'warning', code: 'missing-series', id, message: 'series ว่าง' })
  }

  if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1)
  if (url.trim()) {
    const list = urlToIds.get(url) || []
    list.push(id)
    urlToIds.set(url, list)
  }

  return issues
}

/**
 * Full catalog audit.
 * @param {import('../../data/curatedCatalog.js').CuratedResource[]} [resources]
 */
export function auditCuratedCatalog(resources = curatedResources) {
  const idCounts = new Map()
  const urlToIds = new Map()
  const titleKeyToIds = new Map()
  /** @type {CatalogIssue[]} */
  const issues = []

  for (const row of resources || []) {
    issues.push(...validateCuratedRow(row, idCounts, urlToIds))
    const key = `${row?.series || ''}::${String(row?.title || '').trim().toLowerCase()}`
    if (row?.title) {
      const list = titleKeyToIds.get(key) || []
      list.push(String(row.id))
      titleKeyToIds.set(key, list)
    }
  }

  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate-id',
        id,
        message: `id ซ้ำ ${count} ครั้ง — ห้ามลบอัตโนมัติ ต้องตรวจด้วยมือ`,
      })
    }
  }

  /** @type {Array<{ url: string, ids: string[], intentionalSharePossible: boolean }>} */
  const sharedUrls = []
  for (const [url, ids] of urlToIds) {
    if (ids.length > 1) {
      sharedUrls.push({ url: url.includes('...') ? '[REDACTED_TRUNCATED_STUB]' : url.replace(/([?&](u_id|token)=)[^&]+/gi, '$1[REDACTED]'), ids: [...ids], intentionalSharePossible: true })
      issues.push({
        severity: 'warning',
        code: 'shared-url',
        id: ids.join(','),
        message: `URL เดียวกันถูกใช้ ${ids.length} รายการ (${ids.join(', ')}) — อาจใช้ร่วมกันโดยตั้งใจ`,
      })
    }
  }

  /** @type {Array<{ titleKey: string, ids: string[] }>} */
  const possibleDuplicates = []
  for (const [titleKey, ids] of titleKeyToIds) {
    if (ids.length > 1) {
      possibleDuplicates.push({ titleKey, ids: [...ids] })
      issues.push({
        severity: 'warning',
        code: 'possible-duplicate-title',
        id: ids.join(','),
        message: `ชื่อตอนซ้ำในชุดเดียวกัน: ${titleKey}`,
      })
    }
  }

  const needsFullUrlIds = issues
    .filter(i => i.code === 'needs-full-url' || i.code === 'url-ellipsis-placeholder')
    .map(i => i.id)
  const uniqueNeedsFull = [...new Set(needsFullUrlIds)]

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  return {
    catalogVersion: CURATED_CATALOG_VERSION,
    totalRows: (resources || []).length,
    errorCount: errors.length,
    warningCount: warnings.length,
    infoCount: issues.filter(i => i.severity === 'info').length,
    issues,
    errors,
    warnings,
    sharedUrls,
    possibleDuplicates,
    needsFullUrlIds: uniqueNeedsFull,
    curationStages: CURATION_STAGE_ORDER,
    ok: errors.length === 0,
  }
}

/**
 * Compact user-facing list of IDs still needing full URLs.
 * @param {ReturnType<typeof auditCuratedCatalog>} audit
 */
export function listNeedsFullUrlReport(audit) {
  return {
    count: audit.needsFullUrlIds.length,
    ids: audit.needsFullUrlIds,
    noteTh: 'รายการเหล่านี้เปิดจากระบบไม่ได้จนกว่าจะได้ URL เต็มจากผู้ใช้',
  }
}

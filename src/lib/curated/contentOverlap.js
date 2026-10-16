/**
 * Multi-school / multi-series content overlap analysis.
 * Never auto-deletes. Shared URL ≠ confirmed same content.
 * Owner policy (2026-10-16): keep lady-a/lady-b and law-nonn-22/24 pairs;
 * mark awaiting_confirmation — do not recommend skipping lessons from URL share alone.
 */

import { enrichCuratedResources } from './catalog.js'
import { auditCuratedCatalog } from './validateCatalog.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { HUB_SUBJECT_LABELS } from '../study/hub.js'

export const CONTENT_OVERLAP_VERSION = '1.1-awaiting-confirmation'

/** @typedef {'must_unique' | 'shared_url_pending' | 'complementary' | 'review_later' | 'uncertain'} OverlapBucket */
/** @typedef {'awaiting_confirmation' | 'owner_review' | 'none'} VerificationStatus */

export const VERIFICATION_STATUS = Object.freeze({
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  OWNER_REVIEW: 'owner_review',
  NONE: 'none',
})

export const VERIFICATION_STATUS_LABELS_TH = Object.freeze({
  awaiting_confirmation: 'รอยืนยัน',
  owner_review: 'รอเจ้าของตรวจ',
  none: '—',
})

/** Known shared-URL pairs under owner hold — keep both rows, no merge/skip. */
export const OWNER_HELD_SHARED_URL_PAIRS = Object.freeze([
  {
    ids: ['law-nonn-22', 'law-nonn-24'],
    kind: 'same-series-url-collision',
    policyTh: 'คง URL ทั้งสองไว้ — ยังไม่ทราบตอนใดถูกต้อง ห้ามสลับหรือเลือกลิงก์เอง',
  },
])

function subjectLabel(id) {
  return HUB_SUBJECT_LABELS[id] || id || '—'
}

function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
}

function isLadyCrossPartPair(ids, rows) {
  const set = new Set(ids.map(String))
  const hasA = [...set].some((id) => id.startsWith('lady-a-'))
  const hasB = [...set].some((id) => id.startsWith('lady-b-'))
  if (!hasA || !hasB) return false
  const parts = new Set(rows.map((r) => r.examPart))
  return parts.has('ก') && parts.has('ข')
}

function isOwnerHeldLawPair(ids) {
  const set = new Set(ids.map(String))
  return set.has('law-nonn-22') && set.has('law-nonn-24')
}

/**
 * Shared-URL groups are pending confirmation only.
 * Never sets maySkipLesson / contentDuplicateConfirmed true.
 * @param {object[]} [resources]
 * @param {{ doneResourceIds?: Set<string>|string[] }} [options]
 */
export function analyzeContentOverlap(resources, options = {}) {
  const enriched = enrichCuratedResources(resources)
  const audit = auditCuratedCatalog(resources)
  const byId = new Map(enriched.map((r) => [r.id, r]))
  const done = new Set([...(options.doneResourceIds || [])].map(String))

  const sharedIdSet = new Set()
  /** @type {Array<object>} */
  const sharedUrlPending = []

  for (const g of audit.sharedUrls) {
    const rows = g.ids.map((id) => byId.get(id)).filter(Boolean)
    rows.forEach((r) => sharedIdSet.add(r.id))
    const tutors = [...new Set(rows.map((r) => r.tutorTh).filter(Boolean))]
    const subjects = [...new Set(rows.map((r) => r.subjectId))]
    const parts = [...new Set(rows.map((r) => r.examPart))]
    const sameSeries = new Set(rows.map((r) => r.series)).size === 1
    const ladyCross = isLadyCrossPartPair(g.ids, rows)
    const lawHeld = isOwnerHeldLawPair(g.ids)

    let warningTh = 'พบ URL ซ้ำระหว่างรายการ — รอยืนยันว่าเป็นเนื้อหาเดียวกันหรือไม่ · ยังไม่ถือว่าเนื้อหาซ้ำจริง'
    let actionTh = 'คงทุกรายการและลิงก์ไว้ · เรียนตามแผนปกติจนกว่าจะยืนยัน · ห้ามข้ามบทจากเหตุ URL ซ้ำอย่างเดียว'
    let caseTag = 'shared-url-generic'

    if (ladyCross) {
      caseTag = 'lady-a-b-shared-url'
      warningTh = 'lady-a และ lady-b ใช้ URL ร่วมกัน — รอยืนยันว่าเป็นเนื้อหาเดียวกันหรือคนละภาค · ไม่ใช่การยืนยันว่าซ้ำจริง'
      actionTh = 'เก็บทั้งสองรายการไว้ · ห้ามลบหรือรวม · แสดงสถานะรอยืนยัน'
    } else if (lawHeld) {
      caseTag = 'law-nonn-22-24-url'
      warningTh = 'law-nonn-22 และ law-nonn-24 ใช้ URL เดียวกัน — รอยืนยันว่าตอนใดถูกต้อง · ยังไม่สลับหรือเลือกลิงก์'
      actionTh = 'คง URL และข้อมูลเดิมทั้งสองรายการ · ทำเครื่องหมายรอตรวจสอบ'
    } else if (sameSeries) {
      caseTag = 'same-series-shared-url'
      warningTh = 'URL เดียวกันในชุดเดียวกัน — รอยืนยันว่าแชร์ไฟล์โดยตั้งใจหรือลิงก์ผิดตอน'
      actionTh = 'คงทั้งสองรายการไว้จนกว่าจะยืนยัน · ห้ามลบอัตโนมัติ'
    }

    sharedUrlPending.push({
      bucket: 'shared_url_pending',
      evidence: 'shared-url',
      verificationStatus: VERIFICATION_STATUS.AWAITING_CONFIRMATION,
      verificationLabelTh: VERIFICATION_STATUS_LABELS_TH.awaiting_confirmation,
      contentDuplicateConfirmed: false,
      maySkipLesson: false,
      keepAllItems: true,
      caseTag,
      ids: g.ids,
      titles: rows.map((r) => r.title),
      tutors,
      subjects: subjects.map(subjectLabel),
      examParts: parts,
      sameSeries,
      ladyCrossPart: ladyCross,
      ownerHeldLawPair: lawHeld,
      doneIds: g.ids.filter((id) => done.has(id)),
      warningTh,
      actionTh,
      confidence: 'pending',
    })
  }

  const titleMap = new Map()
  for (const r of enriched) {
    const key = `${r.subjectId}::${normTitle(r.title)}`
    if (!titleMap.has(key)) titleMap.set(key, [])
    titleMap.get(key).push(r)
  }
  /** @type {Array<object>} */
  const complementary = []
  /** @type {Array<object>} */
  const uncertain = []
  for (const [, rows] of titleMap) {
    if (rows.length < 2) continue
    const series = new Set(rows.map((r) => r.series))
    const urls = new Set(rows.map((r) => r.originalUrl || r.url))
    if (series.size < 2) continue
    if (rows.every((r) => sharedIdSet.has(r.id))) continue
    const payload = {
      ids: rows.map((r) => r.id),
      titles: rows.map((r) => r.title),
      tutors: [...new Set(rows.map((r) => r.tutorTh).filter(Boolean))],
      series: [...series],
      subjects: [subjectLabel(rows[0].subjectId)],
      examParts: [...new Set(rows.map((r) => r.examPart))],
      urlsDiffer: urls.size > 1,
      doneIds: rows.filter((r) => done.has(r.id)).map((r) => r.id),
      contentDuplicateConfirmed: false,
      maySkipLesson: false,
      verificationStatus: VERIFICATION_STATUS.AWAITING_CONFIRMATION,
      verificationLabelTh: VERIFICATION_STATUS_LABELS_TH.awaiting_confirmation,
    }
    if (urls.size > 1) {
      complementary.push({
        ...payload,
        bucket: 'complementary',
        evidence: 'same-title-different-url-cross-series',
        confidence: 'low',
        warningTh: 'ชื่อคล้ายข้ามสำนักแต่ลิงก์ต่าง — รอยืนยันขอบเขตเนื้อหา',
        actionTh: 'อาจเสริมกัน · อย่ารวมอัตโนมัติ · ห้ามข้ามจากชื่อคล้ายอย่างเดียว',
      })
    } else {
      uncertain.push({
        ...payload,
        bucket: 'uncertain',
        evidence: 'same-title-unclear',
        confidence: 'low',
        warningTh: 'ข้อมูลไม่พอตัดสิน',
        actionTh: 'ให้เทียบเนื้อหาก่อน · คงทุกรายการไว้',
      })
    }
  }

  const pendingIds = new Set(sharedUrlPending.flatMap((g) => g.ids))
  const compIds = new Set(complementary.flatMap((g) => g.ids))
  const uncIds = new Set(uncertain.flatMap((g) => g.ids))

  const reviewLater = enriched
    .filter((r) => r.priorityTier === PRIORITY_TIERS.DEFER || String(r.notes || '').includes('pack:defer'))
    .map((r) => ({
      bucket: 'review_later',
      id: r.id,
      title: r.title,
      tutorTh: r.tutorTh,
      subjectLabelTh: subjectLabel(r.subjectId),
      evidence: 'defer-pack-or-tier',
      actionTh: 'เก็บทบทวน/ทำข้อสอบทีหลังตามแพ็ก defer',
      done: done.has(r.id),
      maySkipLesson: false,
    }))

  const mustUnique = enriched
    .filter((r) => !pendingIds.has(r.id) && !compIds.has(r.id) && !uncIds.has(r.id))
    .filter((r) => r.priorityTier === PRIORITY_TIERS.MUST || String(r.notes || '').includes('pack:must'))
    .map((r) => ({
      bucket: 'must_unique',
      id: r.id,
      title: r.title,
      tutorTh: r.tutorTh,
      subjectLabelTh: subjectLabel(r.subjectId),
      evidence: 'must-tier-no-shared-url-group',
      actionTh: 'ยังไม่พบแหล่งอื่นที่ใช้ URL ร่วม — ควรเรียนตามลำดับแผน',
      done: done.has(r.id),
      maySkipLesson: false,
    }))

  const ladyPending = sharedUrlPending.filter((g) => g.ladyCrossPart)
  const lawPending = sharedUrlPending.filter((g) => g.ownerHeldLawPair)

  return {
    version: CONTENT_OVERLAP_VERSION,
    summary: {
      mustUnique: mustUnique.length,
      /** @deprecated use sharedUrlPendingGroups — kept for older UI strings */
      chooseOneGroups: sharedUrlPending.length,
      sharedUrlPendingGroups: sharedUrlPending.length,
      complementaryGroups: complementary.length,
      reviewLater: reviewLater.length,
      uncertainGroups: uncertain.length,
      sharedUrlGroups: audit.sharedUrls.length,
      awaitingConfirmationGroups: sharedUrlPending.length,
      ladyAbPendingGroups: ladyPending.length,
      lawNonnPendingGroups: lawPending.length,
    },
    mustUnique,
    /** Pending shared-URL groups (not confirmed duplicates). */
    sharedUrlPending,
    /**
     * @deprecated Alias of sharedUrlPending — do not treat as permission to skip.
     * All entries have maySkipLesson: false.
     */
    chooseOne: sharedUrlPending,
    complementary,
    reviewLater,
    uncertain,
    ownerHeldPairs: OWNER_HELD_SHARED_URL_PAIRS,
    policyTh: [
      'ไม่ลบหรือรวมรายการอัตโนมัติ',
      'URL ซ้ำ = รอยืนยันเท่านั้น — ไม่ใช่หลักฐานว่าเนื้อหาซ้ำจริง',
      'ห้ามแนะนำให้ข้ามบทเรียนจากเหตุ URL ซ้ำโดยไม่มีคำยืนยันจากเจ้าของ',
      'lady-a / lady-b และ law-nonn-22 / 24 คงไว้ทั้งคู่ตามนโยบายเจ้าของ',
      'คงลิงก์ต้นทางทุกลิงก์ไว้',
    ],
  }
}

/**
 * True only if a group explicitly allows skipping (never for pending shared URL).
 * @param {object} group
 */
export function groupAllowsSkipLesson(group) {
  return group?.maySkipLesson === true && group?.contentDuplicateConfirmed === true
}

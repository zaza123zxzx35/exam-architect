/**
 * Multi-school / multi-series content overlap analysis.
 * Never auto-deletes. Never claims duplicate from title similarity alone
 * without a stronger signal (shared URL or explicit shared-url audit).
 */

import { enrichCuratedResources } from './catalog.js'
import { auditCuratedCatalog } from './validateCatalog.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { HUB_SUBJECT_LABELS } from '../study/hub.js'

export const CONTENT_OVERLAP_VERSION = '1.0-evidence'

/** @typedef {'must_unique' | 'choose_one' | 'complementary' | 'review_later' | 'uncertain'} OverlapBucket */

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

/**
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
  const chooseOne = []
  for (const g of audit.sharedUrls) {
    const rows = g.ids.map((id) => byId.get(id)).filter(Boolean)
    rows.forEach((r) => sharedIdSet.add(r.id))
    const tutors = [...new Set(rows.map((r) => r.tutorTh).filter(Boolean))]
    const subjects = [...new Set(rows.map((r) => r.subjectId))]
    const parts = [...new Set(rows.map((r) => r.examPart))]
    const sameSeries = new Set(rows.map((r) => r.series)).size === 1
    chooseOne.push({
      bucket: 'choose_one',
      evidence: 'shared-url',
      ids: g.ids,
      titles: rows.map((r) => r.title),
      tutors,
      subjects: subjects.map(subjectLabel),
      examParts: parts,
      sameSeries,
      doneIds: g.ids.filter((id) => done.has(id)),
      actionTh: sameSeries
        ? 'URL เดียวกันในชุดเดียวกัน — เลือกตอนที่ถูกต้องหนึ่งตอน หรือยืนยันว่าแชร์ไฟล์โดยตั้งใจ'
        : 'URL เดียวกันข้ามชุด/ภาค — เลือกเรียนแหล่งหลักหนึ่งแหล่งได้ หากเนื้อหาเดียวกัน; คงลิงก์ทุกแหล่งไว้',
      confidence: sameSeries ? 'high' : 'medium',
    })
  }

  // Same normalized title, different series, different URLs → complementary or uncertain
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
    if (rows.every((r) => sharedIdSet.has(r.id))) continue // already in choose_one
    const payload = {
      ids: rows.map((r) => r.id),
      titles: rows.map((r) => r.title),
      tutors: [...new Set(rows.map((r) => r.tutorTh).filter(Boolean))],
      series: [...series],
      subjects: [subjectLabel(rows[0].subjectId)],
      examParts: [...new Set(rows.map((r) => r.examPart))],
      urlsDiffer: urls.size > 1,
      doneIds: rows.filter((r) => done.has(r.id)).map((r) => r.id),
    }
    if (urls.size > 1) {
      complementary.push({
        ...payload,
        bucket: 'complementary',
        evidence: 'same-title-different-url-cross-series',
        confidence: 'low',
        actionTh: 'ชื่อคล้ายข้ามสำนักแต่ลิงก์ต่าง — อาจเสริมกัน; อย่ารวมอัตโนมัติ จนกว่าจะยืนยันขอบเขตเนื้อหา',
      })
    } else {
      uncertain.push({
        ...payload,
        bucket: 'uncertain',
        evidence: 'same-title-unclear',
        confidence: 'low',
        actionTh: 'ข้อมูลไม่พอตัดสิน — ให้คุณเทียบเนื้อหาก่อนเลือกแหล่ง',
      })
    }
  }

  const chooseIds = new Set(chooseOne.flatMap((g) => g.ids))
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
    }))

  const mustUnique = enriched
    .filter((r) => !chooseIds.has(r.id) && !compIds.has(r.id) && !uncIds.has(r.id))
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
    }))

  return {
    version: CONTENT_OVERLAP_VERSION,
    summary: {
      mustUnique: mustUnique.length,
      chooseOneGroups: chooseOne.length,
      complementaryGroups: complementary.length,
      reviewLater: reviewLater.length,
      uncertainGroups: uncertain.length,
      sharedUrlGroups: audit.sharedUrls.length,
    },
    mustUnique,
    chooseOne,
    complementary,
    reviewLater,
    uncertain,
    policyTh: [
      'ไม่ลบคลิปอัตโนมัติ',
      'ไม่ตัดสินซ้ำจากชื่ออย่างเดียวโดยไม่มีหลักฐาน URL หรือการยืนยัน',
      'คงลิงก์ต้นทางทุกแหล่งไว้แม้แนะนำให้เลือกเรียนแหล่งเดียว',
    ],
  }
}

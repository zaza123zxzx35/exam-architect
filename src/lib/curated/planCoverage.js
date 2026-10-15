/**
 * Planner coverage audit for curated catalog → exam window.
 * Durations are estimates unless a resource has verified length (none currently).
 * Never auto-raises the user's daily budget.
 */

import { enrichCuratedResources } from './catalog.js'
import { generateUnifiedStudyDraft, DEFAULT_DAILY_STUDY_MINUTES } from './unifiedPlan.js'
import { HUB_SUBJECT_LABELS } from '../study/hub.js'
import { PRIORITY_TIERS, normalizePriorityMode, rankCuratedCatalog } from './priorityScoring.js'

function estimateMinutes(row) {
  const m = Number(row?.estimatedMinutes)
  return Number.isFinite(m) && m > 0 ? m : 45
}

/**
 * @param {ReturnType<typeof enrichCuratedResources>} catalog
 * @param {{ todayIso?: string, dailyMinutes?: number, existingTaskIds?: string[], existingTasks?: object[], mode?: string }} [options]
 */
export function auditPlanCoverage(catalog = enrichCuratedResources(), options = {}) {
  const dailyMinutes = Number(options.dailyMinutes) > 0
    ? Number(options.dailyMinutes)
    : DEFAULT_DAILY_STUDY_MINUTES
  const mode = normalizePriorityMode(options.mode)
  const draft = generateUnifiedStudyDraft({
    todayIso: options.todayIso,
    dailyMinutes,
    existingTaskIds: options.existingTaskIds,
    existingTasks: options.existingTasks,
    catalog,
    mode,
    weaknessAnalysis: options.weaknessAnalysis,
  })

  const ranked = rankCuratedCatalog(catalog, { mode })
  const mustPool = ranked.filter(e => e.score.tier === PRIORITY_TIERS.MUST).map(e => e.row)
  const ifTimePool = ranked.filter(e => e.score.tier === PRIORITY_TIERS.IF_TIME).map(e => e.row)
  const deferPool = ranked.filter(e => e.score.tier === PRIORITY_TIERS.DEFER).map(e => e.row)

  const partA = (catalog || []).filter(r => r.examPart === 'ก')
  const partB = (catalog || []).filter(r => r.examPart === 'ข')
  const planPool = [...partA, ...partB]

  const scheduledResourceIds = new Set(
    (draft.proposedTasks || []).filter(t => t.resourceId).map(t => String(t.resourceId)),
  )
  const scheduledRows = planPool.filter(r => scheduledResourceIds.has(String(r.id)))
  const unscheduledRows = planPool.filter(r => !scheduledResourceIds.has(String(r.id)))
  const unscheduledMust = mustPool.filter(r => !scheduledResourceIds.has(String(r.id)))

  // Priority coverage: minutes needed for must-score (+ optional if-time), not all 217.
  const minutesNeededMustEst = mustPool.reduce((s, r) => s + estimateMinutes(r), 0)
  const minutesNeededEst = minutesNeededMustEst + ifTimePool.reduce((s, r) => s + estimateMinutes(r), 0)
  const minutesAvailableStudy = draft.studyDays * dailyMinutes
  const minutesScheduledEst = (draft.proposedTasks || [])
    .filter(t => t.resourceId)
    .reduce((s, t) => s + (Number(t.estimatedMinutes) > 0 ? Number(t.estimatedMinutes) : 0), 0)
  const shortfallEst = Math.max(0, minutesNeededMustEst - minutesAvailableStudy)

  /** @type {Map<string, { subjectId: string, examPart: string, count: number, minutesEst: number, titles: string[] }>} */
  const riskBySubject = new Map()
  for (const row of unscheduledMust) {
    const key = `${row.examPart}:${row.subjectId}`
    const prev = riskBySubject.get(key) || {
      subjectId: row.subjectId,
      examPart: row.examPart,
      labelTh: HUB_SUBJECT_LABELS[row.subjectId] || row.subjectId,
      count: 0,
      minutesEst: 0,
      titles: [],
    }
    prev.count += 1
    prev.minutesEst += estimateMinutes(row)
    if (prev.titles.length < 5) prev.titles.push(row.title)
    riskBySubject.set(key, prev)
  }

  const atRiskSubjects = [...riskBySubject.values()].sort((a, b) => b.minutesEst - a.minutesEst)

  const optionsTh = []
  optionsTh.push(
    `โหมดจัดลำดับ: ${draft.modeLabelTh} — เป้าคือคุ้มคะแนน ไม่ใช่ครอบคลุมทั้ง ${planPool.length} รายการ`,
  )
  if (shortfallEst > 0 || unscheduledMust.length > 0) {
    optionsTh.push(
      `กลุ่มต้องเก็บคะแนนที่งบไม่พอ: ${unscheduledMust.length} รายการ (≈${minutesNeededMustEst} นาที) — ระบบไม่เพิ่มนาที/วันให้เอง`,
    )
    optionsTh.push(
      `พักไว้ก่อน ${deferPool.length} รายการ (ยังอยู่ในคลัง) · ควรอ่านถ้ามีเวลาที่ยังไม่จัด ${draft.unscheduled.ifTimeLeft}`,
    )
    optionsTh.push(
      `สงวน ${draft.reviewBufferDays} วันท้ายสำหรับข้อสอบย่อย/ทบทวนจุดอ่อน`,
    )
  } else {
    optionsTh.push('จัดกลุ่มต้องเก็บคะแนนได้ครบภายใต้งบปัจจุบัน (ระยะเวลายังเป็นค่าประมาณ)')
  }

  return {
    version: '10.0-priority-coverage',
    mode,
    examPartA: draft.examPartA,
    examPartB: draft.examPartB,
    todayIso: draft.todayIso,
    dayCount: draft.dayCount,
    studyDays: draft.studyDays,
    reviewBufferDays: draft.reviewBufferDays,
    dailyMinutes,
    dailyMinutesIsDefault: !(Number(options.dailyMinutes) > 0),
    durationsAreEstimates: true,
    totals: {
      catalog: (catalog || []).length,
      planPool: planPool.length,
      partA: partA.length,
      partB: partB.length,
      must: mustPool.length,
      ifTime: ifTimePool.length,
      defer: deferPool.length,
      scheduled: scheduledRows.length,
      unscheduled: unscheduledRows.length,
      unscheduledMust: unscheduledMust.length,
      proposedTasks: (draft.proposedTasks || []).length,
      reviewPlaceholderTasks: (draft.proposedTasks || []).filter(t => !t.resourceId).length,
    },
    minutes: {
      neededEst: minutesNeededEst,
      neededMustEst: minutesNeededMustEst,
      availableStudy: minutesAvailableStudy,
      scheduledEst: minutesScheduledEst,
      shortfallEst,
      unitNoteTh: 'นาทีเป็นค่าประมาณ — shortfall นับจากกลุ่มต้องเก็บคะแนน ไม่ใช่ทั้งคลังหลักสูตร',
    },
    unscheduledIds: unscheduledRows.map(r => r.id),
    atRiskSubjects,
    optionsTh,
    draft,
  }
}

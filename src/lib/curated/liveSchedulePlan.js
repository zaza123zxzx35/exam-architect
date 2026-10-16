/**
 * Convert poster live/content schedules into add-only schedule tasks,
 * ordered by official-score priority ranks.
 */

import {
  CIVIL_SERVANT_A,
  expandLiveEventDates,
  listLiveTutorEvents,
  LIVE_TUTOR_SCHEDULE_VERSION,
  subjectFocusForDate,
} from '../../data/liveTutorSchedule.js'
import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import { HUB_SUBJECT_LABELS, HUB_EXAM_PART_LABELS } from '../study/hub.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { enrichCuratedResources } from './catalog.js'
import { attachCatalogLinkToLiveTask } from './taskOpenAction.js'

export const LIVE_SCHEDULE_ORIGIN = 'live-tutor-schedule'

function parseMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(String(t))) return null
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false
  let ae = aEnd
  let be = bEnd
  if (ae <= aStart) ae += 24 * 60
  if (be <= bStart) be += 24 * 60
  return aStart < be && bStart < ae
}

/** Exact markers written by pre-P0 `resolveLadyLiveConflicts` (commit before 628499a). */
export const LEGACY_LADY_DEMOTE_TITLE_PREFIX = 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · '
export const LEGACY_LADY_DEMOTE_REASON_SNIPPET = 'เลื่อนเป็นทบทวนกลางวันตามแผน 100'
export const LEGACY_LADY_DEMOTE_REASON_CODE = 'victory-lady-wins'

/**
 * Classify a 09:00–11:00 + demotedFrom* shell without guessing from the clock alone.
 *
 * Pre-P0 system demotion always wrote the full bundle:
 * conflictResolved, demotedFrom*, 09:00–11:00, title prefix, reason snippet, reasonCode.
 *
 * @returns {'none'|'system_legacy'|'user_protected'|'ambiguous'|'review_held'}
 */
export function classifySilentLadyDemotion(block) {
  if (!block || block.liveKind !== 'content-block') return 'none'
  if (!block.demotedFromStartTime || !block.demotedFromEndTime) return 'none'
  if (block.startTime !== '09:00' || block.endTime !== '11:00') return 'none'

  // Already held for manual review — do not thrash on re-resolve.
  if (block.legacyDemotionReviewNeeded && !block.conflictResolved) return 'review_held'

  if (!block.conflictResolved) return 'none'
  if (block.userEdited === true) return 'user_protected'

  const hasCode = (block.reasonCodes || []).includes(LEGACY_LADY_DEMOTE_REASON_CODE)
  const hasTitle = String(block.title || '').startsWith(LEGACY_LADY_DEMOTE_TITLE_PREFIX)
  const hasReason = String(block.reasonTh || '').includes(LEGACY_LADY_DEMOTE_REASON_SNIPPET)

  // Require the full system fingerprint — clock alone is not proof.
  if (hasCode && hasTitle && hasReason) return 'system_legacy'
  return 'ambiguous'
}

function markLegacyDemotionForReview(block, classification) {
  block.legacyDemotionReviewNeeded = true
  block.conflictResolved = false
  // Keep demotedFrom* and current clock for manual inspection — do not invent times.
  const note = classification === 'user_protected'
    ? 'พบ marker demote เก่าแต่มี userEdited — คงเวลาที่ผู้ใช้ตั้งไว้ · ต้องตรวจสอบด้วยมือ ห้าม restore อัตโนมัติ'
    : 'พบ marker demote เก่าแบบกำกวม (ไม่มีลายนิ้วมือระบบครบ) — คงเวลาปัจจุบัน · ต้องตรวจสอบด้วยมือ ห้าม restore อัตโนมัติ'
  if (!String(block.reasonTh || '').includes('ต้องตรวจสอบด้วยมือ ห้าม restore อัตโนมัติ')) {
    block.reasonTh = [block.reasonTh, note].filter(Boolean).join(' · ')
  }
  block.reasonCodes = [...new Set([...(block.reasonCodes || []), 'legacy-demotion-review'])]
}

/**
 * Compatibility: restore only when pre-P0 system demotion fingerprint is complete.
 * Ambiguous / userEdited cases keep the current clock and are flagged for review.
 * @param {object} block
 * @returns {boolean} true only when source clock was restored
 */
export function restoreSilentLadyDemotion(block) {
  const kind = classifySilentLadyDemotion(block)
  if (kind === 'system_legacy') {
    block.startTime = block.demotedFromStartTime
    block.endTime = block.demotedFromEndTime
    delete block.demotedFromStartTime
    delete block.demotedFromEndTime
    block.conflictResolved = false
    delete block.legacyDemotionReviewNeeded
    const th = String(block.title || '')
    if (th.startsWith(LEGACY_LADY_DEMOTE_TITLE_PREFIX)) {
      block.title = `โฟกัสเนื้อหา · ${th.slice(LEGACY_LADY_DEMOTE_TITLE_PREFIX.length)}`
    }
    return true
  }
  if (kind === 'user_protected' || kind === 'ambiguous') {
    markLegacyDemotionForReview(block, kind)
    return false
  }
  return false
}

/**
 * Flag content-blocks that overlap Lady live clocks.
 * P0: never overwrite source start/end (no silent move to 09:00–11:00).
 * Reports conflict for user decision; keeps both timed items.
 * @param {Array<object>} tasks
 */
export function resolveLadyLiveConflicts(tasks) {
  const byDate = new Map()
  for (const t of tasks) {
    restoreSilentLadyDemotion(t)
    const d = String(t?.plannedDate || '')
    if (!d) continue
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d).push(t)
  }

  const conflictIds = new Set()
  for (const [, dayTasks] of byDate) {
    const lives = dayTasks.filter(
      (t) => t.liveKind === 'live' && String(t.liveEventId || '').startsWith('lady-'),
    )
    if (!lives.length) continue
    for (const block of dayTasks) {
      if (block.liveKind !== 'content-block') continue
      const bs = parseMinutes(block.startTime)
      const be = parseMinutes(block.endTime)
      if (bs == null || be == null) continue
      const hitLives = lives.filter((live) => rangesOverlap(
        parseMinutes(live.startTime),
        parseMinutes(live.endTime),
        bs,
        be,
      ))
      if (!hitLives.length) continue
      conflictIds.add(block.id)
      // Preserve source clock explicitly (additive fields — no schema break).
      block.sourceStartTime = block.startTime
      block.sourceEndTime = block.endTime
      block.conflictWithLiveEventIds = hitLives
        .map((live) => String(live.liveEventId || live.id || ''))
        .filter(Boolean)
      block.scheduleConflictPending = true
      block.conflictResolved = false
      // Clear any leftover silent-demotion markers without inventing a new slot.
      delete block.demotedFromStartTime
      delete block.demotedFromEndTime
      const conflictNote = `ชนไลฟ์เลดี้เก๋เก๋ (${hitLives.map((l) => `${l.startTime || '?'}–${l.endTime || '?'}`).join(', ')}) — คงเวลาต้นทาง ${block.startTime}–${block.endTime} · รอยืนยันว่าจะเข้าสดรายการใด ยังไม่เลื่อนอัตโนมัติ`
      if (!String(block.reasonTh || '').includes('รอยืนยันว่าจะเข้าสดรายการใด')) {
        block.reasonTh = [block.reasonTh, conflictNote].filter(Boolean).join(' · ')
      }
      block.reasonCodes = [...new Set([
        ...(block.reasonCodes || []).filter((c) => c !== 'victory-lady-wins'),
        'schedule-conflict-pending',
      ])]
      block.priorityTier = block.priorityTier || PRIORITY_TIERS.IF_TIME
    }
  }
  const ids = [...conflictIds]
  // demotedIds kept as alias for older callers — now means "flagged conflicts", not moved.
  return { tasks, conflictIds: ids, demotedIds: ids }
}

const SUBJECT_LABEL_EXTRA = Object.freeze({
  [CIVIL_SERVANT_A]: 'ข้าราชการที่ดี (ภาค ก)',
})

export function subjectLabelTh(subjectId) {
  return SUBJECT_LABEL_EXTRA[subjectId] || HUB_SUBJECT_LABELS[subjectId] || subjectId
}

/**
 * Sort enriched catalog rows using ranked entries (must → if-time → defer, then score).
 * Weakness-focus mode is applied upstream in rankCuratedCatalog.
 * @param {Array<{ id: string }>} items
 * @param {Array<{ row: { id: string }, score: { tier: string, priorityScore: number } }>} ranked
 */
export function sortCatalogByPriority(items, ranked) {
  const order = new Map()
  ranked.forEach((entry, index) => {
    order.set(String(entry.row.id), { index, score: entry.score })
  })
  return [...(items || [])].sort((a, b) => {
    const oa = order.get(String(a.id))
    const ob = order.get(String(b.id))
    if (oa && ob) return oa.index - ob.index
    if (oa && !ob) return -1
    if (!oa && ob) return 1
    return String(a.id).localeCompare(String(b.id))
  })
}

/**
 * Build schedule tasks for live + content-block events from today forward.
 * Multi-day blocks expand to one task per date (evening live or daytime focus).
 * @param {{
 *   todayIso?: string,
 *   untilIso?: string,
 *   existingTaskIds?: string[],
 *   includeLogistics?: boolean,
 * }} [options]
 */
export function generateLiveScheduleTasks(options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const untilIso = options.untilIso || null
  const existing = new Set((options.existingTaskIds || []).map(String))
  const includeLogistics = options.includeLogistics === true

  const events = listLiveTutorEvents(todayIso, {
    includePast: false,
    kinds: includeLogistics ? undefined : ['live', 'content-block'],
  })

  const catalog = enrichCuratedResources()
  const proposedTasks = []
  for (const event of events) {
    for (const day of expandLiveEventDates(event)) {
      if (day.plannedDate < todayIso) continue
      if (untilIso && day.plannedDate > untilIso) continue

      const taskId = `live_${event.id}_${day.plannedDate}`
      if (existing.has(taskId) || proposedTasks.some(t => t.id === taskId)) continue

      const isLive = event.kind === 'live'
      const timeLabel = event.startTime
        ? `${event.startTime}${event.endTime ? `–${event.endTime}` : ''} น.`
        : 'ทั้งวัน (บล็อกเนื้อหา)'

      const baseTask = {
        id: taskId,
        title: isLive
          ? `ไลฟ์ ${timeLabel} · ${event.titleTh}`
          : `โฟกัสเนื้อหา · ${event.titleTh}`,
        plannedDate: day.plannedDate,
        status: 'pending',
        origin: LIVE_SCHEDULE_ORIGIN,
        examPart: event.examPart,
        subjectId: event.subjectId,
        resourceId: null,
        resourceUrl: '',
        originalUrl: '',
        urlStatus: 'unchecked',
        estimatedMinutes: event.estimatedMinutes,
        durationMinutes: event.estimatedMinutes,
        durationIsEstimate: true,
        startTime: event.startTime || null,
        endTime: event.endTime || null,
        priorityTier: event.priorityRank <= 30
          ? PRIORITY_TIERS.MUST
          : event.priorityRank <= 60
            ? PRIORITY_TIERS.IF_TIME
            : PRIORITY_TIERS.DEFER,
        priorityScore: Math.max(0, (100 - event.priorityRank) / 100),
        priorityMode: 'score-max',
        reasonTh: [
          event.reasonTh,
          event.seriesTh,
          `ลำดับความสำคัญ ${event.priorityRank}`,
          `${HUB_EXAM_PART_LABELS[event.examPart] || event.examPart} · ${subjectLabelTh(event.subjectId)}`,
        ].join(' · '),
        reasonCodes: ['live-tutor-schedule', `priority-${event.priorityRank}`, event.kind],
        liveEventId: event.id,
        liveKind: event.kind,
        seriesTh: event.seriesTh,
        sourceTh: event.sourceTh,
        planPack: 'live-tutor',
      }
      proposedTasks.push(attachCatalogLinkToLiveTask(baseTask, catalog))
    }
  }

  // Flag VIP/online blocks that overlap Lady live — keep source clocks (P0).
  const { tasks: resolvedTasks, conflictIds } = resolveLadyLiveConflicts(proposedTasks)
  resolvedTasks.sort((a, b) => {
    // List/schedule order: priority first, then date, then start time.
    const pa = Number(a.priorityScore)
    const pb = Number(b.priorityScore)
    if (pb !== pa) return pb - pa
    if (a.plannedDate !== b.plannedDate) return a.plannedDate.localeCompare(b.plannedDate)
    return String(a.startTime || '').localeCompare(String(b.startTime || ''))
      || a.id.localeCompare(b.id)
  })

  return {
    version: LIVE_TUTOR_SCHEDULE_VERSION,
    todayIso,
    untilIso,
    proposedTasks: resolvedTasks,
    conflictsPending: conflictIds,
    /** @deprecated alias of conflictsPending — blocks are flagged, not time-shifted */
    conflictsDemoted: conflictIds,
    upcomingLiveCount: resolvedTasks.filter(t => t.liveKind === 'live').length,
    contentBlockCount: resolvedTasks.filter(t => t.liveKind === 'content-block').length,
    notesTh: [
      'ตารางไลฟ์จากโปสเตอร์ที่คุณส่ง — เรียงตามน้ำหนักคะแนนหลักสูตร ไม่ใช่สถิติข้อสอบเก่า',
      'วิชาเอกภาค ข มาก่อน · การศึกษา · กฎหมาย · แล้วค่อยภาค ก',
      'ข้าราชการที่ดี = ภาค ก 50 คะแนน (ไม่ปนกับกฎหมายภาค ข)',
      'เมื่อ VIP/ออนไลน์ชนไลฟ์เลดี้ — คงเวลาต้นทางทั้งคู่ · รายงานรอยืนยัน ห้ามเลื่อนเงียบ ๆ',
      'ไลฟ์เป็นช่วงเย็น — ไม่แย่งงบติวกลางวันของคลังหลักสูตร แต่ปักหมุดในตาราง',
    ],
  }
}

/**
 * Prefer packing curated rows that match the day's VIP focus subject.
 * @param {string} dateIso
 * @param {Array<{ row: object, score: object }>} queue
 */
export function reorderQueueForDateFocus(dateIso, queue) {
  const focus = subjectFocusForDate(dateIso)
  if (!focus?.subjectId) return queue
  const preferred = []
  const rest = []
  for (const entry of queue) {
    if (entry.row.subjectId === focus.subjectId && entry.row.examPart === focus.examPart) {
      preferred.push(entry)
    } else if (
      focus.examPart === 'mixed'
      && entry.row.subjectId === focus.subjectId
    ) {
      preferred.push(entry)
    } else {
      rest.push(entry)
    }
  }
  return [...preferred, ...rest]
}

export { subjectFocusForDate, listLiveTutorEvents, LIVE_TUTOR_SCHEDULE_VERSION }

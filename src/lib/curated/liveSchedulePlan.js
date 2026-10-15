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

  proposedTasks.sort((a, b) => {
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
    proposedTasks,
    upcomingLiveCount: proposedTasks.filter(t => t.liveKind === 'live').length,
    contentBlockCount: proposedTasks.filter(t => t.liveKind === 'content-block').length,
    notesTh: [
      'ตารางไลฟ์จากโปสเตอร์ที่คุณส่ง — เรียงตามน้ำหนักคะแนนหลักสูตร ไม่ใช่สถิติข้อสอบเก่า',
      'วิชาเอกภาค ข มาก่อน · การศึกษา · กฎหมาย · แล้วค่อยภาค ก',
      'ข้าราชการที่ดี = ภาค ก 50 คะแนน (ไม่ปนกับกฎหมายภาค ข)',
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

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

/**
 * Lady live wins: demote overlapping VIP/online content-blocks to daytime review.
 * @param {Array<object>} tasks
 */
export function resolveLadyLiveConflicts(tasks) {
  const byDate = new Map()
  for (const t of tasks) {
    const d = String(t?.plannedDate || '')
    if (!d) continue
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d).push(t)
  }

  const demotedIds = new Set()
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
      demotedIds.add(block.id)
      block.demotedFromStartTime = block.startTime
      block.demotedFromEndTime = block.endTime
      block.conflictWithLiveEventIds = hitLives
        .map((live) => String(live.liveEventId || live.id || ''))
        .filter(Boolean)
      block.title = `ทบทวนกลางวัน (หลบไลฟ์เลดี้) · ${String(block.title || '').replace(/^โฟกัสเนื้อหา · /, '')}`
      block.startTime = '09:00'
      block.endTime = '11:00'
      block.reasonTh = [
        block.reasonTh,
        `ชนไลฟ์เลดี้เก๋เก๋ (${hitLives.map((l) => `${l.startTime || '?'}–${l.endTime || '?'}`).join(', ')}) — เลื่อนเป็นทบทวนกลางวันตามแผน 100`,
      ].filter(Boolean).join(' · ')
      block.reasonCodes = [...new Set([...(block.reasonCodes || []), 'victory-lady-wins'])]
      block.priorityTier = PRIORITY_TIERS.IF_TIME
      block.conflictResolved = true
    }
  }
  return { tasks, demotedIds: [...demotedIds] }
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

  // Lady live wins over overlapping VIP/online evening content-blocks.
  const { tasks: resolvedTasks, demotedIds } = resolveLadyLiveConflicts(proposedTasks)
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
    conflictsDemoted: demotedIds,
    upcomingLiveCount: resolvedTasks.filter(t => t.liveKind === 'live').length,
    contentBlockCount: resolvedTasks.filter(t => t.liveKind === 'content-block').length,
    notesTh: [
      'ตารางไลฟ์จากโปสเตอร์ที่คุณส่ง — เรียงตามน้ำหนักคะแนนหลักสูตร ไม่ใช่สถิติข้อสอบเก่า',
      'วิชาเอกภาค ข มาก่อน · การศึกษา · กฎหมาย · แล้วค่อยภาค ก',
      'ข้าราชการที่ดี = ภาค ก 50 คะแนน (ไม่ปนกับกฎหมายภาค ข)',
      'ไลฟ์เลดี้เก๋เก๋ชนะเมื่อชนเวลา VIP/ออนไลน์ — บล็อกที่ชนถูกเลื่อนเป็นทบทวนกลางวัน',
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

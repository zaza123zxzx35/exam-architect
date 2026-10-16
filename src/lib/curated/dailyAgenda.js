/**
 * Daily tutor agenda — answers “วันนี้ต้องทำอะไรบ้าง?”
 * Separates real live times (from poster data) from recommended self-study.
 * Never invents live slots or clock times without source evidence.
 */

import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import { listLiveTutorEvents } from '../../data/liveTutorSchedule.js'
import { HUB_EXAM_PART_LABELS, HUB_SUBJECT_LABELS } from '../study/hub.js'
import { generateLiveScheduleTasks, LIVE_SCHEDULE_ORIGIN } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { PART_B_29_ORIGIN } from './partB29Plan.js'
import { VICTORY_PLAN_ORIGIN } from './victoryPlan.js'

export const DAILY_AGENDA_VERSION = '1.1-master-today'

/** @typedef {'live' | 'content-block' | 'logistics' | 'study' | 'review' | 'mock' | 'other'} AgendaKind */
/** @typedef {'not_started' | 'in_progress' | 'done'} AgendaStatus */
/** @typedef {'live_now' | 'soon' | 'ended' | 'scheduled' | 'no_clock'} LiveClockPhase */

function parseMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(String(t))) return null
  const [h, m] = String(t).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

/**
 * Wall-clock phase for a real live slot (Bangkok local).
 * Uses source start/end only — never invents times.
 * @param {{ startTime?: string|null, endTime?: string|null, plannedDate?: string }} item
 * @param {{ now?: Date, todayIso?: string }} [options]
 * @returns {LiveClockPhase}
 */
export function liveClockPhase(item, options = {}) {
  const start = parseMinutes(item?.startTime)
  if (start == null) return 'no_clock'
  const todayIso = options.todayIso || bangkokTodayIso()
  if (item?.plannedDate && item.plannedDate !== todayIso) {
    return item.plannedDate < todayIso ? 'ended' : 'scheduled'
  }
  const now = options.now || new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hh = Number(parts.find((p) => p.type === 'hour')?.value)
  const mm = Number(parts.find((p) => p.type === 'minute')?.value)
  const nowMin = hh * 60 + mm
  let end = parseMinutes(item?.endTime)
  if (end == null) end = start + 90
  if (end <= start) end += 24 * 60
  let cursor = nowMin
  if (cursor < start - 12 * 60 && end > 24 * 60) cursor += 24 * 60
  if (cursor >= start && cursor < end) return 'live_now'
  if (cursor < start && start - cursor <= 60) return 'soon'
  if (cursor >= end) return 'ended'
  return 'scheduled'
}

export function liveClockLabelTh(phase) {
  if (phase === 'live_now') return 'กำลังไลฟ์'
  if (phase === 'soon') return 'ใกล้เริ่ม (≤60 นาที)'
  if (phase === 'ended') return 'จบแล้ว'
  if (phase === 'scheduled') return 'รอเวลา'
  return ''
}

/**
 * @param {unknown} status
 * @returns {AgendaStatus}
 */
export function mapTaskStatus(status) {
  const s = String(status || '')
  if (s === 'done') return 'done'
  if (s === 'in_progress' || s === 'doing') return 'in_progress'
  return 'not_started'
}

/**
 * @param {object} task
 * @returns {AgendaKind}
 */
export function classifyAgendaKind(task) {
  if (task?.liveKind === 'live') return 'live'
  if (task?.liveKind === 'content-block') return 'content-block'
  if (task?.liveKind === 'logistics') return 'logistics'
  if (task?.planPack === 'victory-mock' || String(task?.id || '').startsWith('victory_mock_')) return 'mock'
  if (task?.planPack === 'victory-drive') return 'review'
  const origin = String(task?.origin || '')
  if (
    origin === PART_B_29_ORIGIN
    || origin === VICTORY_PLAN_ORIGIN
    || origin === LIVE_SCHEDULE_ORIGIN
    || String(task?.id || '').startsWith('curated_')
  ) {
    return 'study'
  }
  return 'other'
}

function subjectLabel(id) {
  return HUB_SUBJECT_LABELS[id] || id || 'ยังไม่จัดวิชา'
}

function partLabel(part) {
  return HUB_EXAM_PART_LABELS[part] || (part ? `ภาค ${part}` : '')
}

function tierRank(tier) {
  if (tier === PRIORITY_TIERS.MUST) return 0
  if (tier === PRIORITY_TIERS.IF_TIME) return 1
  if (tier === PRIORITY_TIERS.DEFER) return 2
  return 5
}

/**
 * Sort key: real lives by clock first, then must-tier study, then startTime, then title.
 * @param {object} a
 * @param {object} b
 */
export function compareAgendaItems(a, b) {
  const aLive = a.kind === 'live' ? 0 : 1
  const bLive = b.kind === 'live' ? 0 : 1
  if (aLive !== bLive) return aLive - bLive
  const ta = String(a.startTime || (a.kind === 'live' ? '99:99' : '88:88'))
  const tb = String(b.startTime || (b.kind === 'live' ? '99:99' : '88:88'))
  if (a.kind === 'live' && b.kind === 'live' && ta !== tb) return ta.localeCompare(tb)
  const tr = tierRank(a.priorityTier) - tierRank(b.priorityTier)
  if (tr !== 0) return tr
  if (a.kind !== 'live' && b.kind !== 'live') {
    const sa = String(a.startTime || '')
    const sb = String(b.startTime || '')
    if (sa && sb && sa !== sb) return sa.localeCompare(sb)
    if (sa && !sb) return -1
    if (!sa && sb) return 1
  }
  const ps = Number(b.priorityScore || 0) - Number(a.priorityScore || 0)
  if (ps !== 0) return ps
  return String(a.title || '').localeCompare(String(b.title || ''), 'th')
}

/**
 * Order reason in Thai — evidence from task fields only.
 * @param {object} item
 * @param {number} index 0-based
 */
export function buildOrderReasonTh(item, index) {
  const bits = []
  if (item.kind === 'live') {
    bits.push(`ไลฟ์จริงตามโปสเตอร์${item.startTime ? ` (${item.startTime}${item.endTime ? `–${item.endTime}` : ''} น.)` : ''}`)
  } else if (item.kind === 'content-block') {
    bits.push(item.startTime
      ? `บล็อกเนื้อหาตามตารางต้นทาง (${item.startTime} น.) — ไม่ใช่ไลฟ์สด`
      : 'บล็อกเนื้อหาตามโปสเตอร์ — แนะนำให้อ่านเอง (ไม่มีเวลาไลฟ์ต้นทาง)')
  } else if (item.kind === 'mock') {
    bits.push('จุดตรวจ mock ตามแผน Victory')
  } else if (item.kind === 'review') {
    bits.push('ทบทวนทดแทน Drive / งาน effort')
  } else {
    bits.push('งานติวแนะนำจากแผน curated')
  }
  if (item.priorityTier === PRIORITY_TIERS.MUST) bits.push('ชั้นต้องเก็บคะแนน')
  else if (item.priorityTier === PRIORITY_TIERS.IF_TIME) bits.push('ชั้นถ้ามีเวลา')
  else if (item.priorityTier === PRIORITY_TIERS.DEFER) bits.push('ชั้นพักไว้ก่อน')
  if (item.examPart === 'ข') bits.push('ภาค ข น้ำหนักสูง')
  if (index === 0 && item.kind === 'live') bits.push('จัดก่อนเพราะมีเวลานัดจริง')
  if (item.reasonTh) bits.push(item.reasonTh)
  return bits.filter(Boolean).join(' · ')
}

/**
 * Prep tips before a live — only from known subject + existing reason fields.
 * @param {object[]} liveItems
 * @param {object[]} studyItems
 */
export function buildPreLivePrep(liveItems, studyItems) {
  return liveItems.map((live) => {
    const related = studyItems
      .filter((s) => s.subjectId && live.subjectId && s.subjectId === live.subjectId && s.status !== 'done')
      .slice(0, 3)
    return {
      liveId: live.id,
      liveTitle: live.title,
      startTime: live.startTime,
      prepTh: related.length
        ? `ก่อนไลฟ์ ${live.startTime || ''} น. — ทบทวนสั้น ๆ: ${related.map((r) => r.title).join(' · ')}`
        : `ก่อนไลฟ์ ${live.startTime || ''} น. — เปิดโน้ตวิชา${subjectLabel(live.subjectId)} / จุดที่เคยผิด (ถ้ามี)`,
      relatedTaskIds: related.map((r) => r.id),
    }
  })
}

/**
 * Post-study review suggestions after lives / study blocks.
 * @param {object[]} items
 */
export function buildPostReview(items) {
  const lives = items.filter((i) => i.kind === 'live')
  const reviews = items.filter((i) => i.kind === 'review' || i.kind === 'mock')
  const out = []
  for (const live of lives) {
    out.push({
      afterId: live.id,
      titleTh: `หลังไลฟ์ · ${live.title}`,
      actionTh: 'จดจุดผิด 3 ข้อ + ทบทวนโน้ต 15 นาที (ไม่สร้างช่วงเวลาใหม่)',
      relatedTaskIds: reviews.filter((r) => r.subjectId === live.subjectId).map((r) => r.id).slice(0, 2),
    })
  }
  if (!lives.length && reviews.length) {
    out.push({
      afterId: 'day-review',
      titleTh: 'ทบทวนท้ายวัน',
      actionTh: 'ทำ mock / ทบทวน Drive ที่ค้างในรายการวันนี้',
      relatedTaskIds: reviews.map((r) => r.id),
    })
  }
  return out
}

/**
 * Build agenda item from a schedule task.
 * @param {object} task
 */
export function taskToAgendaItem(task) {
  const kind = classifyAgendaKind(task)
  return {
    id: String(task.id),
    kind,
    isRealLive: kind === 'live',
    title: task.title || '(ไม่มีชื่อ)',
    plannedDate: task.plannedDate,
    startTime: task.startTime || null,
    endTime: task.endTime || null,
    examPart: task.examPart || null,
    subjectId: task.subjectId || null,
    subjectLabelTh: subjectLabel(task.subjectId),
    partLabelTh: partLabel(task.examPart),
    episode: task.episode ?? null,
    seriesTh: task.seriesTh || task.series || null,
    resourceId: task.resourceId || null,
    resourceUrl: task.resourceUrl || task.safeUrl || task.originalUrl || '',
    urlStatus: task.urlStatus || null,
    priorityTier: task.priorityTier || null,
    priorityScore: Number(task.priorityScore) || 0,
    reasonTh: task.reasonTh || '',
    estimatedMinutes: task.estimatedMinutes || task.durationMinutes || null,
    status: mapTaskStatus(task.status),
    origin: task.origin || null,
    liveEventId: task.liveEventId || null,
    liveKind: task.liveKind || null,
    sourceTh: task.sourceTh || null,
    task,
  }
}

function eventSpansDate(event, todayIso) {
  const end = event.dateEnd || event.date
  return event.date <= todayIso && end >= todayIso
}

/**
 * Add-only: pin today's poster live/content-block tasks into the schedule.
 * Never invents times — uses generateLiveScheduleTasks from flyer data.
 * @param {object} schedule
 * @param {string} [todayIso]
 */
export function ensureTodaySourceTasks(schedule, todayIso = bangkokTodayIso()) {
  const existingIds = (schedule?.tasks || []).map((t) => String(t.id))
  const draft = generateLiveScheduleTasks({
    todayIso,
    untilIso: todayIso,
    existingTaskIds: existingIds,
    includeLogistics: true,
  })
  const toAdd = (draft.proposedTasks || []).filter((t) => t.plannedDate === todayIso)
  if (!toAdd.length) {
    return { schedule, added: 0, addedIds: [] }
  }
  return {
    schedule: {
      ...schedule,
      tasks: [...(schedule?.tasks || []), ...toAdd],
    },
    added: toAdd.length,
    addedIds: toAdd.map((t) => t.id),
  }
}

/**
 * Build full daily agenda for one Bangkok calendar day.
 * @param {{
 *   schedule?: { tasks?: object[] },
 *   todayIso?: string,
 *   now?: Date,
 * }} [options]
 */
export function buildDailyAgenda(options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  let tasks = (options.schedule?.tasks || []).filter(
    (t) => t && t.plannedDate === todayIso,
  )
  let filledFromSource = false

  // If nothing planned for today, preview poster-derived tasks (same generator as seed).
  if (!tasks.length) {
    const draft = generateLiveScheduleTasks({
      todayIso,
      untilIso: todayIso,
      existingTaskIds: [],
      includeLogistics: true,
    })
    tasks = (draft.proposedTasks || []).filter((t) => t.plannedDate === todayIso)
    filledFromSource = tasks.length > 0
  }

  const items = tasks.map(taskToAgendaItem).sort(compareAgendaItems)

  const sourceDayEvents = listLiveTutorEvents(todayIso, {
    includePast: true,
  }).filter((e) => eventSpansDate(e, todayIso))

  const sourceLives = sourceDayEvents.filter((e) => e.kind === 'live')
  const sourceFocus = sourceDayEvents.filter((e) => e.kind === 'content-block' || e.kind === 'logistics')

  const now = options.now || new Date()
  const ordered = items.map((item, index) => {
    const clockPhase = item.kind === 'live'
      ? liveClockPhase(item, { now, todayIso })
      : 'no_clock'
    return {
      ...item,
      order: index + 1,
      orderReasonTh: buildOrderReasonTh(item, index),
      clockPhase,
      clockLabelTh: liveClockLabelTh(clockPhase),
      fromSourcePreview: filledFromSource,
    }
  })

  const lives = ordered.filter((i) => i.kind === 'live')
  const selfStudy = ordered.filter((i) => i.kind !== 'live')
  const prep = buildPreLivePrep(lives, selfStudy)
  const postReview = buildPostReview(ordered)

  const doneCount = ordered.filter((i) => i.status === 'done').length
  const inProgressCount = ordered.filter((i) => i.status === 'in_progress').length
  const notStartedCount = ordered.filter((i) => i.status === 'not_started').length
  const remainingCount = ordered.length - doneCount

  const mapSource = (e) => ({
    id: e.id,
    kind: e.kind,
    titleTh: e.titleTh,
    startTime: e.startTime || null,
    endTime: e.endTime || null,
    examPart: e.examPart,
    subjectId: e.subjectId,
    seriesTh: e.seriesTh,
    sourceTh: e.sourceTh,
    reasonTh: e.reasonTh,
    hasClock: Boolean(e.startTime),
  })

  return {
    version: DAILY_AGENDA_VERSION,
    todayIso,
    items: ordered,
    sections: {
      lives,
      selfStudy,
      prep,
      postReview,
    },
    sourceLives: sourceLives.map(mapSource),
    sourceFocus: sourceFocus.map(mapSource),
    sourceDayEvents: sourceDayEvents.map(mapSource),
    filledFromSource,
    counts: {
      total: ordered.length,
      lives: lives.length,
      selfStudy: selfStudy.length,
      done: doneCount,
      inProgress: inProgressCount,
      notStarted: notStartedCount,
      remaining: remainingCount,
      sourceLiveEvents: sourceLives.length,
      sourceFocusEvents: sourceFocus.length,
    },
    empty: ordered.length === 0,
    notesTh: [
      'เวลาไลฟ์มาจากโปสเตอร์ต้นทางเท่านั้น — ไม่สร้างเวลานัดใหม่',
      'บล็อกเนื้อหา / curated = แนะนำให้อ่านเอง แยกจากไลฟ์จริง',
      filledFromSource
        ? 'แสดงจากตารางต้นทางวันนี้ — กดบันทึกลงแผน หรือสร้างแผน 100 เพื่อผสานทั้งชุด'
        : null,
      sourceLives.length && !lives.length && !filledFromSource
        ? 'มีไลฟ์ต้นทางวันนี้ แต่ยังไม่ถูกผสานเข้าแผน — กดสร้าง/รีเฟรชแผน 100'
        : null,
    ].filter(Boolean),
  }
}

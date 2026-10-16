/**
 * Realistic day timeline: anchor live slots, place study in gaps,
 * insert breaks/meals, overflow low-priority work.
 * Durations come only from task.estimatedMinutes or start–end clock span.
 */

import { PRIORITY_TIERS } from './priorityScoring.js'
import { adviseLiveConflicts } from './liveConflictAdvisor.js'

export const DAY_TIMELINE_VERSION = '1.0-coach'
export const COACH_PREFS_META_KEY = 'coachPrefs'

/** @typedef {1|2|3|4} CoachPriority */

export const DEFAULT_COACH_PREFS = Object.freeze({
  dayStart: '09:00',
  dayEnd: '00:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  breakMinutes: 15,
  breakAfterMinutes: 90,
})

function parseMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(String(t))) return null
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

function formatMinutes(total) {
  let t = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Duration in minutes from evidence only.
 * @param {object} task
 */
export function resolveDurationMinutes(task) {
  const est = Number(task?.estimatedMinutes || task?.durationMinutes)
  const start = parseMinutes(task?.startTime)
  const endRaw = parseMinutes(task?.endTime)
  let clock = null
  if (start != null && endRaw != null) {
    let end = endRaw
    if (end <= start) end += 24 * 60
    clock = end - start
  }
  if (Number.isFinite(est) && est > 0 && clock != null) return Math.max(est, clock)
  if (Number.isFinite(est) && est > 0) return est
  if (clock != null) return clock
  return null // unknown — do not invent
}

/**
 * Map to Priority 1–4 using evidence fields only.
 * @param {object} task
 * @param {{ watchLaterIds?: Set<string>, attendIds?: Set<string> }} [ctx]
 * @returns {CoachPriority}
 */
export function coachPriorityFor(task, ctx = {}) {
  const id = String(task.id)
  if (ctx.attendIds?.has(id) || (task.liveKind === 'live' && !ctx.watchLaterIds?.has(id))) {
    if (task.liveKind === 'live') return 1
  }
  if (ctx.watchLaterIds?.has(id) || task.conflictResolved) return 3
  if (task.liveKind === 'live') return 1
  if (task.priorityTier === PRIORITY_TIERS.MUST) return 2
  if (task.planPack === 'victory-mock' || task.planPack === 'victory-drive') return 4
  if (task.priorityTier === PRIORITY_TIERS.DEFER) return 4
  if (task.priorityTier === PRIORITY_TIERS.IF_TIME) return 3
  if (task.liveKind === 'content-block') return 2
  return 3
}

export function coachPriorityLabelTh(p) {
  if (p === 1) return 'Priority 1 — ต้องทำก่อน / เข้าสด'
  if (p === 2) return 'Priority 2 — ควรทำวันนี้'
  if (p === 3) return 'Priority 3 — เก็บย้อนหลัง'
  return 'Priority 4 — งานเสริม'
}

/**
 * @param {object} [raw]
 */
export function normalizeCoachPrefs(raw) {
  const d = { ...DEFAULT_COACH_PREFS, ...(raw && typeof raw === 'object' ? raw : {}) }
  for (const key of ['dayStart', 'dayEnd', 'lunchStart', 'lunchEnd']) {
    if (parseMinutes(d[key]) == null) d[key] = DEFAULT_COACH_PREFS[key]
  }
  d.breakMinutes = Number.isFinite(Number(d.breakMinutes)) ? Number(d.breakMinutes) : 15
  d.breakAfterMinutes = Number.isFinite(Number(d.breakAfterMinutes)) ? Number(d.breakAfterMinutes) : 90
  return d
}

/**
 * @param {{
 *   tasks?: object[],
 *   prefs?: object,
 *   todayIso?: string,
 * }} options
 */
export function buildDayTimeline(options = {}) {
  const prefs = normalizeCoachPrefs(options.prefs)
  const tasks = [...(options.tasks || [])].filter((t) => t && t.status !== 'cancelled')
  const conflicts = adviseLiveConflicts(tasks)

  const watchLaterIds = new Set()
  const attendIds = new Set()
  for (const d of conflicts.decisions) {
    if (d.type === 'resolved') {
      attendIds.add(d.attendLive.id)
      watchLaterIds.add(d.watchLater.id)
    }
  }

  const dayStart = parseMinutes(prefs.dayStart)
  let dayEnd = parseMinutes(prefs.dayEnd)
  if (dayEnd != null && dayStart != null && dayEnd <= dayStart) dayEnd += 24 * 60
  const lunchStart = parseMinutes(prefs.lunchStart)
  let lunchEnd = parseMinutes(prefs.lunchEnd)
  if (lunchStart != null && lunchEnd != null && lunchEnd <= lunchStart) lunchEnd += 24 * 60

  /** @type {Array<object>} */
  const blocks = []
  /** @type {Array<object>} */
  const deferred = []
  /** @type {Array<object>} */
  const unknownDuration = []

  // Anchor: tasks with real startTime (lives / timed blocks) that are not watch-later demotions for evening
  for (const task of tasks) {
    const start = parseMinutes(task.startTime)
    const dur = resolveDurationMinutes(task)
    const priority = coachPriorityFor(task, { watchLaterIds, attendIds })
    if (start == null) continue
    if (dur == null) {
      unknownDuration.push({ task, priority, reasonTh: 'มีเวลาเริ่มแต่คำนวณความยาวไม่ได้จากข้อมูล' })
      continue
    }
    let end = start + dur
    // Keep poster endTime if present and longer/shorter consistently
    const endClock = parseMinutes(task.endTime)
    if (endClock != null) {
      let e = endClock
      if (e <= start) e += 24 * 60
      end = e
    }
    blocks.push({
      kind: task.liveKind === 'live' ? 'live' : 'timed-study',
      taskId: task.id,
      title: task.title,
      start,
      end,
      startTime: formatMinutes(start),
      endTime: formatMinutes(end),
      durationMinutes: end - start,
      priority,
      priorityLabelTh: coachPriorityLabelTh(priority),
      roleTh: watchLaterIds.has(task.id)
        ? 'ดูย้อนหลัง (ชนเวลา)'
        : task.liveKind === 'live'
          ? 'เข้าเรียนสด'
          : 'เรียนตามเวลาต้นทาง',
      isBreak: false,
      isLunch: false,
      task,
    })
  }

  // Occupied ranges: anchors first; lunch only if it does not overlap a timed source block.
  const occupied = blocks.map((b) => ({ start: b.start, end: b.end }))
  /** @type {string[]} */
  const scheduleNotesTh = []
  if (lunchStart != null && lunchEnd != null) {
    const lunchOverlapsAnchor = occupied.some((o) => lunchStart < o.end && o.start < lunchEnd)
    if (lunchOverlapsAnchor) {
      scheduleNotesTh.push(
        `ข้ามพักเที่ยง ${prefs.lunchStart}–${prefs.lunchEnd} เพราะทับช่วงเวลาต้นทางที่มีอยู่แล้ว — พักเองในช่วงนั้นได้`,
      )
    } else {
      occupied.push({ start: lunchStart, end: lunchEnd })
      blocks.push({
        kind: 'lunch',
        taskId: null,
        title: 'พักรับประทานอาหาร',
        start: lunchStart,
        end: lunchEnd,
        startTime: formatMinutes(lunchStart),
        endTime: formatMinutes(lunchEnd),
        durationMinutes: lunchEnd - lunchStart,
        priority: null,
        priorityLabelTh: '',
        roleTh: 'พัก',
        isBreak: true,
        isLunch: true,
        task: null,
      })
    }
  }

  function fits(start, dur) {
    const end = start + dur
    if (dayStart == null || dayEnd == null) return false
    if (start < dayStart || end > dayEnd) return false
    return !occupied.some((o) => start < o.end && o.start < end)
  }

  function placeBreakAfter(endMin) {
    const br = prefs.breakMinutes
    if (!br || br <= 0) return endMin
    if (fits(endMin, br)) {
      occupied.push({ start: endMin, end: endMin + br })
      blocks.push({
        kind: 'break',
        taskId: null,
        title: `พัก ${br} นาที`,
        start: endMin,
        end: endMin + br,
        startTime: formatMinutes(endMin),
        endTime: formatMinutes(endMin + br),
        durationMinutes: br,
        priority: null,
        priorityLabelTh: '',
        roleTh: 'พัก',
        isBreak: true,
        isLunch: false,
        task: null,
      })
      return endMin + br
    }
    return endMin
  }

  // Flexible study: no startTime, or watch-later content needing a daytime slot
  const flexible = tasks
    .filter((t) => {
      if (parseMinutes(t.startTime) != null && !watchLaterIds.has(String(t.id)) && !t.conflictResolved) {
        return false // already anchored
      }
      if (t.liveKind === 'live' && !watchLaterIds.has(String(t.id))) return false
      return true
    })
    .map((t) => ({
      task: t,
      dur: resolveDurationMinutes(t),
      priority: coachPriorityFor(t, { watchLaterIds, attendIds }),
    }))
    .sort((a, b) => a.priority - b.priority || String(a.task.title).localeCompare(String(b.task.title), 'th'))

  for (const item of flexible) {
    if (item.dur == null) {
      unknownDuration.push({
        task: item.task,
        priority: item.priority,
        reasonTh: 'ไม่มีความยาวคลิป/นาทีในข้อมูล — ใส่ในรายการรอยืนยัน',
      })
      continue
    }
    // Already have evening anchor for same id
    if (blocks.some((b) => b.taskId === item.task.id && b.kind !== 'break' && b.kind !== 'lunch')) {
      continue
    }

    let placed = false
    let cursor = dayStart
    while (cursor != null && cursor + item.dur <= dayEnd) {
      if (fits(cursor, item.dur)) {
        const start = cursor
        const end = start + item.dur
        occupied.push({ start, end })
        blocks.push({
          kind: 'study',
          taskId: item.task.id,
          title: item.task.title,
          start,
          end,
          startTime: formatMinutes(start),
          endTime: formatMinutes(end),
          durationMinutes: item.dur,
          priority: item.priority,
          priorityLabelTh: coachPriorityLabelTh(item.priority),
          roleTh: watchLaterIds.has(String(item.task.id)) || item.task.conflictResolved
            ? 'ดูย้อนหลัง / ทบทวน'
            : 'เรียนตามแผน',
          isBreak: false,
          isLunch: false,
          task: item.task,
        })
        if (item.dur >= prefs.breakAfterMinutes) placeBreakAfter(end)
        placed = true
        break
      }
      cursor += 15
    }
    if (!placed) {
      deferred.push({
        task: item.task,
        priority: item.priority,
        priorityLabelTh: coachPriorityLabelTh(item.priority),
        durationMinutes: item.dur,
        reasonTh: 'งบเวลาวันนี้เต็ม — เลื่อนงานสำคัญต่ำกว่า / ย้อนหลังไปวันอื่น',
      })
    }
  }

  blocks.sort((a, b) => a.start - b.start || String(a.title).localeCompare(String(b.title), 'th'))

  const studyBlocks = blocks.filter((b) => !b.isBreak)
  const firstStudy = studyBlocks[0] || null
  const lastBlock = blocks[blocks.length - 1] || null
  const remaining = tasks.filter((t) => t.status !== 'done').length
  const done = tasks.filter((t) => t.status === 'done').length

  return {
    version: DAY_TIMELINE_VERSION,
    prefs,
    blocks,
    deferred,
    unknownDuration,
    conflicts,
    summary: {
      startTime: firstStudy?.startTime || prefs.dayStart,
      endTime: lastBlock ? formatMinutes(lastBlock.end) : prefs.dayEnd,
      firstTaskTitle: firstStudy?.title || null,
      firstPriority: firstStudy?.priority || null,
      blockCount: studyBlocks.length,
      breakCount: blocks.filter((b) => b.isBreak).length,
      deferredCount: deferred.length,
      done,
      remaining,
      total: tasks.length,
      conflictCount: conflicts.conflictCount,
    },
    assumptionsTh: [
      `วันเรียน ${prefs.dayStart}–${prefs.dayEnd} (ค่าเริ่มต้น — ปรับได้เมื่อคุณยืนยันเวลา)`,
      `พักกลางวัน ${prefs.lunchStart}–${prefs.lunchEnd} (ข้ามถ้าทับเวลาต้นทาง)`,
      'ความยาวคลิปใช้ estimatedMinutes หรือช่วงเวลาต้นทางเท่านั้น — ไม่เดาคลิป 4 ชม. ถ้าไม่มีในข้อมูล',
      'ไลฟ์จริงเป็นจุดยึดเวลา; งานอื่นแทรกในช่องว่าง',
      ...scheduleNotesTh,
    ],
  }
}

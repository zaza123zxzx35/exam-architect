/**
 * Realistic day timeline: anchor live slots, place study in gaps,
 * insert breaks/meals, overflow low-priority work.
 * Durations come only from task.estimatedMinutes or start–end clock span.
 */

import { PRIORITY_TIERS } from './priorityScoring.js'
import { adviseLiveConflicts } from './liveConflictAdvisor.js'

export const DAY_TIMELINE_VERSION = '1.1-p1-study-budget'
export const COACH_PREFS_META_KEY = 'coachPrefs'

/** Target actual study minutes per day (excludes lunch/breaks). Not invented filler. */
export const TARGET_STUDY_MINUTES = 480

/** @typedef {1|2|3|4} CoachPriority */

export const DEFAULT_COACH_PREFS = Object.freeze({
  dayStart: '09:00',
  dayEnd: '23:00',
  lunchStart: '12:00',
  lunchEnd: '13:00',
  breakMinutes: 15,
  breakAfterMinutes: 90,
  targetStudyMinutes: TARGET_STUDY_MINUTES,
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
  if (ctx.watchLaterIds?.has(id) || task.conflictResolved || task.scheduleConflictPending) return 3
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
  // Do not say "ดูย้อนหลัง/เก็บย้อนหลัง" — that implies confirmed replay.
  if (p === 3) return 'Priority 3 — รอง / รอยืนยัน'
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
  const target = Number(d.targetStudyMinutes)
  d.targetStudyMinutes = Number.isFinite(target) && target > 0
    ? target
    : TARGET_STUDY_MINUTES
  return d
}

/** Sum study minutes from timeline blocks (excludes lunch/breaks). */
export function sumStudyMinutes(blocks) {
  return (blocks || [])
    .filter((b) => b && !b.isBreak)
    .reduce((sum, b) => sum + (Number(b.durationMinutes) || 0), 0)
}

/**
 * Wall-clock study minutes after merging overlaps (conflict pairs count once).
 * Excludes lunch/breaks. Does not invent duration.
 */
export function sumMergedStudyMinutes(blocks) {
  const ranges = (blocks || [])
    .filter((b) => b && !b.isBreak)
    .map((b) => ({ start: Number(b.start), end: Number(b.end) }))
    .filter((r) => Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .sort((a, b) => a.start - b.start || a.end - b.end)
  if (!ranges.length) return 0
  let total = 0
  let curStart = ranges[0].start
  let curEnd = ranges[0].end
  for (let i = 1; i < ranges.length; i += 1) {
    const r = ranges[i]
    if (r.start < curEnd) {
      curEnd = Math.max(curEnd, r.end)
    } else {
      total += curEnd - curStart
      curStart = r.start
      curEnd = r.end
    }
  }
  total += curEnd - curStart
  return total
}

/** Sum break/lunch minutes only. */
export function sumBreakMinutes(blocks) {
  return (blocks || [])
    .filter((b) => b && b.isBreak)
    .reduce((sum, b) => sum + (Number(b.durationMinutes) || 0), 0)
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
      roleTh: task.scheduleConflictPending
        ? 'ชนเวลาต้นทาง — รอยืนยันเข้าสด/เก็บไว้'
        : watchLaterIds.has(task.id)
          ? 'เสนอเก็บไว้ (ชนเวลา · รอยืนยัน)'
          : task.liveKind === 'live'
            ? 'เข้าเรียนสด'
            : 'เรียนตามเวลาต้นทาง',
      isBreak: false,
      isLunch: false,
      task,
    })
  }

  // Occupied ranges: anchors first; lunch prefers 12:00–13:00, else first free gap (never move live).
  const occupied = blocks.map((b) => ({ start: b.start, end: b.end }))
  /** @type {string[]} */
  const scheduleNotesTh = []

  function rangeFree(start, end) {
    return !occupied.some((o) => start < o.end && o.start < end)
  }

  /**
   * Prefer preferred lunch window; if blocked by source anchors, relocate into another free gap
   * within dayStart–dayEnd without moving live/timed source blocks.
   * @returns {{ start: number, end: number, relocated: boolean } | null}
   */
  function findLunchPlacement(preferredStart, preferredEnd) {
    if (dayStart == null || dayEnd == null) return null
    const dur = preferredEnd - preferredStart
    if (dur <= 0) return null
    if (
      preferredStart >= dayStart
      && preferredEnd <= dayEnd
      && rangeFree(preferredStart, preferredEnd)
    ) {
      return { start: preferredStart, end: preferredEnd, relocated: false }
    }
    // Scan free slots; prefer midday (closer to 12:30).
    const preferMid = 12 * 60 + 30
    let best = null
    let bestDist = Infinity
    for (let t = dayStart; t + dur <= dayEnd; t += 15) {
      const end = t + dur
      if (!rangeFree(t, end)) continue
      const mid = t + dur / 2
      // Prefer near noon; on ties prefer after the blocked preferred window (meal after morning block).
      const dist = Math.abs(mid - preferMid)
      const better = dist < bestDist
        || (dist === bestDist && best && t >= preferredEnd && best.start < preferredEnd)
      if (better) {
        bestDist = dist
        best = { start: t, end, relocated: true }
      }
    }
    return best
  }

  if (lunchStart != null && lunchEnd != null) {
    const placement = findLunchPlacement(lunchStart, lunchEnd)
    if (placement) {
      occupied.push({ start: placement.start, end: placement.end })
      blocks.push({
        kind: 'lunch',
        taskId: null,
        title: placement.relocated
          ? 'พักรับประทานอาหาร (ย้ายจากพักเที่ยงเดิม)'
          : 'พักรับประทานอาหาร',
        start: placement.start,
        end: placement.end,
        startTime: formatMinutes(placement.start),
        endTime: formatMinutes(placement.end),
        durationMinutes: placement.end - placement.start,
        priority: null,
        priorityLabelTh: '',
        roleTh: 'พัก',
        isBreak: true,
        isLunch: true,
        task: null,
      })
      if (placement.relocated) {
        scheduleNotesTh.push(
          `พักเที่ยง ${prefs.lunchStart}–${prefs.lunchEnd} ทับเวลาต้นทาง — ย้ายพักไป ${formatMinutes(placement.start)}–${formatMinutes(placement.end)} ในช่องว่าง (ไม่เลื่อนไลฟ์)`,
        )
      }
    } else {
      const lunchDur = lunchEnd - lunchStart
      scheduleNotesTh.push(
        `ข้ามพักเที่ยง ${prefs.lunchStart}–${prefs.lunchEnd} เพราะทับเวลาต้นทาง และไม่มีช่องว่าง ${lunchDur} นาทีก่อน ${prefs.dayEnd} — ไม่เลื่อนไลฟ์เพื่อบังคับพัก`,
      )
    }
  }

  function fits(start, dur) {
    const end = start + dur
    if (dayStart == null || dayEnd == null) return false
    if (start < dayStart || end > dayEnd) return false
    return rangeFree(start, end)
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

  // Flexible study: no startTime only.
  // P0: scheduleConflictPending keeps source clock anchored — do not re-slot as daytime.
  const flexible = tasks
    .filter((t) => {
      if (parseMinutes(t.startTime) != null && !t.conflictResolved) {
        return false // already anchored (incl. pending conflicts with source times)
      }
      // Legacy silent demotion (conflictResolved + daytime slot): allow flexible only if no startTime
      if (parseMinutes(t.startTime) != null && t.conflictResolved) {
        return false
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

  const targetStudy = prefs.targetStudyMinutes

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

    const studySoFar = sumMergedStudyMinutes(blocks)
    if (studySoFar >= targetStudy) {
      deferred.push({
        task: item.task,
        priority: item.priority,
        priorityLabelTh: coachPriorityLabelTh(item.priority),
        durationMinutes: item.dur,
        reasonTh: `ถึงเป้าเรียนจริงประมาณ ${(targetStudy / 60).toFixed(0)} ชม. แล้ว — ไม่ยัดงานเพิ่ม · เก็บไว้วันอื่น`,
      })
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
          roleTh: item.task.scheduleConflictPending
            ? 'ชนเวลา — รอยืนยัน'
            : watchLaterIds.has(String(item.task.id)) || item.task.conflictResolved
              ? 'เก็บไว้ในแผน (ยังไม่ยืนยัน replay)'
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
        reasonTh: `งบเวลาวันนี้เต็ม (จบยืดหยุ่นไม่เกิน ${prefs.dayEnd} · ไม่ชนไลฟ์ต้นทาง) — เลื่อนงานสำคัญต่ำกว่า / ย้อนหลังไปวันอื่น`,
      })
    }
  }

  blocks.sort((a, b) => a.start - b.start || String(a.title).localeCompare(String(b.title), 'th'))

  const studyBlocks = blocks.filter((b) => !b.isBreak)
  const firstStudy = studyBlocks[0] || null
  const lastBlock = blocks[blocks.length - 1] || null
  const remaining = tasks.filter((t) => t.status !== 'done').length
  const done = tasks.filter((t) => t.status === 'done').length
  // Budget uses merged wall-clock so overlapping conflict pairs are not double-counted.
  const studyMinutesRaw = sumStudyMinutes(blocks)
  const studyMinutes = sumMergedStudyMinutes(blocks)
  const breakMinutesTotal = sumBreakMinutes(blocks)
  const studyHours = Math.round((studyMinutes / 60) * 10) / 10
  const targetHours = Math.round((targetStudy / 60) * 10) / 10

  // Anchored live may legitimately end after dayEnd — never move source clocks.
  if (dayEnd != null && lastBlock && lastBlock.end > dayEnd && !lastBlock.isBreak) {
    scheduleNotesTh.push(
      `มีกิจกรรมต้นทางจบหลัง ${prefs.dayEnd} (${lastBlock.endTime}) — คงเวลาต้นทาง ห้ามเลื่อนเพื่อให้ลงตัว`,
    )
  }

  let budgetNoteTh = ''
  if (studyMinutes >= targetStudy) {
    budgetNoteTh = `เรียนจริงในแผน ≈ ${studyHours} ชม. (ถึงเป้า ~${targetHours} ชม.) · พัก/อาหาร ${breakMinutesTotal} นาที ไม่นับเป็นเวลาเรียน`
  } else {
    const reasons = []
    if (conflicts.conflictCount > 0) {
      reasons.push('มีไลฟ์ชนกันรอยืนยัน — ห้ามนับเป็นเรียนจบ/replay')
    }
    if (deferred.length > 0) {
      reasons.push(`งานยืดหยุ่นเลื่อนออก ${deferred.length} รายการเพราะเต็มช่องหรือชนต้นทาง`)
    }
    if (unknownDuration.length > 0) {
      reasons.push(`ไม่มีความยาวนาทีในข้อมูล ${unknownDuration.length} รายการ — ไม่เดา`)
    }
    if (!reasons.length) {
      reasons.push('ข้อมูล/ช่องว่างวันนี้ไม่พอสำหรับเป้า 8 ชม. — ไม่สร้างตารางเท็จ')
    }
    budgetNoteTh = `เรียนจริงในแผน ≈ ${studyHours} ชม. จากเป้า ~${targetHours} ชม. · ${reasons.join(' · ')} · พัก/อาหาร ${breakMinutesTotal} นาที ไม่นับเป็นเวลาเรียน`
  }

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
      studyMinutes,
      studyMinutesRaw,
      breakMinutes: breakMinutesTotal,
      studyHours,
      targetStudyMinutes: targetStudy,
      targetStudyHours: targetHours,
      budgetMet: studyMinutes >= targetStudy,
      budgetNoteTh,
    },
    assumptionsTh: [
      `วันเรียน ${prefs.dayStart}–${prefs.dayEnd} (งานยืดหยุ่นจบไม่เกิน ${prefs.dayEnd} · ไลฟ์ต้นทางคงเวลาเดิม)`,
      `เป้าเรียนจริง ≈ ${targetHours} ชม./วัน (ไม่นับพัก/อาหาร) — ใกล้เคียงเมื่อข้อมูลเอื้อ ห้ามยัดเท็จ`,
      `พักกลางวัน ${prefs.lunchStart}–${prefs.lunchEnd} (ถ้าทับเวลาต้นทาง ย้ายไปช่องว่างที่เหมาะสมก่อน · ไม่มีช่องว่างจึงข้ามและระบุเหตุผล · ไม่เลื่อนไลฟ์)`,
      'ความยาวคลิปใช้ estimatedMinutes หรือช่วงเวลาต้นทางเท่านั้น — ไม่เดาคลิป 4 ชม. ถ้าไม่มีในข้อมูล',
      'ไลฟ์จริงเป็นจุดยึดเวลา; งานอื่นแทรกในช่องว่าง',
      budgetNoteTh,
      ...scheduleNotesTh,
    ],
  }
}

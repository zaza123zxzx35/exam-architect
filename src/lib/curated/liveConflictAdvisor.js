/**
 * Advise which overlapping timed sessions to attend live vs watch later.
 * Evidence-based: LIVE_PRIORITY ranks, done status, confirmed replay only.
 * Never invents schools/times/URLs.
 * P0: do not claim replay from a bare resourceUrl; do not assume silent demotion.
 */

import { LIVE_PRIORITY } from '../../data/liveTutorSchedule.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { URL_STATUS } from './urlStatus.js'

export const LIVE_CONFLICT_ADVISOR_VERSION = '1.1-replay-evidence'

/** @typedef {'confirmed' | 'unconfirmed_link' | 'none'} ReplayEvidenceStatus */

function parseMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(String(t))) return null
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

function rangeOf(task) {
  const start = parseMinutes(task.startTime)
  if (start == null) return null
  let end = parseMinutes(task.endTime)
  if (end == null) {
    const est = Number(task.estimatedMinutes)
    end = start + (Number.isFinite(est) && est > 0 ? est : 90)
  }
  if (end <= start) end += 24 * 60
  return { start, end }
}

function overlaps(a, b) {
  return a.start < b.end && b.start < a.end
}

function isDone(task) {
  return String(task.status) === 'done'
}

function catalogLinkPresent(task) {
  const url = String(task.resourceUrl || task.safeUrl || task.originalUrl || '').trim()
  return Boolean(url) && !url.includes('...')
}

/**
 * Replay is confirmed only with explicit evidence — never from URL presence alone.
 * @param {object} task
 * @returns {ReplayEvidenceStatus}
 */
export function replayEvidenceStatus(task) {
  if (task?.replayConfirmed === true) return 'confirmed'
  if (task?.allowsReplay === true && task?.urlStatus === URL_STATUS.VERIFIED_ACCESSIBLE) {
    return 'confirmed'
  }
  if (catalogLinkPresent(task)) return 'unconfirmed_link'
  return 'none'
}

function isLadyLive(task) {
  return task.liveKind === 'live' && String(task.liveEventId || '').startsWith('lady-')
}

/**
 * Lower score = better to attend live.
 * Uses only fields present on tasks / known priority ranks.
 */
function attendScore(task) {
  let score = 50
  if (task.liveKind === 'live') score -= 20
  if (task.liveKind === 'content-block') score += 10
  if (task.liveKind === 'logistics') score += 40
  if (isLadyLive(task)) score -= 8
  if (task.priorityTier === PRIORITY_TIERS.MUST) score -= 10
  if (task.priorityTier === PRIORITY_TIERS.DEFER) score += 15
  const pr = Number(task.priorityScore)
  if (Number.isFinite(pr)) score -= pr * 10
  if (isDone(task)) score += 25
  // Pending schedule conflict: prefer attending the live side when scoring pairs
  if (task.scheduleConflictPending) score += 15
  if (task.conflictResolved) score += 20 // legacy silent demotion, if still present
  if (task.liveKind === 'live' && replayEvidenceStatus(task) === 'none') score -= 5
  if (task.liveKind === 'content-block' && replayEvidenceStatus(task) === 'confirmed') score += 5
  return score
}

function reasonAttendTh(winner, loser) {
  const bits = []
  if (winner.liveKind === 'live' && loser.liveKind !== 'live') {
    bits.push('เป็นไลฟ์สดตามโปสเตอร์ ในขณะที่อีกฝ่ายเป็นบล็อกเนื้อหา/อ่านเอง')
  }
  if (isLadyLive(winner)) bits.push('ไลฟ์เลดี้เก๋เก๋ถูกปักเป็นลำดับสูงในแผน')
  if (winner.priorityTier === PRIORITY_TIERS.MUST) bits.push('ชั้นต้องเก็บคะแนน')
  if (isDone(loser)) bits.push('อีกฝ่ายทำเครื่องหมายเรียนแล้ว')
  const loserReplay = replayEvidenceStatus(loser)
  const winnerReplay = replayEvidenceStatus(winner)
  if (winnerReplay === 'none' && loserReplay === 'confirmed') {
    bits.push('ฝั่งที่แนะนำเข้าสดยังไม่มีหลักฐานดูย้อนหลัง — อีกฝั่งยืนยัน replay แล้ว')
  } else if (loserReplay === 'confirmed') {
    bits.push('ฝั่งที่เสนอเก็บไว้มีหลักฐานว่าดูย้อนหลังได้')
  } else if (loserReplay === 'unconfirmed_link') {
    bits.push('ฝั่งที่เสนอเก็บไว้มีลิงก์ในคลัง แต่ยังไม่ยืนยันว่าเปิดดูย้อนหลังได้')
  }
  if (loser.scheduleConflictPending) {
    bits.push('ระบบคงเวลาต้นทางทั้งคู่ไว้ — รอยืนยันว่าจะเข้าสดรายการใด')
  }
  if (loser.conflictResolved) bits.push('รายการนี้เคยถูกเลื่อนกลางวันในเวอร์ชันเก่า')
  if (!bits.length) bits.push('เลือกจากลำดับความสำคัญและประเภทงานที่มีในข้อมูล')
  return bits.join(' · ')
}

function watchLaterHintTh(task) {
  const status = replayEvidenceStatus(task)
  if (status === 'confirmed') {
    return 'มีหลักฐานว่าดูย้อนหลังได้ — เก็บไว้หลังจบไลฟ์หรือวันถัดไปได้'
  }
  if (status === 'unconfirmed_link') {
    return 'มีลิงก์ในคลังแต่ยังไม่ยืนยันว่าเปิดดูย้อนหลังได้ — คงรายการไว้ · รอยืนยัน replay'
  }
  return 'ยังไม่มีหลักฐานดูย้อนหลังในระบบ — คงรายการไว้ในแผน · ห้ามถือว่าข้ามได้'
}

/**
 * @param {object[]} dayTasks tasks for a single plannedDate
 */
export function adviseLiveConflicts(dayTasks) {
  const timed = (dayTasks || [])
    .map((t) => ({ task: t, range: rangeOf(t) }))
    .filter((x) => x.range)

  /** @type {Array<object>} */
  const decisions = []
  const usedPairs = new Set()

  for (let i = 0; i < timed.length; i += 1) {
    for (let j = i + 1; j < timed.length; j += 1) {
      const A = timed[i]
      const B = timed[j]
      if (!overlaps(A.range, B.range)) continue
      const key = [A.task.id, B.task.id].sort().join('|')
      if (usedPairs.has(key)) continue
      usedPairs.add(key)

      const scoreA = attendScore(A.task)
      const scoreB = attendScore(B.task)
      const uncertain = Math.abs(scoreA - scoreB) < 3
        && A.task.liveKind === B.task.liveKind
        && !isDone(A.task) && !isDone(B.task)

      if (uncertain) {
        decisions.push({
          type: 'uncertain',
          a: summarize(A.task),
          b: summarize(B.task),
          overlapTh: overlapLabel(A.task, B.task),
          reasonTh: 'คะแนนใกล้กันและเป็นประเภทเดียวกัน — ข้อมูลไม่พอตัดสินอัตโนมัติ ขอให้คุณเลือกว่าจะเข้าสดฝั่งใด',
          askUserTh: 'ไลฟ์/บล็อกคู่ใดสำคัญกว่าสำหรับคุณในวันนี้?',
        })
        continue
      }

      const winner = scoreA <= scoreB ? A.task : B.task
      const loser = scoreA <= scoreB ? B.task : A.task
      decisions.push({
        type: 'resolved',
        attendLive: summarize(winner),
        watchLater: summarize(loser),
        overlapTh: overlapLabel(winner, loser),
        reasonTh: reasonAttendTh(winner, loser),
        watchLaterHintTh: watchLaterHintTh(loser),
        awaitingUserDecision: Boolean(
          loser.scheduleConflictPending || winner.scheduleConflictPending,
        ),
      })
    }
  }

  // Legacy: tasks still carrying conflictResolved from older silent demotion.
  const lives = (dayTasks || []).filter((t) => t.liveKind === 'live')
  for (const task of dayTasks || []) {
    if (!task.conflictResolved) continue
    const hitIds = new Set((task.conflictWithLiveEventIds || []).map(String))
    const matched = hitIds.size
      ? lives.filter((l) => hitIds.has(String(l.liveEventId || '')) || hitIds.has(String(l.id || '')))
      : []
    const candidates = matched.length ? matched : lives.filter((l) => String(l.liveEventId || '').startsWith('lady-'))
    const live = [...candidates].sort((a, b) => attendScore(a) - attendScore(b))[0]
    if (!live) continue
    const key = [live.id, task.id].sort().join('|')
    if (usedPairs.has(key)) continue
    usedPairs.add(key)
    const from = task.demotedFromStartTime && task.demotedFromEndTime
      ? `${task.demotedFromStartTime}–${task.demotedFromEndTime}`
      : (task.sourceStartTime && task.sourceEndTime
        ? `${task.sourceStartTime}–${task.sourceEndTime}`
        : null)
    decisions.push({
      type: 'resolved',
      attendLive: summarize(live),
      watchLater: summarize(task),
      overlapTh: from
        ? `ช่วงต้นทาง ${from} ชนไลฟ์ ${live.startTime || '?'}–${live.endTime || '?'} (เวอร์ชันเก่าเคยเลื่อนกลางวัน)`
        : 'ชนเวลาไลฟ์เดิม (เวอร์ชันเก่าเคยเลื่อนกลางวัน)',
      reasonTh: reasonAttendTh(live, task),
      watchLaterHintTh: watchLaterHintTh(task),
      awaitingUserDecision: true,
    })
  }

  return {
    version: LIVE_CONFLICT_ADVISOR_VERSION,
    conflictCount: decisions.length,
    decisions,
    notesTh: [
      'เปรียบเทียบเฉพาะงานที่มีเวลาเริ่มจากข้อมูลต้นทาง',
      'ไม่ใช้กฎว่าต้องเลือกสำนักเดิมหรือคลิปยาวกว่าเสมอ',
      'ห้ามสรุปว่าดูย้อนหลังได้จากมี resourceUrl อย่างเดียว — ต้องมีหลักฐาน replay',
      `ลำดับอ้างอิง LIVE_PRIORITY (เอก=${LIVE_PRIORITY.PART_B_MAJOR} …) ผ่านคะแนนในแผน`,
    ],
  }
}

function summarize(task) {
  const replayStatus = replayEvidenceStatus(task)
  return {
    id: task.id,
    title: task.title,
    startTime: task.startTime || null,
    endTime: task.endTime || null,
    sourceStartTime: task.sourceStartTime || task.demotedFromStartTime || null,
    sourceEndTime: task.sourceEndTime || task.demotedFromEndTime || null,
    liveKind: task.liveKind || null,
    liveEventId: task.liveEventId || null,
    subjectId: task.subjectId || null,
    examPart: task.examPart || null,
    status: task.status || 'pending',
    replayStatus,
    /** true only when replay is evidence-confirmed */
    hasReplayLink: replayStatus === 'confirmed',
    estimatedMinutes: Number(task.estimatedMinutes) || null,
    conflictResolved: Boolean(task.conflictResolved),
    scheduleConflictPending: Boolean(task.scheduleConflictPending),
  }
}

function overlapLabel(a, b) {
  return `${a.startTime || '?'}–${a.endTime || '?'} ชนกับ ${b.startTime || '?'}–${b.endTime || '?'}`
}

/**
 * Advise which overlapping timed sessions to attend live vs watch later.
 * Evidence-based: LIVE_PRIORITY ranks, done status, replay URL availability,
 * lady-live conflict demotion already applied upstream.
 * Never invents schools/times/URLs.
 */

import { LIVE_PRIORITY } from '../../data/liveTutorSchedule.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

export const LIVE_CONFLICT_ADVISOR_VERSION = '1.0-evidence'

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

function hasReplayLink(task) {
  const url = String(task.resourceUrl || task.safeUrl || task.originalUrl || '').trim()
  return Boolean(url) && !url.includes('...')
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
  // Infer from liveEventId / reason codes if priorityRank embedded in id path — use priorityScore only
  if (isDone(task)) score += 25
  if (task.conflictResolved) score += 20 // already demoted daytime review
  // Prefer attending when no replay link available
  if (task.liveKind === 'live' && !hasReplayLink(task)) score -= 5
  if (task.liveKind === 'content-block' && hasReplayLink(task)) score += 5
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
  if (!hasReplayLink(winner) && hasReplayLink(loser)) {
    bits.push('ฝั่งที่แนะนำเข้าสดยังไม่มีลิงก์ย้อนหลังในระบบ — เก็บอีกฝั่งดูทีหลังได้ถ้ามีลิงก์')
  } else if (hasReplayLink(loser)) {
    bits.push('ฝั่งที่เลื่อนมีลิงก์ในคลังให้ดูย้อนหลังได้')
  }
  if (loser.conflictResolved) bits.push('ระบบเลื่อนบล็อกที่ชนไลฟ์ไปกลางวันแล้ว')
  if (!bits.length) bits.push('เลือกจากลำดับความสำคัญและประเภทงานที่มีในข้อมูล')
  return bits.join(' · ')
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
        watchLaterHintTh: hasReplayLink(loser)
          ? 'มีลิงก์ในงานนี้ — ดูย้อนหลังหลังจบไลฟ์หรือวันถัดไป'
          : 'ยังไม่มีลิงก์ย้อนหลังในระบบสำหรับงานนี้ — เก็บไว้ในแผนแล้วเปิดจากคลังเมื่อมี',
      })
    }
  }

  // After lady-wins demotion, evening overlap is gone — still surface advice for demoted blocks.
  const lives = (dayTasks || []).filter((t) => t.liveKind === 'live')
  for (const task of dayTasks || []) {
    if (!task.conflictResolved) continue
    const live = [...lives].sort((a, b) => attendScore(a) - attendScore(b))[0]
    if (!live) continue
    const key = [live.id, task.id].sort().join('|')
    if (usedPairs.has(key)) continue
    usedPairs.add(key)
    decisions.push({
      type: 'resolved',
      attendLive: summarize(live),
      watchLater: summarize(task),
      overlapTh: 'ชนเวลาไลฟ์เดิม (เลื่อนเป็นทบทวนกลางวันแล้ว)',
      reasonTh: reasonAttendTh(live, task),
      watchLaterHintTh: hasReplayLink(task)
        ? 'เรียน/ทบทวนในช่วงกลางวันที่ระบบจัดให้ หรือเปิดลิงก์ย้อนหลังเมื่อพร้อม'
        : 'ยังไม่มีลิงก์ย้อนหลังในระบบ — ใช้ช่วงกลางวันที่จัดไว้ทบทวนจากคลัง',
    })
  }

  return {
    version: LIVE_CONFLICT_ADVISOR_VERSION,
    conflictCount: decisions.length,
    decisions,
    notesTh: [
      'เปรียบเทียบเฉพาะงานที่มีเวลาเริ่มจากข้อมูลต้นทาง',
      'ไม่ใช้กฎว่าต้องเลือกสำนักเดิมหรือคลิปยาวกว่าเสมอ',
      `ลำดับอ้างอิง LIVE_PRIORITY (เอก=${LIVE_PRIORITY.PART_B_MAJOR} …) ผ่านคะแนนในแผน`,
    ],
  }
}

function summarize(task) {
  return {
    id: task.id,
    title: task.title,
    startTime: task.startTime || null,
    endTime: task.endTime || null,
    liveKind: task.liveKind || null,
    liveEventId: task.liveEventId || null,
    subjectId: task.subjectId || null,
    examPart: task.examPart || null,
    status: task.status || 'pending',
    hasReplayLink: hasReplayLink(task),
    estimatedMinutes: Number(task.estimatedMinutes) || null,
    conflictResolved: Boolean(task.conflictResolved),
  }
}

function overlapLabel(a, b) {
  return `${a.startTime || '?'}–${a.endTime || '?'} ชนกับ ${b.startTime || '?'}–${b.endTime || '?'}`
}

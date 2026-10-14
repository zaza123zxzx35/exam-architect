import {
  addDaysIso,
  intervalsAdjacent,
  intervalsOverlap,
  isValidIsoDate,
  sessionInterval,
  timeToMinutes,
  weekdayUtc,
} from './time.js'
import { estimateMinutes } from './model.js'

const PRIORITY_RANK = { high: 0, med: 1, low: 2 }

export function validateSession(session) {
  const errors = []
  if (!session || typeof session !== 'object') return ['session-missing']
  if (!session.id) errors.push('id-required')
  if (!isValidIsoDate(session.date)) errors.push('invalid-date')
  if (timeToMinutes(session.startTime) == null) errors.push('invalid-start')
  if (timeToMinutes(session.endTime) == null) errors.push('invalid-end')
  const interval = sessionInterval(session)
  if (!interval) errors.push('invalid-duration')
  else if (interval.end - interval.start < 5) errors.push('duration-too-short')
  else if (interval.end - interval.start > 12 * 60) errors.push('duration-too-long')
  return errors
}

export function validateTask(task) {
  const errors = []
  if (!task?.id) errors.push('id-required')
  if (!task?.title) errors.push('title-required')
  if (task.plannedDate && !isValidIsoDate(task.plannedDate)) errors.push('invalid-planned-date')
  if (task.durationMinutes != null) {
    const n = Number(task.durationMinutes)
    if (!Number.isFinite(n) || n <= 0 || n > 12 * 60) errors.push('invalid-duration')
  }
  return errors
}

/**
 * Detect overlapping planned/done sessions. Adjacent (end==start) is allowed.
 */
export function detectConflicts(sessions) {
  const active = sessions.filter(s => s.status !== 'cancelled')
  const conflicts = []
  for (let i = 0; i < active.length; i += 1) {
    const a = active[i]
    const ia = sessionInterval(a)
    const errs = validateSession(a)
    if (errs.length) {
      conflicts.push({
        id: `invalid-${a.id || i}`,
        sessionIds: [a.id],
        reason: 'invalid-session',
        severity: 'error',
        details: errs,
      })
    }
    if (!ia) continue
    for (let j = i + 1; j < active.length; j += 1) {
      const b = active[j]
      const ib = sessionInterval(b)
      if (!ib) continue
      if (intervalsOverlap(ia, ib) && !intervalsAdjacent(ia, ib)) {
        conflicts.push({
          id: `overlap-${a.id}-${b.id}`,
          sessionIds: [a.id, b.id],
          reason: 'overlap',
          severity: 'error',
        })
      }
    }
  }
  return conflicts
}

export function canAddSession(sessions, candidate) {
  const errors = validateSession(candidate)
  if (errors.length) return { ok: false, errors, conflicts: [] }
  const conflicts = detectConflicts([...sessions, candidate]).filter(c =>
    c.sessionIds.includes(candidate.id) && c.reason === 'overlap'
  )
  return { ok: conflicts.length === 0, errors: [], conflicts }
}

function availabilityWindowsForDate(availability, isoDate) {
  const weekday = weekdayUtc(isoDate)
  return (availability || [])
    .filter(w => Number(w.weekday) === weekday)
    .map(w => ({
      start: timeToMinutes(w.startTime),
      end: timeToMinutes(w.endTime),
    }))
    .filter(w => w.start != null && w.end != null && w.end > w.start)
    .sort((a, b) => a.start - b.start)
}

function occupiedForDate(sessions, isoDate) {
  return sessions
    .filter(s => s.date === isoDate && s.status !== 'cancelled')
    .map(sessionInterval)
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)
}

function findOpenSlot(windows, occupied, durationMinutes, breakMinutes = 0) {
  for (const window of windows) {
    let cursor = window.start
    const blocks = occupied.filter(o => o.start < window.end && o.end > window.start)
    for (const block of blocks) {
      if (cursor + durationMinutes <= block.start && cursor >= window.start) {
        return { start: cursor, end: cursor + durationMinutes }
      }
      cursor = Math.max(cursor, block.end + breakMinutes)
    }
    if (cursor + durationMinutes <= window.end) {
      return { start: cursor, end: cursor + durationMinutes }
    }
  }
  return null
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function nearestExamWeight(task, exams, nowIso) {
  if (!exams?.length) return 0
  if (task.examId) {
    const hit = exams.find(e => e.id === task.examId)
    return hit?.weight || 1
  }
  // Prefer tasks scheduled closer to an exam
  let best = 0
  for (const exam of exams) {
    const examDate = String(exam.startsAt || '').slice(0, 10)
    if (!isValidIsoDate(examDate) || !task.plannedDate) continue
    const daysUntil = Math.round(
      (Date.parse(`${examDate}T00:00:00Z`) - Date.parse(`${nowIso}T00:00:00Z`)) / 86400000
    )
    if (daysUntil < 0) continue
    const proximity = Math.max(0, 40 - daysUntil)
    best = Math.max(best, (exam.weight || 1) * proximity)
  }
  return best
}

export function sortTasksForScheduling(tasks, exams, todayIso) {
  return [...tasks].sort((a, b) => {
    const aOver = a.plannedDate && a.plannedDate < todayIso ? 0 : 1
    const bOver = b.plannedDate && b.plannedDate < todayIso ? 0 : 1
    if (aOver !== bOver) return aOver - bOver
    const pa = PRIORITY_RANK[a.priority] ?? 1
    const pb = PRIORITY_RANK[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    const wa = nearestExamWeight(a, exams, todayIso)
    const wb = nearestExamWeight(b, exams, todayIso)
    if (wa !== wb) return wb - wa
    return String(a.id).localeCompare(String(b.id))
  })
}

/**
 * Split a long task into chunks of maxMinutes (deterministic).
 * Does not mutate completed tasks.
 */
export function splitTask(task, maxMinutes = 60) {
  const duration = Number(task.durationMinutes) || estimateMinutes(task)
  if (duration <= maxMinutes) return [{ ...task }]
  const parts = []
  let remaining = duration
  let part = 1
  while (remaining > 0) {
    const chunk = Math.min(maxMinutes, remaining)
    parts.push({
      ...task,
      id: `${task.id}__part${part}`,
      title: `${task.title} (ส่วน ${part})`,
      durationMinutes: chunk,
      origin: task.origin,
      parentTaskId: task.id,
    })
    remaining -= chunk
    part += 1
    if (part > 24) break // hard stop against infinite split
  }
  return parts
}

/**
 * Reschedule unfinished (pending/deferred) tasks with plannedDate < today
 * into future availability windows as sessions. Never touches completed tasks.
 * Does not create duplicate task ids.
 */
export function rescheduleUnfinished(schedule, options = {}) {
  const todayIso = options.todayIso
  if (!isValidIsoDate(todayIso)) {
    return { schedule, report: { ok: false, reason: 'invalid-today', moved: [], conflicts: [], skipped: [] } }
  }
  const hardStopDate = options.hardStopDate || (schedule.exams?.[0]?.startsAt || '').slice(0, 10)
  const breakMinutes = options.breakMinutes ?? 10
  const maxDaysScan = options.maxDaysScan ?? 45
  const maxSessionMinutes = options.maxSessionMinutes ?? 90

  const tasks = schedule.tasks.map(t => ({ ...t, rescheduleHistory: [...(t.rescheduleHistory || [])] }))
  const sessions = schedule.sessions.map(s => ({ ...s }))
  const existingIds = new Set(sessions.map(s => s.id))

  const unfinished = sortTasksForScheduling(
    tasks.filter(t => (t.status === 'pending' || t.status === 'deferred') && t.plannedDate && t.plannedDate < todayIso),
    schedule.exams,
    todayIso
  )

  const moved = []
  const skipped = []
  let guard = 0

  for (const task of unfinished) {
    guard += 1
    if (guard > 500) {
      skipped.push({ taskId: task.id, reason: 'loop-guard' })
      break
    }

    const chunks = splitTask(task, maxSessionMinutes)
    let chunkIndex = 0
    for (const chunk of chunks) {
      chunkIndex += 1
      let placed = false
      for (let offset = 0; offset <= maxDaysScan; offset += 1) {
        const date = addDaysIso(todayIso, offset)
        if (hardStopDate && isValidIsoDate(hardStopDate) && date > hardStopDate) break
        const windows = availabilityWindowsForDate(schedule.availability, date)
        if (!windows.length) continue
        const occupied = occupiedForDate(sessions, date)
        const slot = findOpenSlot(windows, occupied, chunk.durationMinutes, breakMinutes)
        if (!slot) continue

        const sessionId = `resched_${task.id}_${date}_${chunkIndex}`
        if (existingIds.has(sessionId)) {
          skipped.push({ taskId: task.id, reason: 'duplicate-session-id' })
          placed = true
          break
        }

        const candidate = {
          id: sessionId,
          date,
          startTime: minutesToTime(slot.start),
          endTime: minutesToTime(slot.end),
          zone: slot.start < 12 * 60 ? 'เช้า' : slot.start < 17 * 60 ? 'บ่าย' : 'คืน',
          title: chunk.title,
          note: 'Auto-rescheduled from unfinished work',
          taskIds: [task.id],
          resourceUrl: task.resourceUrl,
          status: 'planned',
          origin: 'scheduler',
          locked: false,
        }
        const check = canAddSession(sessions, candidate)
        if (!check.ok) continue

        sessions.push(candidate)
        existingIds.add(sessionId)
        const taskRef = tasks.find(t => t.id === task.id)
        if (taskRef) {
          taskRef.status = 'deferred'
          taskRef.plannedDate = date
          taskRef.rescheduleHistory.push({
            fromDate: task.originalPlannedDate || task.plannedDate,
            toDate: date,
            at: new Date().toISOString(),
            reason: 'unfinished-auto',
            sessionId,
          })
        }
        moved.push({ taskId: task.id, sessionId, date })
        placed = true
        break
      }
      if (!placed) {
        skipped.push({ taskId: task.id, reason: 'no-available-slot', chunk: chunkIndex })
      }
    }
  }

  const conflicts = detectConflicts(sessions)
  return {
    schedule: { ...schedule, tasks, sessions },
    report: {
      ok: skipped.length === 0 && conflicts.filter(c => c.severity === 'error').length === 0,
      moved,
      skipped,
      conflicts,
    },
  }
}

export function markTaskCompletion(schedule, taskId, done, at = new Date().toISOString()) {
  const tasks = schedule.tasks.map(task => {
    if (task.id !== taskId) return task
    if (done) {
      return { ...task, status: 'done', completedAt: task.completedAt || at }
    }
    return { ...task, status: 'pending', completedAt: undefined }
  })
  return { ...schedule, tasks }
}

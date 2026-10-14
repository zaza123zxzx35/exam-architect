import { canAddSession, detectConflicts } from '../schedule/engine.js'

/**
 * Apply a reviewed preview into a schedule clone.
 * - Adds new smart tasks / sessions only
 * - Never deletes, moves, or completes existing items
 * - Skips duplicate ids
 * - Re-checks overlaps against current sessions
 */
export function applyPlanPreview(schedule, preview) {
  if (!schedule || !preview) {
    return { ok: false, schedule, error: 'missing-preview', applied: { tasks: [], sessions: [] } }
  }

  const preservedIds = new Set(preview.preservedSessionIds || [])
  for (const id of preservedIds) {
    if (!(schedule.sessions || []).some(s => s.id === id)) {
      // Existing session was removed after preview — still safe to add non-overlapping new ones
    }
  }

  const tasks = [...(schedule.tasks || [])]
  const sessions = [...(schedule.sessions || [])]
  const taskIds = new Set(tasks.map(t => t.id))
  const sessionIds = new Set(sessions.map(s => s.id))

  const appliedTasks = []
  const appliedSessions = []
  const skipped = []

  for (const task of preview.proposedTasks || []) {
    if (taskIds.has(task.id)) {
      skipped.push({ type: 'task', id: task.id, reason: 'duplicate-task-id' })
      continue
    }
    const nextTask = {
      ...task,
      status: task.status === 'done' ? 'pending' : (task.status || 'pending'),
      completedAt: undefined,
      origin: 'smart-planner',
    }
    tasks.push(nextTask)
    taskIds.add(task.id)
    appliedTasks.push(task.id)
  }

  for (const session of preview.proposedSessions || []) {
    if (sessionIds.has(session.id)) {
      skipped.push({ type: 'session', id: session.id, reason: 'duplicate-session-id' })
      continue
    }
    const candidate = {
      ...session,
      status: 'planned',
      origin: 'smart-planner',
      note: session.note || 'Smart Planner applied',
    }
    const check = canAddSession(sessions, candidate)
    if (!check.ok) {
      skipped.push({ type: 'session', id: session.id, reason: 'overlap-or-invalid' })
      continue
    }
    sessions.push(candidate)
    sessionIds.add(session.id)
    appliedSessions.push(session.id)
  }

  // Ensure we did not disturb completed tasks
  for (const original of schedule.tasks || []) {
    if (original.status !== 'done') continue
    const current = tasks.find(t => t.id === original.id)
    if (current && current.status !== 'done') {
      return {
        ok: false,
        schedule,
        error: 'completed-task-mutated',
        applied: { tasks: [], sessions: [] },
      }
    }
  }

  const next = {
    ...schedule,
    tasks,
    sessions,
    meta: {
      ...schedule.meta,
      lastSmartPlanAt: new Date().toISOString(),
      lastSmartPlanPreviewId: preview.id,
    },
  }

  const conflicts = detectConflicts(next.sessions).filter(c => c.reason === 'overlap')
  return {
    ok: conflicts.length === 0,
    schedule: next,
    error: conflicts.length ? 'conflicts-after-apply' : null,
    applied: { tasks: appliedTasks, sessions: appliedSessions },
    skipped,
    conflicts,
  }
}

/**
 * Cancel is a no-op on storage — kept for API symmetry and tests.
 */
export function cancelPlanPreview(schedule) {
  return { ok: true, schedule, changed: false }
}

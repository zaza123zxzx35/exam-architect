import { htmlTaskId } from './model.js'

/**
 * Project unified schedule → legacy HTML planner shape `{ days, notes }`.
 * Used for dual-write and for pages that still consume the HTML state API.
 */
export function scheduleToHtmlPlannerState(schedule) {
  const days = {}
  const tasks = Array.isArray(schedule?.tasks) ? schedule.tasks : []
  for (const task of tasks) {
    if (task.status !== 'done') continue
    const parsed = parseHtmlTaskId(task.id)
    if (!parsed) continue
    if (!days[parsed.dateIso]) days[parsed.dateIso] = {}
    days[parsed.dateIso][parsed.taskIndex] = true
  }
  const notes = schedule?.notes && typeof schedule.notes === 'object' ? { ...schedule.notes } : {}
  return { days, notes }
}

export function parseHtmlTaskId(id) {
  const match = String(id || '').match(/^html_(\d{4}-\d{2}-\d{2})_(\d+)$/)
  if (!match) return null
  return { dateIso: match[1], taskIndex: Number(match[2]) }
}

export function isScheduleTaskDone(schedule, dateIso, taskIndex) {
  const id = htmlTaskId(dateIso, taskIndex)
  const task = schedule?.tasks?.find(t => t.id === id)
  return task?.status === 'done'
}

export function dayCompletionFromSchedule(schedule, dateIso, tasks) {
  const total = tasks.length
  let done = 0
  for (let i = 0; i < total; i += 1) {
    if (isScheduleTaskDone(schedule, dateIso, i)) done += 1
  }
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
  }
}

/** Aggregate progress used to assert consistency across pages. */
export function progressSnapshot(schedule) {
  const htmlTasks = (schedule?.tasks || []).filter(t => String(t.id).startsWith('html_'))
  const sessions = schedule?.sessions || []
  const taskDone = htmlTasks.filter(t => t.status === 'done').length
  const sessionDone = sessions.filter(s => s.status === 'done').length
  const projected = scheduleToHtmlPlannerState(schedule)
  let projectedDone = 0
  for (const day of Object.values(projected.days)) {
    projectedDone += Object.values(day).filter(Boolean).length
  }
  return {
    taskTotal: htmlTasks.length,
    taskDone,
    sessionTotal: sessions.length,
    sessionDone,
    projectedDone,
    consistent: projectedDone === taskDone,
  }
}

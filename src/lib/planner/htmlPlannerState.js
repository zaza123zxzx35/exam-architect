/** Legacy HTML planner localStorage key (Phase A verified). */
export const HTML_PLANNER_LS_KEY = 'kru_thp_69_v1'

export function normalizePlannerState(raw) {
  const base = raw && typeof raw === 'object' ? raw : {}
  return {
    days: base.days && typeof base.days === 'object' ? { ...base.days } : {},
    notes: base.notes && typeof base.notes === 'object' ? { ...base.notes } : {},
  }
}

export function isTaskDone(state, dateIso, taskIndex) {
  const day = state?.days?.[dateIso]
  if (!day || typeof day !== 'object') return false
  return Boolean(day[taskIndex] ?? day[String(taskIndex)])
}

export function toggleTaskInState(state, dateIso, taskIndex) {
  const next = normalizePlannerState(state)
  const day = { ...(next.days[dateIso] || {}) }
  const key = String(taskIndex)
  const numericKey = taskIndex
  const currently = Boolean(day[key] ?? day[numericKey])
  if (currently) {
    delete day[key]
    delete day[numericKey]
  } else {
    day[numericKey] = true
  }
  if (Object.keys(day).length === 0) delete next.days[dateIso]
  else next.days[dateIso] = day
  return next
}

export function setAllTasksInState(state, dateIso, taskCount, done) {
  const next = normalizePlannerState(state)
  if (!done) {
    delete next.days[dateIso]
    return next
  }
  const day = {}
  for (let i = 0; i < taskCount; i += 1) day[i] = true
  next.days[dateIso] = day
  return next
}

export function setDailyNoteInState(state, dateIso, note) {
  const next = normalizePlannerState(state)
  if (!note || !String(note).trim()) {
    delete next.notes[dateIso]
  } else {
    next.notes[dateIso] = String(note)
  }
  return next
}

export function dayCompletion(state, dateIso, tasks) {
  const total = tasks.length
  let done = 0
  for (let i = 0; i < total; i += 1) {
    if (isTaskDone(state, dateIso, i)) done += 1
  }
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    complete: total > 0 && done === total,
  }
}

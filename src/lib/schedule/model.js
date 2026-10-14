import {
  dailyPlan,
  getPlanDateByIndex,
} from '../../data/htmlPlannerData.js'
import { EXAMS } from '../../data/examCalendar.js'
import {
  DEFAULT_AVAILABILITY,
  SCHEDULE_ENGINE_VERSION,
  SCHEDULE_SCHEMA_VERSION,
} from './constants.js'
import { normalizeTime } from './time.js'

export function createEmptySchedule() {
  return {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    tasks: [],
    sessions: [],
    notes: {},
    availability: DEFAULT_AVAILABILITY.map(w => ({ ...w })),
    exams: EXAMS.map(e => ({
      id: e.id,
      title: e.title,
      part: e.part,
      startsAt: e.startsAt,
      weight: e.weight || 1,
    })),
    meta: {
      engineVersion: SCHEDULE_ENGINE_VERSION,
      migratedFrom: [],
      taskCountSeed: 0,
      sessionCountSeed: 0,
    },
  }
}

export function htmlTaskId(dateIso, index) {
  return `html_${dateIso}_${index}`
}

export function inferTaskType(title = '') {
  const t = String(title)
  if (/Mock|ข้อสอบ|i-test|Quiz/i.test(t)) return 'practice'
  if (/LIVE|ไลฟ์/i.test(t)) return 'live'
  if (/สมัคร|เอกสาร|ประกาศ|สถานะใบสมัคร/i.test(t)) return 'admin'
  if (/พัก|นอน|🧘|😴/i.test(t)) return 'rest'
  return 'study'
}

export function estimateMinutes(task) {
  if (task.type === 'live') return 90
  if (task.type === 'practice') return 60
  if (task.type === 'admin') return 30
  if (task.type === 'rest') return 45
  if (task.priority === 'high') return 75
  if (task.priority === 'med') return 60
  return 45
}

/** Build canonical day-tasks from HTML dailyPlan (stable ids). */
export function buildTasksFromHtmlPlan(plan = dailyPlan) {
  const tasks = []
  plan.forEach((dayTasks, dayIndex) => {
    const dateIso = getPlanDateByIndex(dayIndex)
    dayTasks.forEach((task, taskIndex) => {
      const type = inferTaskType(task.text)
      const base = {
        id: htmlTaskId(dateIso, taskIndex),
        title: String(task.text || ''),
        type,
        subjectId: undefined,
        topicId: undefined,
        resourceUrl: task.link || undefined,
        priority: task.pri === 'high' || task.pri === 'med' || task.pri === 'low' ? task.pri : 'med',
        plannedDate: dateIso,
        originalPlannedDate: dateIso,
        durationMinutes: estimateMinutes({ type, priority: task.pri || 'med' }),
        deadline: undefined,
        examId: dayIndex >= 32 ? 'exam-part-a-2569' : undefined,
        status: 'pending',
        completedAt: undefined,
        origin: 'html-plan',
        dayIndex,
        taskIndex,
        rescheduleHistory: [],
      }
      base.durationMinutes = estimateMinutes(base)
      tasks.push(base)
    })
  })
  return tasks
}

export function parseSlotTimeRange(timeStr) {
  const parts = String(timeStr || '').split(/\s*-\s*/)
  return {
    startTime: normalizeTime(parts[0]) || '00:00',
    endTime: normalizeTime(parts[1] || parts[0]) || '00:00',
  }
}

/** Convert English timetable days → sessions. */
export function sessionsFromTimetableDays(days = []) {
  const sessions = []
  for (const day of days) {
    const date = day.date
    const slots = Array.isArray(day.slots) ? day.slots : []
    for (const slot of slots) {
      const { startTime, endTime } = parseSlotTimeRange(slot.time)
      sessions.push({
        id: String(slot.id || `sess_${date}_${sessions.length}`),
        date,
        startTime,
        endTime,
        zone: slot.zone || 'other',
        title: String(slot.title || ''),
        note: slot.note ? String(slot.note) : undefined,
        taskIds: [],
        resourceUrl: slot._link || undefined,
        resourceExternal: Boolean(slot._linkExternal),
        status: slot.done ? 'done' : 'planned',
        origin: String(slot.id || '').startsWith('s') && /^\d/.test(String(slot.id).slice(1))
          ? 'timetable-seed'
          : (slot.origin || 'timetable-seed'),
        locked: Boolean(slot.locked),
        dayLabel: day.label,
        dayTag: day.tag,
        timetableDayId: day.id,
      })
    }
  }
  return sessions
}

/** Convert sessions → Timetable page day tree (UI shape). */
export function timetableDaysFromSessions(sessions, seedDays = []) {
  const byDate = new Map()
  for (const seed of seedDays) {
    byDate.set(seed.date, {
      id: seed.id,
      date: seed.date,
      label: seed.label,
      tag: seed.tag,
      slots: [],
    })
  }
  const sorted = [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.startTime.localeCompare(b.startTime)
  })
  for (const session of sorted) {
    if (!byDate.has(session.date)) {
      byDate.set(session.date, {
        id: session.timetableDayId || `d-${session.date}`,
        date: session.date,
        label: session.dayLabel || session.date,
        tag: session.dayTag || '',
        slots: [],
      })
    }
    const day = byDate.get(session.date)
    day.slots.push({
      id: session.id,
      time: `${session.startTime.replace(':', '.')} - ${session.endTime.replace(':', '.')}`,
      zone: session.zone,
      title: session.title,
      note: session.note || '',
      done: session.status === 'done',
      _link: session.resourceUrl,
      _linkExternal: session.resourceExternal,
      locked: session.locked,
    })
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function isScheduleStore(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && value.schemaVersion === SCHEDULE_SCHEMA_VERSION
    && Array.isArray(value.tasks)
    && Array.isArray(value.sessions)
    && value.notes
    && typeof value.notes === 'object'
  )
}

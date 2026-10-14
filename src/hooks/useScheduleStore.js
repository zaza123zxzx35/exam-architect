import { useCallback, useSyncExternalStore } from 'react'
import {
  ensureSessionsFromSeed as ensureSessionsFromSeedCore,
  getScheduleSnapshot,
  subscribeSchedule,
  updateSchedule,
} from '../lib/schedule/store.js'
import {
  canAddSession,
  markTaskCompletion,
  parseSlotTimeRange,
  rescheduleUnfinished,
  timetableDaysFromSessions,
} from '../lib/schedule/index.js'
import { htmlTaskId } from '../lib/schedule/model.js'

let sessionSeq = 0
function nextSessionId(prefix = 's') {
  sessionSeq += 1
  return `${prefix}_${sessionSeq}_${Math.random().toString(36).slice(2, 8)}`
}

function getServerSnapshot() {
  return getScheduleSnapshot(
    typeof window !== 'undefined' ? window.localStorage : undefined
  )
}

/**
 * Shared schedule SSOT hook. All schedule-aware pages should use this
 * (or hooks built on top of it) so Timetable / Today / History stay in sync.
 */
export function useScheduleStore() {
  const schedule = useSyncExternalStore(
    subscribeSchedule,
    () => getScheduleSnapshot(window.localStorage),
    getServerSnapshot
  )

  const setSchedule = useCallback((updater) => {
    return updateSchedule(updater, window.localStorage)
  }, [])

  const ensureSessionsFromSeed = useCallback((seedDays) => {
    return ensureSessionsFromSeedCore(seedDays, window.localStorage)
  }, [])

  const toggleTask = useCallback((dateIso, taskIndex) => {
    const id = htmlTaskId(dateIso, taskIndex)
    updateSchedule((prev) => {
      const task = prev.tasks.find(t => t.id === id)
      const done = task?.status !== 'done'
      return markTaskCompletion(prev, id, done)
    }, window.localStorage)
  }, [])

  const markAllTasks = useCallback((dateIso, taskCount, done) => {
    updateSchedule((prev) => {
      let next = prev
      for (let i = 0; i < taskCount; i += 1) {
        next = markTaskCompletion(next, htmlTaskId(dateIso, i), done)
      }
      return next
    }, window.localStorage)
  }, [])

  const setDailyNote = useCallback((dateIso, note) => {
    updateSchedule((prev) => {
      const notes = { ...prev.notes }
      if (!note || !String(note).trim()) delete notes[dateIso]
      else notes[dateIso] = String(note)
      return { ...prev, notes }
    }, window.localStorage)
  }, [])

  const toggleSession = useCallback((sessionId) => {
    updateSchedule((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => {
        if (session.id !== sessionId) return session
        return {
          ...session,
          status: session.status === 'done' ? 'planned' : 'done',
        }
      }),
    }), window.localStorage)
  }, [])

  const updateSessionNote = useCallback((sessionId, note) => {
    updateSchedule((prev) => ({
      ...prev,
      sessions: prev.sessions.map((session) => (
        session.id === sessionId ? { ...session, note: String(note || '') } : session
      )),
    }), window.localStorage)
  }, [])

  const deleteSession = useCallback((sessionId) => {
    updateSchedule((prev) => ({
      ...prev,
      sessions: prev.sessions.filter(session => session.id !== sessionId),
    }), window.localStorage)
  }, [])

  /**
   * Add a session after deterministic overlap check.
   * @returns {{ ok: boolean, errors?: string[], conflicts?: unknown[] }}
   */
  const addSession = useCallback((partial) => {
    const { startTime, endTime } = parseSlotTimeRange(partial.time || `${partial.startTime} - ${partial.endTime}`)
    const candidate = {
      id: partial.id || nextSessionId('s'),
      date: partial.date,
      startTime: partial.startTime || startTime,
      endTime: partial.endTime || endTime,
      zone: partial.zone || 'คืน',
      title: String(partial.title || ''),
      note: partial.note ? String(partial.note) : undefined,
      taskIds: Array.isArray(partial.taskIds) ? partial.taskIds : [],
      resourceUrl: partial.resourceUrl || partial._link,
      resourceExternal: Boolean(partial.resourceExternal ?? partial._linkExternal),
      status: 'planned',
      origin: partial.origin || 'user',
      locked: Boolean(partial.locked),
      dayLabel: partial.dayLabel,
      dayTag: partial.dayTag,
      timetableDayId: partial.timetableDayId,
    }
    const current = getScheduleSnapshot(window.localStorage)
    const check = canAddSession(current.sessions, candidate)
    if (!check.ok) return check
    updateSchedule(prev => ({
      ...prev,
      sessions: [...prev.sessions, candidate],
    }), window.localStorage)
    return { ok: true, errors: [], conflicts: [] }
  }, [])

  const runReschedule = useCallback((options) => {
    let report = null
    updateSchedule((prev) => {
      const result = rescheduleUnfinished(prev, options)
      report = result.report
      return result.schedule
    }, window.localStorage)
    return report
  }, [])

  const getTimetableDays = useCallback((seedDays = []) => (
    timetableDaysFromSessions(schedule.sessions, seedDays)
  ), [schedule.sessions])

  return {
    schedule,
    setSchedule,
    ensureSessionsFromSeed,
    toggleTask,
    markAllTasks,
    setDailyNote,
    toggleSession,
    updateSessionNote,
    deleteSession,
    addSession,
    runReschedule,
    getTimetableDays,
  }
}

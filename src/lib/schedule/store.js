import { loadOrMigrateSchedule, saveSchedule } from './migrate.js'
import { sessionsFromTimetableDays } from './model.js'

/** @type {import('./model.js').createEmptySchedule extends Function ? ReturnType<typeof import('./model.js').createEmptySchedule> | null : never} */
let cached = null
const listeners = new Set()

function emit(next) {
  for (const listener of listeners) {
    try {
      listener(next)
    } catch (error) {
      console.error('[schedule] subscriber error', error)
    }
  }
}

export function getScheduleSnapshot(storage = globalThis.localStorage) {
  if (cached) return cached
  const { schedule } = loadOrMigrateSchedule(storage)
  cached = schedule
  return cached
}

/**
 * Reset module cache (tests only).
 */
export function resetScheduleCache() {
  cached = null
}

export function subscribeSchedule(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateSchedule(updater, storage = globalThis.localStorage) {
  const prev = getScheduleSnapshot(storage)
  const draft = typeof updater === 'function' ? updater(prev) : updater
  if (draft === prev) return prev
  const saved = saveSchedule(draft, storage, { dualWrite: true })
  cached = saved
  emit(saved)
  return saved
}

/**
 * Seed timetable sessions once when the schedule has none.
 * Does not overwrite existing sessions.
 */
export function ensureSessionsFromSeed(seedDays, storage = globalThis.localStorage) {
  return updateSchedule((prev) => {
    if (prev.sessions.length > 0) return prev
    if (!Array.isArray(seedDays) || seedDays.length === 0) return prev
    const sessions = sessionsFromTimetableDays(seedDays)
    return {
      ...prev,
      sessions,
      meta: {
        ...prev.meta,
        sessionCountSeed: sessions.length,
        migratedFrom: Array.from(new Set([...(prev.meta?.migratedFrom || []), 'timetable-seed'])),
      },
    }
  }, storage)
}

/**
 * Force remigrate (tests / recovery UI).
 */
export function remigrateSchedule(storage = globalThis.localStorage, options = {}) {
  resetScheduleCache()
  const { schedule, report } = loadOrMigrateSchedule(storage, { ...options, force: true })
  cached = schedule
  emit(schedule)
  return { schedule, report }
}

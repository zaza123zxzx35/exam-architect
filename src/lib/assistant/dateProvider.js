import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import { addDaysIso, isValidIsoDate } from '../schedule/time.js'

/**
 * Injectable date/time provider so tests never depend on wall-clock time.
 * Calendar dates use Asia/Bangkok via bangkokTodayIso unless overridden.
 */
export function createDateProvider(options = {}) {
  const fixedToday = options.todayIso && isValidIsoDate(options.todayIso)
    ? options.todayIso
    : null
  const fixedNowMs = Number.isFinite(options.nowMs) ? options.nowMs : null

  return {
    todayIso() {
      if (fixedToday) return fixedToday
      if (typeof options.todayIsoFn === 'function') return options.todayIsoFn()
      return bangkokTodayIso(this.now())
    },
    now() {
      if (fixedNowMs != null) return new Date(fixedNowMs)
      if (typeof options.nowFn === 'function') return options.nowFn()
      return new Date()
    },
    addDays(iso, days) {
      return addDaysIso(iso, days)
    },
  }
}

export function defaultDateProvider() {
  return createDateProvider()
}

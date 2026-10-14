import { useMemo } from 'react'
import { useScheduleStore } from './useScheduleStore'
import { scheduleToHtmlPlannerState } from '../lib/schedule/progress.js'
import { HTML_PLANNER_LS_KEY } from '../lib/planner/htmlPlannerState.js'

/**
 * Shared progress for HTML-parity pages (Today / Overview / History).
 * Backed by `kru_schedule_v1` SSOT with dual-write to `kru_thp_69_v1`.
 * Preserves the same public API as M2 so page components stay thin.
 */
export function useHtmlPlannerState() {
  const {
    schedule,
    toggleTask,
    markAllTasks,
    setDailyNote,
  } = useScheduleStore()

  const state = useMemo(() => scheduleToHtmlPlannerState(schedule), [schedule])

  return {
    state,
    schedule,
    storageKey: HTML_PLANNER_LS_KEY,
    toggleTask,
    markAll: markAllTasks,
    setNote: setDailyNote,
  }
}

import { useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage'
import {
  HTML_PLANNER_LS_KEY,
  normalizePlannerState,
  toggleTaskInState,
  setAllTasksInState,
  setDailyNoteInState,
} from '../lib/planner/htmlPlannerState.js'

/**
 * Shared progress for HTML-parity pages.
 * Uses the same localStorage key as the original HTML planner so existing
 * completions/notes continue to apply.
 */
export function useHtmlPlannerState() {
  const [raw, setRaw] = useLocalStorage(HTML_PLANNER_LS_KEY, { days: {}, notes: {} })
  const state = useMemo(() => normalizePlannerState(raw), [raw])

  const toggleTask = (dateIso, taskIndex) => {
    setRaw(prev => toggleTaskInState(normalizePlannerState(prev), dateIso, taskIndex))
  }

  const markAll = (dateIso, taskCount, done) => {
    setRaw(prev => setAllTasksInState(normalizePlannerState(prev), dateIso, taskCount, done))
  }

  const setNote = (dateIso, note) => {
    setRaw(prev => setDailyNoteInState(normalizePlannerState(prev), dateIso, note))
  }

  return { state, toggleTask, markAll, setNote }
}

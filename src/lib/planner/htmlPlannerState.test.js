import { describe, expect, it } from 'vitest'
import {
  dayCompletion,
  normalizePlannerState,
  setAllTasksInState,
  setDailyNoteInState,
  toggleTaskInState,
} from './htmlPlannerState.js'

describe('htmlPlannerState', () => {
  it('toggles tasks without losing other days', () => {
    let state = normalizePlannerState({})
    state = toggleTaskInState(state, '2026-10-12', 0)
    expect(dayCompletion(state, '2026-10-12', [{}, {}]).done).toBe(1)
    state = toggleTaskInState(state, '2026-10-13', 1)
    expect(state.days['2026-10-12'][0]).toBe(true)
    expect(state.days['2026-10-13'][1]).toBe(true)
    state = toggleTaskInState(state, '2026-10-12', 0)
    expect(state.days['2026-10-12']).toBeUndefined()
  })

  it('marks all and clears notes safely', () => {
    let state = setAllTasksInState({}, '2026-10-12', 3, true)
    expect(dayCompletion(state, '2026-10-12', [{}, {}, {}]).complete).toBe(true)
    state = setAllTasksInState(state, '2026-10-12', 3, false)
    expect(state.days['2026-10-12']).toBeUndefined()
    state = setDailyNoteInState(state, '2026-10-12', '  weak tense  ')
    expect(state.notes['2026-10-12']).toBe('  weak tense  ')
    state = setDailyNoteInState(state, '2026-10-12', '   ')
    expect(state.notes['2026-10-12']).toBeUndefined()
  })
})

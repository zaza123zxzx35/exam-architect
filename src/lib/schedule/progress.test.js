import { describe, expect, it } from 'vitest'
import { dailyPlan, getPlanDateByIndex } from '../../data/htmlPlannerData.js'
import { dayCompletion, isTaskDone } from '../planner/htmlPlannerState.js'
import { markTaskCompletion } from './engine.js'
import { buildScheduleFromSources } from './migrate.js'
import {
  dayCompletionFromSchedule,
  progressSnapshot,
  scheduleToHtmlPlannerState,
} from './progress.js'

describe('schedule progress consistency', () => {
  it('keeps Today/Overview/History projection aligned with task status', () => {
    let schedule = buildScheduleFromSources({
      htmlState: { days: {}, notes: {} },
      timetableDays: [],
    })

    const dateIso = getPlanDateByIndex(0)
    const tasks = dailyPlan[0]
    schedule = markTaskCompletion(schedule, `html_${dateIso}_0`, true, '2026-10-12T10:00:00.000Z')
    schedule = markTaskCompletion(schedule, `html_${dateIso}_1`, true, '2026-10-12T11:00:00.000Z')

    const projected = scheduleToHtmlPlannerState(schedule)
    const fromLegacyHelper = dayCompletion(projected, dateIso, tasks)
    const fromSchedule = dayCompletionFromSchedule(schedule, dateIso, tasks)

    expect(fromLegacyHelper).toEqual(fromSchedule)
    expect(fromSchedule.done).toBe(2)
    expect(isTaskDone(projected, dateIso, 0)).toBe(true)
    expect(isTaskDone(projected, dateIso, 2)).toBe(false)

    const snap = progressSnapshot(schedule)
    expect(snap.taskDone).toBe(2)
    expect(snap.projectedDone).toBe(2)
    expect(snap.consistent).toBe(true)
    expect(snap.taskTotal).toBe(139)
  })

  it('maps all 34 plan days without inventing extra html task ids', () => {
    const schedule = buildScheduleFromSources({ htmlState: { days: {}, notes: {} } })
    const ids = new Set(schedule.tasks.map(t => t.id))
    let expected = 0
    dailyPlan.forEach((tasks, dayIndex) => {
      const dateIso = getPlanDateByIndex(dayIndex)
      tasks.forEach((_, taskIndex) => {
        expected += 1
        expect(ids.has(`html_${dateIso}_${taskIndex}`)).toBe(true)
      })
    })
    expect(expected).toBe(139)
    expect(dailyPlan).toHaveLength(34)
  })
})

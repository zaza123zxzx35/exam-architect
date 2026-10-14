import { describe, expect, it } from 'vitest'
import {
  canAddSession,
  detectConflicts,
  markTaskCompletion,
  rescheduleUnfinished,
  sortTasksForScheduling,
  splitTask,
  validateSession,
} from './engine.js'
import { createEmptySchedule } from './model.js'
import { addDaysIso, intervalsAdjacent, sessionInterval } from './time.js'
import { DEFAULT_AVAILABILITY } from './constants.js'

function sess(overrides) {
  return {
    id: 's1',
    date: '2026-10-20',
    startTime: '13:30',
    endTime: '15:00',
    zone: 'บ่าย',
    title: 'Study',
    status: 'planned',
    origin: 'test',
    taskIds: [],
    ...overrides,
  }
}

describe('schedule engine — validation & conflicts', () => {
  it('rejects invalid dates and durations', () => {
    expect(validateSession(sess({ date: '2026-13-40' }))).toContain('invalid-date')
    expect(validateSession(sess({ startTime: '25:00' }))).toContain('invalid-start')
    expect(validateSession(sess({ startTime: '13:30', endTime: '13:32' }))).toContain('duration-too-short')
  })

  it('detects overlapping events on the same day', () => {
    const a = sess({ id: 'a', startTime: '13:30', endTime: '15:00' })
    const b = sess({ id: 'b', startTime: '14:00', endTime: '16:00' })
    const conflicts = detectConflicts([a, b])
    expect(conflicts.some(c => c.reason === 'overlap')).toBe(true)
    expect(canAddSession([a], b).ok).toBe(false)
  })

  it('allows adjacent sessions (end == start)', () => {
    const a = sess({ id: 'a', startTime: '13:30', endTime: '15:00' })
    const b = sess({ id: 'b', startTime: '15:00', endTime: '16:30' })
    const ia = sessionInterval(a)
    const ib = sessionInterval(b)
    expect(intervalsAdjacent(ia, ib)).toBe(true)
    expect(detectConflicts([a, b]).filter(c => c.reason === 'overlap')).toHaveLength(0)
    expect(canAddSession([a], b).ok).toBe(true)
  })

  it('does not treat different days as overlapping', () => {
    const a = sess({ id: 'a', date: '2026-10-20' })
    const b = sess({ id: 'b', date: '2026-10-21', startTime: '13:30', endTime: '15:00' })
    expect(detectConflicts([a, b]).filter(c => c.reason === 'overlap')).toHaveLength(0)
  })
})

describe('schedule engine — priorities & split', () => {
  it('prioritizes overdue, then high priority, then nearer exams', () => {
    const exams = [{ id: 'exam-a', startsAt: '2026-11-14T09:00:00+07:00', weight: 2 }]
    const tasks = [
      { id: 't-low', priority: 'low', plannedDate: '2026-10-21', status: 'pending' },
      { id: 't-high', priority: 'high', plannedDate: '2026-10-21', status: 'pending', examId: 'exam-a' },
      { id: 't-overdue', priority: 'med', plannedDate: '2026-10-10', status: 'pending' },
    ]
    const sorted = sortTasksForScheduling(tasks, exams, '2026-10-20')
    expect(sorted.map(t => t.id)).toEqual(['t-overdue', 't-high', 't-low'])
  })

  it('splits long tasks and hard-stops runaway splits', () => {
    const parts = splitTask({ id: 'long', title: 'Long', durationMinutes: 180 }, 60)
    expect(parts).toHaveLength(3)
    expect(parts[0].id).toBe('long__part1')
    expect(parts.reduce((n, p) => n + p.durationMinutes, 0)).toBe(180)
    const runaway = splitTask({ id: 'huge', title: 'Huge', durationMinutes: 9999 }, 60)
    expect(runaway.length).toBeLessThanOrEqual(24)
  })
})

describe('schedule engine — reschedule', () => {
  it('reports no available slots when availability is empty', () => {
    const schedule = createEmptySchedule()
    schedule.availability = []
    schedule.tasks = [{
      id: 'html_2026-10-12_0',
      title: 'Old task',
      priority: 'high',
      plannedDate: '2026-10-12',
      originalPlannedDate: '2026-10-12',
      durationMinutes: 60,
      status: 'pending',
      rescheduleHistory: [],
    }]
    const { report } = rescheduleUnfinished(schedule, { todayIso: '2026-10-20' })
    expect(report.moved).toHaveLength(0)
    expect(report.skipped.some(s => s.reason === 'no-available-slot')).toBe(true)
  })

  it('reschedules unfinished work into future free windows without duplicating', () => {
    const schedule = createEmptySchedule()
    schedule.availability = DEFAULT_AVAILABILITY
    schedule.tasks = [{
      id: 'html_2026-10-12_0',
      title: 'Catch up',
      priority: 'high',
      plannedDate: '2026-10-12',
      originalPlannedDate: '2026-10-12',
      durationMinutes: 45,
      status: 'pending',
      rescheduleHistory: [],
    }]
    schedule.sessions = [
      sess({ id: 'fixed', date: '2026-10-20', startTime: '13:30', endTime: '15:00', locked: true }),
    ]

    const first = rescheduleUnfinished(schedule, { todayIso: '2026-10-20', hardStopDate: '2026-11-14' })
    expect(first.report.moved.length).toBeGreaterThanOrEqual(1)
    const sessionIds = first.schedule.sessions.map(s => s.id)
    expect(new Set(sessionIds).size).toBe(sessionIds.length)

    const second = rescheduleUnfinished(first.schedule, { todayIso: '2026-10-20', hardStopDate: '2026-11-14' })
    // Task is deferred with new plannedDate >= today, so should not move again as unfinished.
    const unfinishedAgain = second.schedule.tasks.filter(
      t => (t.status === 'pending' || t.status === 'deferred') && t.plannedDate < '2026-10-20'
    )
    expect(unfinishedAgain).toHaveLength(0)
  })

  it('preserves completed tasks and never rewrites their status', () => {
    const schedule = createEmptySchedule()
    schedule.availability = DEFAULT_AVAILABILITY
    schedule.tasks = [
      {
        id: 'done-1',
        title: 'Done',
        priority: 'high',
        plannedDate: '2026-10-10',
        status: 'done',
        completedAt: '2026-10-10T12:00:00.000Z',
        rescheduleHistory: [],
      },
      {
        id: 'pending-1',
        title: 'Pending',
        priority: 'med',
        plannedDate: '2026-10-11',
        originalPlannedDate: '2026-10-11',
        durationMinutes: 30,
        status: 'pending',
        rescheduleHistory: [],
      },
    ]
    const { schedule: next } = rescheduleUnfinished(schedule, { todayIso: '2026-10-20' })
    const done = next.tasks.find(t => t.id === 'done-1')
    expect(done.status).toBe('done')
    expect(done.completedAt).toBe('2026-10-10T12:00:00.000Z')
    expect(done.plannedDate).toBe('2026-10-10')
  })

  it('markTaskCompletion is idempotent for completedAt', () => {
    let schedule = createEmptySchedule()
    schedule.tasks = [{ id: 't1', title: 'A', status: 'pending' }]
    schedule = markTaskCompletion(schedule, 't1', true, '2026-10-20T01:00:00.000Z')
    schedule = markTaskCompletion(schedule, 't1', true, '2026-10-21T01:00:00.000Z')
    expect(schedule.tasks[0].completedAt).toBe('2026-10-20T01:00:00.000Z')
    schedule = markTaskCompletion(schedule, 't1', false)
    expect(schedule.tasks[0].status).toBe('pending')
    expect(schedule.tasks[0].completedAt).toBeUndefined()
  })

  it('handles timezone / date-boundary via ISO date arithmetic', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    // Bangkok "today" crossing UTC midnight still uses calendar ISO strings in engine.
    const schedule = createEmptySchedule()
    schedule.availability = [{ weekday: 5, startTime: '20:00', endTime: '22:00' }] // Friday
    // 2026-10-23 is Friday UTC
    schedule.tasks = [{
      id: 't-boundary',
      title: 'Boundary',
      priority: 'high',
      plannedDate: '2026-10-20',
      originalPlannedDate: '2026-10-20',
      durationMinutes: 60,
      status: 'pending',
      rescheduleHistory: [],
    }]
    const { report } = rescheduleUnfinished(schedule, {
      todayIso: '2026-10-23',
      hardStopDate: '2026-10-25',
    })
    expect(report.moved.length + report.skipped.length).toBeGreaterThan(0)
  })
})

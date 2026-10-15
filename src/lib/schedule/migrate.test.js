import { beforeEach, describe, expect, it } from 'vitest'
import { dailyPlan } from '../../data/htmlPlannerData.js'
import {
  LEGACY_HTML_KEY,
  LEGACY_TIMETABLE_KEY,
  SCHEDULE_KEY,
} from './constants.js'
import {
  buildScheduleFromSources,
  loadOrMigrateSchedule,
  loadSchedule,
  sanitizeSchedule,
  saveSchedule,
} from './migrate.js'
import { buildTasksFromHtmlPlan } from './model.js'
import { resetScheduleCache } from './store.js'
import { progressSnapshot } from './progress.js'

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length() { return map.size },
    key(index) { return [...map.keys()][index] ?? null },
    getItem(key) { return map.has(key) ? map.get(key) : null },
    setItem(key, value) { map.set(key, String(value)) },
    removeItem(key) { map.delete(key) },
    clear() { map.clear() },
  }
}

describe('schedule migration', () => {
  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage

  beforeEach(() => {
    storage = createMemoryStorage()
    resetScheduleCache()
  })

  it('seeds 139 HTML tasks from the 34-day plan', () => {
    const tasks = buildTasksFromHtmlPlan()
    expect(dailyPlan).toHaveLength(34)
    expect(tasks).toHaveLength(139)
    expect(tasks[0].id).toBe('html_2026-10-12_0')
    expect(tasks.every(t => t.id.startsWith('html_'))).toBe(true)
  })

  it('migrates legacy HTML completions and dual-writes without deleting keys', () => {
    storage.setItem(LEGACY_HTML_KEY, JSON.stringify({
      days: { '2026-10-12': { 0: true, 1: true } },
      notes: { '2026-10-12': 'weak tense' },
    }))
    storage.setItem(LEGACY_TIMETABLE_KEY, JSON.stringify([
      {
        id: 'd-oct12-1',
        date: '2026-10-12',
        label: 'จันทร์ 12 ต.ค. 69',
        tag: 'test',
        slots: [
          { id: 's1', time: '13.30 - 15.00', zone: 'บ่าย', title: 'VOD', done: true },
          { id: 's2', time: '20.00 - 22.00', zone: 'คืน', title: 'Live', done: false },
        ],
      },
    ]))

    const { schedule, report } = loadOrMigrateSchedule(storage)
    expect(report.migrated).toBe(true)
    expect(schedule.tasks).toHaveLength(139)
    expect(schedule.tasks.find(t => t.id === 'html_2026-10-12_0')?.status).toBe('done')
    expect(schedule.tasks.find(t => t.id === 'html_2026-10-12_1')?.status).toBe('done')
    expect(schedule.notes['2026-10-12']).toBe('weak tense')
    expect(schedule.sessions).toHaveLength(2)
    expect(schedule.sessions.find(s => s.id === 's1')?.status).toBe('done')

    // Legacy keys preserved
    expect(storage.getItem(LEGACY_HTML_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_TIMETABLE_KEY)).not.toBeNull()
    expect(storage.getItem(SCHEDULE_KEY)).not.toBeNull()

    const snap = progressSnapshot(schedule)
    expect(snap.taskDone).toBe(2)
    expect(snap.consistent).toBe(true)
  })

  it('is idempotent when schedule already exists', () => {
    const first = loadOrMigrateSchedule(storage)
    expect(first.report.migrated).toBe(true)
    const second = loadOrMigrateSchedule(storage)
    expect(second.report.skipped).toBe(true)
    expect(second.schedule.tasks).toHaveLength(139)
  })

  it('recovers malformed schedule data without discarding legacy progress', () => {
    storage.setItem(SCHEDULE_KEY, '{not-json')
    storage.setItem(LEGACY_HTML_KEY, JSON.stringify({
      days: { '2026-10-13': { 0: true } },
      notes: {},
    }))

    const { schedule, report } = loadOrMigrateSchedule(storage)
    expect(report.migrated).toBe(true)
    expect(report.recovered || report.reason.includes('migrated') || report.reason.includes('recovered')).toBe(true)
    expect(schedule.tasks.length).toBeGreaterThanOrEqual(139)
    expect(schedule.tasks.find(t => t.id === 'html_2026-10-13_0')?.status).toBe('done')
  })

  it('sanitizeSchedule drops invalid sessions and keeps valid tasks', () => {
    const { schedule, recovered } = sanitizeSchedule({
      schemaVersion: 1,
      tasks: [
        { id: 'ok', title: 'OK', status: 'done', completedAt: '2026-10-12T00:00:00.000Z' },
        null,
        { title: 'no-id' },
      ],
      sessions: [
        { id: 'bad', date: 'nope', startTime: '13:00', endTime: '14:00' },
        { id: 'good', date: '2026-10-20', startTime: '13:00', endTime: '14:00', title: 'S' },
      ],
      notes: { '2026-10-20': 'hi', bad: 123 },
    })
    expect(recovered).toBe(true)
    expect(schedule.tasks.some(t => t.id === 'ok')).toBe(true)
    expect(schedule.sessions.map(s => s.id)).toEqual(['good'])
    expect(schedule.notes['2026-10-20']).toBe('hi')
    expect(schedule.notes.bad).toBeUndefined()
  })

  it('preserves curated duration/userEdited markers through sanitize', () => {
    const { schedule } = sanitizeSchedule({
      tasks: [{
        id: 'curated_math-1',
        title: 'Math',
        status: 'pending',
        plannedDate: '2026-10-20',
        estimatedMinutes: 90,
        origin: 'curated-unified-plan',
        userEdited: true,
        resourceId: 'math-1',
        urlStatus: 'needs_full_url',
        examPart: 'ก',
        durationIsEstimate: true,
      }],
      sessions: [],
    })
    const task = schedule.tasks.find(t => t.id === 'curated_math-1')
    expect(task.durationMinutes).toBe(90)
    expect(task.estimatedMinutes).toBe(90)
    expect(task.userEdited).toBe(true)
    expect(task.resourceId).toBe('math-1')
    expect(task.urlStatus).toBe('needs_full_url')
  })

  it('saveSchedule dual-writes HTML planner shape', () => {
    const built = buildScheduleFromSources({
      htmlState: {
        days: { '2026-10-12': { 0: true } },
        notes: { '2026-10-12': 'n' },
      },
      timetableDays: [],
    })
    saveSchedule(built, storage)
    const html = JSON.parse(storage.getItem(LEGACY_HTML_KEY))
    expect(html.days['2026-10-12'][0]).toBe(true)
    expect(html.notes['2026-10-12']).toBe('n')
    expect(loadSchedule(storage)?.tasks.length).toBe(139)
  })

  it('keeps SSOT when a legacy dual-write key throws (never clears schedule)', () => {
    const built = buildScheduleFromSources({
      htmlState: {
        days: { '2026-10-12': { 0: true } },
        notes: {},
      },
      timetableDays: [],
    })
    // Seed prior legacy HTML so failure must leave it untouched
    storage.setItem(LEGACY_HTML_KEY, JSON.stringify({ days: { '2026-10-12': { 1: true } }, notes: {} }))

    const flaky = {
      ...storage,
      setItem(key, value) {
        if (key === LEGACY_HTML_KEY) throw new Error('quota')
        return storage.setItem(key, value)
      },
      getItem: key => storage.getItem(key),
      removeItem: key => storage.removeItem(key),
    }

    expect(() => saveSchedule(built, flaky)).not.toThrow()
    expect(flaky.getItem(SCHEDULE_KEY)).toBeTruthy()
    expect(JSON.parse(flaky.getItem(SCHEDULE_KEY)).tasks.length).toBe(139)
    // Prior legacy HTML preserved (write failed; key not deleted)
    expect(JSON.parse(flaky.getItem(LEGACY_HTML_KEY)).days['2026-10-12'][1]).toBe(true)
  })
})

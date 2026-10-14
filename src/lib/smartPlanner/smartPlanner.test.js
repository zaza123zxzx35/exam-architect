import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptySchedule, buildTasksFromHtmlPlan } from '../schedule/model.js'
import { DEFAULT_AVAILABILITY, SCHEDULE_KEY } from '../schedule/constants.js'
import { saveSchedule } from '../schedule/migrate.js'
import { resetScheduleCache } from '../schedule/store.js'
import { applyPlanPreview, cancelPlanPreview } from './apply.js'
import { generatePlanPreview } from './generate.js'
import { interpretNaturalLanguage, defaultAvailabilityPreset } from './interpret.js'
import { createEmptyPlannerRequest, validatePlannerRequest } from './schema.js'
import { resolveResourcesForSubjects } from './subjects.js'

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length() { return map.size },
    key(i) { return [...map.keys()][i] ?? null },
    getItem(k) { return map.has(k) ? map.get(k) : null },
    setItem(k, v) { map.set(k, String(v)) },
    removeItem(k) { map.delete(k) },
    clear() { map.clear() },
  }
}

function baseSchedule() {
  const schedule = createEmptySchedule()
  schedule.tasks = buildTasksFromHtmlPlan()
  schedule.availability = DEFAULT_AVAILABILITY.map(w => ({ ...w }))
  schedule.sessions = [
    {
      id: 'fixed-1',
      date: '2026-10-20',
      startTime: '20:00',
      endTime: '22:00',
      zone: 'คืน',
      title: 'Existing live',
      status: 'planned',
      origin: 'timetable-seed',
      taskIds: [],
    },
  ]
  // Mark one completed to ensure preservation
  const done = schedule.tasks.find(t => t.id === 'html_2026-10-12_0')
  if (done) {
    done.status = 'done'
    done.completedAt = '2026-10-12T12:00:00.000Z'
  }
  return schedule
}

describe('smart planner — NL interpretation & schema', () => {
  it('interprets a valid Thai request into structured fields', () => {
    const result = interpretNaturalLanguage(
      'อยากติวอังกฤษกับกฎหมาย จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที ก่อนสอบภาค ก',
      { todayIso: '2026-10-14', defaults: createEmptyPlannerRequest() }
    )
    expect(result.mode).toBe('deterministic-nl')
    expect(result.value.subjects).toEqual(expect.arrayContaining(['english', 'law']))
    expect(result.value.examId).toBe('exam-part-a-2569')
    expect(result.value.sessionMinutes).toBe(60)
    expect(result.value.availability.length).toBeGreaterThan(0)
    expect(result.value.availability[0].startTime).toBe('20:00')
  })

  it('flags missing exam date and unavailable time windows', () => {
    const result = interpretNaturalLanguage('อยากติวคณิตหน่อย', {
      todayIso: '2026-10-14',
      defaults: createEmptyPlannerRequest({ subjects: [], availability: [] }),
    })
    expect(result.ok).toBe(false)
    expect(result.clarifyingQuestions.some(q => q.includes('วันสอบ'))).toBe(true)
    expect(result.clarifyingQuestions.some(q => q.includes('เวลาว่าง'))).toBe(true)
  })

  it('rejects invalid schema fields and values', () => {
    const bad = validatePlannerRequest({
      schemaVersion: 1,
      subjects: ['english', 'not-a-subject'],
      priority: 'urgent',
      sessionMinutes: 5,
      availability: [{ weekday: 1, startTime: '20:00', endTime: '22:00' }],
      examDate: '2026-11-14',
      hackerField: true,
    })
    expect(bad.ok).toBe(false)
    expect(bad.errors).toEqual(expect.arrayContaining([
      'unknown-subject:not-a-subject',
      'invalid-priority',
      'invalid-session-minutes',
      'unsupported-fields:hackerField',
    ]))
  })

  it('accepts a complete form-shaped request', () => {
    const ok = validatePlannerRequest({
      schemaVersion: 1,
      examId: 'exam-part-a-2569',
      examDate: '2026-11-14',
      subjects: ['english'],
      availability: defaultAvailabilityPreset(),
      sessionMinutes: 60,
      breakMinutes: 10,
      priority: 'high',
    })
    expect(ok.ok).toBe(true)
    expect(ok.errors).toHaveLength(0)
  })
})

describe('smart planner — preview / apply / cancel', () => {
  /** @type {ReturnType<typeof baseSchedule>} */
  let schedule

  beforeEach(() => {
    schedule = baseSchedule()
    resetScheduleCache()
  })

  it('generates a preview that preserves existing sessions and avoids overlaps', () => {
    const request = createEmptyPlannerRequest({
      examId: 'exam-part-a-2569',
      examDate: '2026-11-14',
      startDate: '2026-10-20',
      endDate: '2026-11-14',
      subjects: ['english'],
      availability: DEFAULT_AVAILABILITY.map(w => ({ ...w })),
      sessionMinutes: 60,
      breakMinutes: 10,
      priority: 'high',
      includeExistingUnfinished: false,
      targetSessionCount: 3,
    })
    const result = generatePlanPreview(schedule, request, { todayIso: '2026-10-20' })
    expect(result.ok).toBe(true)
    expect(result.preview.preservedSessionIds).toContain('fixed-1')
    expect(result.preview.proposedSessions.every(s => s.id !== 'fixed-1')).toBe(true)
    // Proposed sessions must not overlap the fixed 20:00-22:00 on 2026-10-20
    const sameDay = result.preview.proposedSessions.filter(s => s.date === '2026-10-20')
    for (const s of sameDay) {
      const overlapsFixed = s.startTime < '22:00' && s.endTime > '20:00'
      expect(overlapsFixed).toBe(false)
    }
  })

  it('rejects requests with no available time windows', () => {
    const request = {
      schemaVersion: 1,
      examDate: '2026-11-14',
      subjects: ['math'],
      availability: [],
      sessionMinutes: 60,
      breakMinutes: 10,
      priority: 'med',
    }
    const result = generatePlanPreview(schedule, request, { todayIso: '2026-10-20' })
    expect(result.ok).toBe(false)
    expect(
      result.error === 'missing-availability'
      || result.validation?.clarifyingQuestions?.some(q => q.includes('เวลาว่าง'))
    ).toBe(true)
  })

  it('cancel leaves schedule unchanged', () => {
    const before = structuredClone(schedule)
    const cancelled = cancelPlanPreview(schedule)
    expect(cancelled.changed).toBe(false)
    expect(schedule).toEqual(before)
  })

  it('apply persists new sessions/tasks without altering completed work', () => {
    const request = createEmptyPlannerRequest({
      examId: 'exam-part-a-2569',
      examDate: '2026-11-14',
      startDate: '2026-10-21',
      endDate: '2026-11-14',
      subjects: ['english'],
      availability: DEFAULT_AVAILABILITY.map(w => ({ ...w })),
      sessionMinutes: 45,
      breakMinutes: 10,
      priority: 'high',
      includeExistingUnfinished: false,
      targetSessionCount: 2,
    })
    const { preview, ok } = generatePlanPreview(schedule, request, { todayIso: '2026-10-21' })
    expect(ok).toBe(true)

    const storage = memoryStorage()
    const beforeSessions = schedule.sessions.length
    const beforeDone = schedule.tasks.find(t => t.id === 'html_2026-10-12_0')

    const applied = applyPlanPreview(schedule, preview)
    expect(applied.ok).toBe(true)
    expect(applied.schedule.sessions.length).toBe(beforeSessions + applied.applied.sessions.length)
    expect(applied.schedule.sessions.some(s => s.id === 'fixed-1')).toBe(true)
    const stillDone = applied.schedule.tasks.find(t => t.id === 'html_2026-10-12_0')
    expect(stillDone.status).toBe('done')
    expect(stillDone.completedAt).toBe(beforeDone.completedAt)

    // Duplicate prevention on second apply
    const again = applyPlanPreview(applied.schedule, preview)
    expect(again.applied.sessions).toHaveLength(0)
    expect(again.skipped.some(s => s.reason === 'duplicate-session-id' || s.reason === 'duplicate-task-id')).toBe(true)

    saveSchedule(applied.schedule, storage)
    const raw = JSON.parse(storage.getItem(SCHEDULE_KEY))
    expect(raw.sessions.some(s => String(s.origin) === 'smart-planner')).toBe(true)
    expect(raw.tasks.some(t => String(t.origin) === 'smart-planner')).toBe(true)
  })

  it('surfaces missing/incomplete resource references without inventing URLs', () => {
    const { matched, missing } = resolveResourcesForSubjects(['admin'])
    // admin may match HRMS / announcement links — either matched with real urls or incomplete
    for (const row of matched) {
      if (row.url) expect(row.url.startsWith('http')).toBe(true)
    }
    const preview = generatePlanPreview(schedule, createEmptyPlannerRequest({
      examDate: '2026-11-14',
      subjects: ['english'],
      availability: DEFAULT_AVAILABILITY.map(w => ({ ...w })),
      resourceIds: ['does-not-exist'],
      includeExistingUnfinished: false,
      targetSessionCount: 1,
      startDate: '2026-10-20',
    }), { todayIso: '2026-10-20' })
    expect(preview.ok).toBe(true)
    expect(preview.preview.unscheduled.some(u => u.reason === 'missing-resource')).toBe(true)
    void missing
  })

  it('explains when daily limits leave work unscheduled', () => {
    const result = generatePlanPreview(schedule, createEmptyPlannerRequest({
      examDate: '2026-10-22',
      endDate: '2026-10-22',
      startDate: '2026-10-20',
      subjects: ['english', 'law', 'math', 'education'],
      topics: ['A', 'B', 'C'],
      availability: [{ weekday: 2, startTime: '20:00', endTime: '21:00' }], // only Tue 60m
      sessionMinutes: 60,
      breakMinutes: 10,
      dailyLimitMinutes: 60,
      includeExistingUnfinished: false,
      priority: 'high',
    }), { todayIso: '2026-10-20' })
    expect(result.ok).toBe(true)
    // Many tasks, tiny window → some unscheduled with explanation
    expect(result.preview.unscheduled.some(u => u.reason === 'no-available-slot')).toBe(true)
    expect(result.preview.unscheduled[0].message).toMatch(/ช่วงว่าง|ชนกับตาราง/)
  })
})

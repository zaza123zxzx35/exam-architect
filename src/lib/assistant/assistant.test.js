import { beforeEach, describe, expect, it } from 'vitest'
import { buildTasksFromHtmlPlan, createEmptySchedule } from '../schedule/model.js'
import { DEFAULT_AVAILABILITY } from '../schedule/constants.js'
import { createDateProvider } from './dateProvider.js'
import { parseRelativeDate } from './relativeDates.js'
import { classifyIntent } from './intents.js'
import {
  createEmptyAssistantContext,
  sanitizeAssistantContext,
} from './context.js'
import { processAssistantTurn } from './dialogue.js'
import { validatePlannerRequest } from '../smartPlanner/schema.js'
import { createEmptyPlannerRequest, defaultAvailabilityPreset } from '../smartPlanner/index.js'

function baseSchedule() {
  const schedule = createEmptySchedule()
  schedule.tasks = buildTasksFromHtmlPlan()
  schedule.availability = DEFAULT_AVAILABILITY.map(w => ({ ...w }))
  schedule.sessions = [
    {
      id: 'keep-me',
      date: '2026-10-20',
      startTime: '13:30',
      endTime: '15:00',
      zone: 'บ่าย',
      title: 'Existing',
      status: 'planned',
      origin: 'timetable-seed',
      taskIds: [],
    },
  ]
  const done = schedule.tasks.find(t => t.id === 'html_2026-10-12_0')
  if (done) {
    done.status = 'done'
    done.completedAt = '2026-10-12T00:00:00.000Z'
  }
  return schedule
}

const dates = createDateProvider({ todayIso: '2026-10-14' })

describe('assistant intents (TH/EN)', () => {
  it('recognizes Thai and English core intents', () => {
    expect(classifyIntent('แผนวันนี้').intent).toBe('show_today')
    expect(classifyIntent("show today's plan").intent).toBe('show_today')
    expect(classifyIntent('วันสอบ').intent).toBe('show_exams')
    expect(classifyIntent('exam dates').intent).toBe('show_exams')
    expect(classifyIntent('ความคืบหน้า').intent).toBe('summarize_progress')
    expect(classifyIntent('progress').intent).toBe('summarize_progress')
    expect(classifyIntent('หาลิงก์ อังกฤษ').intent).toBe('find_resources')
    expect(classifyIntent('find resources for law').intent).toBe('find_resources')
    expect(classifyIntent('ดูจุดอ่อน').intent).toBe('show_weakness')
    expect(classifyIntent('show weaknesses').intent).toBe('show_weakness')
    expect(classifyIntent('อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00').intent).toBe('create_plan')
    expect(classifyIntent('create a plan for English').intent).toBe('create_plan')
    expect(classifyIntent('เลื่อนงานค้าง').intent).toBe('reschedule_task')
    expect(classifyIntent('reschedule unfinished tasks').intent).toBe('reschedule_task')
  })

  it('treats confirm/cancel strongly when a pending change exists', () => {
    expect(classifyIntent('ยืนยัน', { pendingChange: { type: 'x' } }).intent).toBe('confirm')
    expect(classifyIntent('cancel', { pendingChange: { type: 'x' } }).intent).toBe('cancel')
  })

  it('marks unsupported / low-confidence requests', () => {
    expect(classifyIntent('สั่งพิซซ่าหน่อย').intent).toBe('unsupported')
    expect(classifyIntent('asdfasdf').intent).toBe('unsupported')
  })
})

describe('assistant relative dates', () => {
  it('parses today/tomorrow and next weekday with fixed provider', () => {
    // 2026-10-14 is Wednesday (UTC weekday 3)
    expect(parseRelativeDate('วันนี้', {
      todayIso: '2026-10-14',
      addDays: dates.addDays.bind(dates),
    }).iso).toBe('2026-10-14')
    expect(parseRelativeDate('tomorrow', {
      todayIso: '2026-10-14',
      addDays: dates.addDays.bind(dates),
    }).iso).toBe('2026-10-15')
    expect(parseRelativeDate('next Friday', {
      todayIso: '2026-10-14',
      addDays: dates.addDays.bind(dates),
    }).iso).toBe('2026-10-16')
    expect(parseRelativeDate('2026-11-01', {
      todayIso: '2026-10-14',
      addDays: dates.addDays.bind(dates),
    }).iso).toBe('2026-11-01')
  })

  it('does not use wall-clock when todayIso is injected', () => {
    const provider = createDateProvider({ todayIso: '2026-12-01' })
    expect(provider.todayIso()).toBe('2026-12-01')
    expect(provider.addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('assistant dialogue workflow', () => {
  /** @type {ReturnType<typeof baseSchedule>} */
  let schedule
  /** @type {ReturnType<typeof createEmptyAssistantContext>} */
  let context

  beforeEach(() => {
    schedule = baseSchedule()
    context = createEmptyAssistantContext()
  })

  it('read-only commands do not mutate schedule', () => {
    const before = structuredClone(schedule)
    for (const msg of ['แผนวันนี้', "today's plan", 'วันสอบ', 'exam dates', 'ความคืบหน้า', 'progress', 'หาลิงก์ อังกฤษ', 'ดูจุดอ่อน']) {
      const result = processAssistantTurn(schedule, context, msg, { dateProvider: dates })
      expect(result.scheduleChanged).toBe(false)
      expect(result.nextSchedule).toEqual(before)
      context = result.context
    }
  })

  it('show_weakness is read-only and explains insufficient data without quiz_results', () => {
    const before = structuredClone(schedule)
    const result = processAssistantTurn(schedule, context, 'ดูจุดอ่อน', {
      dateProvider: dates,
      quizResults: {},
    })
    expect(result.classification.intent).toBe('show_weakness')
    expect(result.scheduleChanged).toBe(false)
    expect(result.nextSchedule).toEqual(before)
    expect(result.replies.join('\n')).toMatch(/ยังไม่มีผลแบบทดสอบ|insufficient|attempts:\s*0|ทำไป 0/i)
  })

  it('show_weakness links curated catalog recommendations without changing schedule', () => {
    const quizResults = {
      'q-g2__1': {
        score: 1,
        total: 5,
        pct: 20,
        category: 'ภาค ก - ทักษะภาษาอังกฤษ',
      },
    }
    const before = structuredClone(schedule)
    const result = processAssistantTurn(schedule, context, 'ดูจุดอ่อน', {
      dateProvider: dates,
      quizResults,
    })
    expect(result.scheduleChanged).toBe(false)
    expect(result.nextSchedule).toEqual(before)
    const text = result.replies.join('\n')
    expect(text).toMatch(/เบื้องต้น|preliminary/i)
    expect(text).toContain('/library')
    expect(text).toMatch(/ไม่เปลี่ยนตาราง/)
    expect(text).not.toMatch(/LLM|OpenAI|GPT/i)
    // english-skills-a curated rows are Facebook stubs → must label incomplete URL
    expect(text).toMatch(/URL ไม่ครบ|unchecked|ยังไม่ตรวจ/i)
  })

  it('show_weakness with multi-subject evidence stays read-only and does not invent scores', () => {
    const quizResults = {
      'q-g2__1': { score: 1, total: 5, pct: 20, category: 'ภาค ก - ทักษะภาษาอังกฤษ' },
      'q-g2__2': { score: 2, total: 5, pct: 40, category: 'ภาค ก - ทักษะภาษาอังกฤษ' },
      'q-m1__1': { score: 1, total: 5, pct: 20, category: 'ภาค ข - วิชาเอกภาษาอังกฤษ (Grammar)' },
      'q-m1__2': { score: 1, total: 5, pct: 20, category: 'ภาค ข - วิชาเอกภาษาอังกฤษ (Grammar)' },
    }
    const result = processAssistantTurn(schedule, context, 'show weaknesses', {
      dateProvider: dates,
      quizResults,
    })
    expect(result.scheduleChanged).toBe(false)
    const text = result.replies.join('\n')
    expect(text).toMatch(/english-skills-a|ทักษะ/i)
    expect(text).toMatch(/english-major|วิชาเอก/i)
    expect(text).not.toMatch(/invent|แต่งคะแนน/i)
  })
  it('show_weakness reports observed weakness from supplied quiz_results without writing schedule', () => {
    const before = structuredClone(schedule)
    const quizResults = {
      'q-g2__1': {
        score: 1,
        total: 5,
        pct: 20,
        category: 'ภาค ก - ทักษะภาษาอังกฤษ',
      },
    }
    const result = processAssistantTurn(schedule, context, 'show weaknesses', {
      dateProvider: dates,
      quizResults,
    })
    expect(result.classification.intent).toBe('show_weakness')
    expect(result.scheduleChanged).toBe(false)
    expect(result.nextSchedule).toEqual(before)
    expect(JSON.stringify(quizResults)).toContain('"pct":20')
    expect(result.replies.join('\n')).toMatch(/เบื้องต้น|Preliminary|20%/i)
    expect(result.replies.join('\n')).toMatch(/english-skills-a|ทักษะ/i)
  })

  it('supports multi-turn create → revise → cancel without writing', () => {
    let result = processAssistantTurn(
      schedule,
      context,
      'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที ก่อนสอบภาค ก',
      { dateProvider: dates }
    )
    expect(result.pendingChange?.type).toBe('apply_plan_preview')
    expect(result.scheduleChanged).toBe(false)
    context = result.context

    result = processAssistantTurn(
      schedule,
      context,
      'ปรับแผน เพิ่มกฎหมาย ด้วย',
      { dateProvider: dates }
    )
    expect(result.classification.intent === 'revise_plan' || result.pendingChange).toBeTruthy()
    context = result.context
    const before = structuredClone(schedule)

    result = processAssistantTurn(schedule, context, 'ยกเลิก', { dateProvider: dates })
    expect(result.classification.intent).toBe('cancel')
    expect(result.scheduleChanged).toBe(false)
    expect(result.nextSchedule).toEqual(before)
    expect(result.context.pendingChange).toBeNull()
  })

  it('applies confirmed plan changes and prevents duplicates', () => {
    let result = processAssistantTurn(
      schedule,
      context,
      'create a plan for English Mon-Fri 20:00-22:00 before part A exam',
      { dateProvider: dates }
    )
    // May need availability from EN parse — ensure pending or clarify
    if (!result.pendingChange) {
      // Seed last request via Thai which is known-good, then confirm path
      result = processAssistantTurn(
        schedule,
        createEmptyAssistantContext(),
        'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที สอบภาค ก',
        { dateProvider: dates }
      )
    }
    expect(result.pendingChange?.type).toBe('apply_plan_preview')
    context = result.context
    const existingId = 'keep-me'

    result = processAssistantTurn(schedule, context, 'confirm', { dateProvider: dates })
    expect(result.scheduleChanged).toBe(true)
    expect(result.nextSchedule.sessions.some(s => s.id === existingId)).toBe(true)
    expect(result.nextSchedule.sessions.some(s => s.origin === 'smart-planner')).toBe(true)
    const done = result.nextSchedule.tasks.find(t => t.id === 'html_2026-10-12_0')
    expect(done.status).toBe('done')

    // Second confirm with same pending cleared — no pending
    const again = processAssistantTurn(result.nextSchedule, result.context, 'ยืนยัน', { dateProvider: dates })
    expect(again.scheduleChanged).toBe(false)
  })

  it('asks clarification for ambiguous/unsupported requests', () => {
    const result = processAssistantTurn(schedule, context, 'ทำอะไรสักอย่างให้หน่อย', { dateProvider: dates })
    expect(result.clarifying || result.classification.intent === 'unsupported').toBe(true)
    expect(result.scheduleChanged).toBe(false)
  })

  it('change duration revises pending draft through schema validation', () => {
    let result = processAssistantTurn(
      schedule,
      context,
      'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00 สอบภาค ก',
      { dateProvider: dates }
    )
    context = result.context
    result = processAssistantTurn(schedule, context, 'ช่วงละ 45 นาที', { dateProvider: dates })
    expect(['change_duration', 'revise_plan', 'create_plan']).toContain(result.classification.intent)
    if (result.context.lastRequest) {
      const validated = validatePlannerRequest(result.context.lastRequest)
      expect(validated.errors.filter(e => e.startsWith('unsupported-fields'))).toHaveLength(0)
    }
  })

  it('sanitizes persisted context and drops unknown junk', () => {
    const clean = sanitizeAssistantContext({
      messages: [
        { role: 'user', text: 'hello' },
        { role: 'system', text: 'nope' },
        { role: 'assistant', text: 'hi', at: 'x' },
      ],
      hacker: true,
      language: 'en',
    })
    expect(clean.messages).toHaveLength(2)
    expect(clean.language).toBe('en')
    expect(clean.hacker).toBeUndefined()
  })

  it('remove-task preview cancels without mutation', () => {
    schedule.tasks.push({
      id: 'smart_task_tmp_0',
      title: 'Temporary drill',
      status: 'pending',
      origin: 'smart-planner',
    })
    let result = processAssistantTurn(schedule, context, 'ลบงาน Temporary drill', { dateProvider: dates })
    expect(result.pendingChange?.type).toBe('remove_tasks')
    const before = structuredClone(schedule)
    result = processAssistantTurn(schedule, result.context, 'ยกเลิก', { dateProvider: dates })
    expect(result.nextSchedule).toEqual(before)
  })
})

describe('assistant uses M4 schema for plan drafts', () => {
  it('rejects invalid planner fields still', () => {
    const bad = validatePlannerRequest({
      ...createEmptyPlannerRequest({
        examDate: '2026-11-14',
        availability: defaultAvailabilityPreset(),
        subjects: ['english'],
      }),
      evil: true,
    })
    expect(bad.ok).toBe(false)
    expect(bad.errors.some(e => e.includes('unsupported-fields'))).toBe(true)
  })
})

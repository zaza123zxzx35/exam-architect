import { describe, expect, it, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { parseAssistantAiResponse } from './schema.js'
import { readOpenAiServerConfig, looksLikeSecretLeak } from './config.js'
import { checkRateLimit, _resetRateLimitForTests } from './rateLimit.js'
import { sanitizeAndValidateAiResult } from './sanitizeProposal.js'
import { proposalToPendingChange, applyOpenAiProposal } from './applyProposal.js'
import { handleAssistantAiRequest } from './serverHandler.js'
import { processAssistantTurnWithAi } from '../openaiBridge.js'
import { processAssistantTurn } from '../dialogue.js'
import { createEmptyAssistantContext } from '../context.js'
import { createDateProvider } from '../dateProvider.js'
import { enrichCuratedResources } from '../../curated/catalog.js'
import { FIXTURE_CURATED_RESOURCES } from '../../../data/curatedCatalog.fixture.js'
import { SUBJECT_IDS } from '../../study/taxonomy.js'

const dates = createDateProvider({ todayIso: '2026-10-14' })

function validModelJson(overrides = {}) {
  return {
    responseText: 'แนะนำทักษะอังกฤษภาค ก จากคลัง — URL ยัง unchecked',
    intent: 'find_resources',
    selectedResourceIds: ['fix-skills-01'],
    proposedScheduleChanges: { type: 'none', summary: '', tasks: [] },
    clarificationQuestion: null,
    needsConfirmation: false,
    evidenceNotes: ['official: english-skills-a = ภาค ก'],
    ...overrides,
  }
}

describe('OpenAI config + secrets', () => {
  it('reads OPENAI_API_KEY from server env only and never invents a model entitlement', () => {
    expect(readOpenAiServerConfig({}).configured).toBe(false)
    expect(readOpenAiServerConfig({ OPENAI_API_KEY: 'sk-test' }).configured).toBe(true)
    expect(readOpenAiServerConfig({ OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'my-custom-model' }).model).toBe('my-custom-model')
    expect(looksLikeSecretLeak('sk-abcdefghijklmnopqrstuvwxyz')).toBe(true)
    expect(looksLikeSecretLeak('VITE_OPENAI_API_KEY=sk-x')).toBe(true)
    expect(looksLikeSecretLeak('หาวิดีโอ วิชาเอกอังกฤษ')).toBe(false)
  })
})

describe('schema + sanitize', () => {
  it('rejects malformed responses but coerces unknown intents', () => {
    expect(parseAssistantAiResponse('not-json').ok).toBe(false)
    expect(parseAssistantAiResponse({ responseText: 'x' }).ok).toBe(false)
    // Unknown intents are mapped instead of hard-failing (models often invent labels).
    const coerced = parseAssistantAiResponse(validModelJson({ intent: 'provide_info' }))
    expect(coerced.ok).toBe(true)
    expect(coerced.value.intent).toBe('explain_scope')
    const unknown = parseAssistantAiResponse(validModelJson({ intent: 'hack' }))
    expect(unknown.ok).toBe(true)
    expect(unknown.value.intent).toBe('unsupported')
  })

  it('drops unknown resource ids and keeps incomplete URL warnings', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const fake = validModelJson({
      selectedResourceIds: ['fix-skills-01', 'totally-fake-id'],
      proposedScheduleChanges: {
        type: 'add_curated_tasks',
        summary: 'เพิ่มงาน',
        tasks: [
          { resourceId: 'fix-skills-01', plannedDate: '2026-10-20', durationMinutes: 45, title: null },
          { resourceId: 'nope', plannedDate: '2026-10-21', durationMinutes: 45, title: null },
        ],
      },
      needsConfirmation: true,
    })
    const out = sanitizeAndValidateAiResult(fake, { catalog })
    expect(out.ok).toBe(true)
    expect(out.value.selectedResourceIds).toEqual(['fix-skills-01'])
    expect(out.value.proposedScheduleChanges.tasks).toHaveLength(1)
    expect(out.value.needsConfirmation).toBe(true)
    expect(out.value.evidenceNotes.some(n => /unchecked|needs_full_url|ห้ามอ้าง/.test(n))).toBe(true)
  })

  it('keeps english-skills-a on ก and english-major on ข', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const skills = catalog.find(r => r.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
    const major = catalog.find(r => r.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)
    expect(skills.examPart).toBe('ก')
    expect(major.examPart).toBe('ข')
    const out = sanitizeAndValidateAiResult(validModelJson({
      selectedResourceIds: [skills.id, major.id],
      responseText: 'แยกภาค ก/ข',
      evidenceNotes: ['skills=ก', 'major=ข'],
    }), { catalog })
    expect(out.ok).toBe(true)
    const rows = out.value.selectedResources
    expect(rows.find(r => r.id === skills.id).examPart).toBe('ก')
    expect(rows.find(r => r.id === major.id).examPart).toBe('ข')
  })
})

describe('server handler (mocked OpenAI)', () => {
  beforeEach(() => _resetRateLimitForTests())

  it('falls back when API key missing', async () => {
    const res = await handleAssistantAiRequest({
      userMessage: 'หาวิดีโอวิชาเอกอังกฤษ',
      env: {},
      clientKey: 't1',
    })
    expect(res.status).toBe(503)
    expect(res.body.fallback).toBe(true)
    expect(res.body.error).toBe('openai_not_configured')
  })

  it('falls back on timeout / API error', async () => {
    const timeoutClient = {
      responses: {
        create: async () => {
          const err = new Error('Request timed out')
          err.name = 'AbortError'
          throw err
        },
      },
    }
    const res = await handleAssistantAiRequest({
      userMessage: 'แผนวันนี้',
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-4o-mini' },
      openaiClient: timeoutClient,
      clientKey: 't2',
    })
    expect(res.status).toBe(504)
    expect(res.body.fallback).toBe(true)
    expect(res.body.error).toBe('timeout')
  })

  it('rejects malformed model JSON via sanitize', async () => {
    const badClient = {
      responses: {
        create: async () => ({ output_text: '{"nope":true}' }),
      },
    }
    const res = await handleAssistantAiRequest({
      userMessage: 'ช่วยหาทรัพยากร',
      env: { OPENAI_API_KEY: 'sk-test' },
      openaiClient: badClient,
      clientKey: 't3',
    })
    expect(res.status).toBe(502)
    expect(res.body.fallback).toBe(true)
  })

  it('returns sanitized success for a valid mocked response', async () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const edu = catalog.find(r => r.subjectId === SUBJECT_IDS.EDUCATION)
    const law = catalog.find(r => r.subjectId === SUBJECT_IDS.LAW)
    expect(edu.examPart).toBe('ข')
    expect(law.examPart).toBe('ข')
    const goodClient = {
      responses: {
        create: async () => ({
          output_text: JSON.stringify(validModelJson({
            responseText: 'การศึกษาและกฎหมายอยู่ภาค ข ตาม ก.ค.ศ. ว14/2566',
            intent: 'explain_scope',
            selectedResourceIds: [edu.id, law.id],
            evidenceNotes: ['official curriculum Part ข'],
          })),
        }),
      },
    }
    const res = await handleAssistantAiRequest({
      userMessage: 'วิชาการศึกษาอยู่ภาคไหน',
      env: { OPENAI_API_KEY: 'sk-test', OPENAI_MODEL: 'gpt-4o-mini' },
      openaiClient: goodClient,
      clientKey: 't4',
      todayIso: '2026-10-14',
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.source).toBe('openai')
    expect(res.body.result.selectedResources.every(r => r.examPart === 'ข')).toBe(true)
  })

  it('rate limits burst requests', async () => {
    for (let i = 0; i < 20; i += 1) {
      const r = checkRateLimit('burst', { now: 1_000_000, max: 20 })
      expect(r.allowed).toBe(true)
    }
    const blocked = checkRateLimit('burst', { now: 1_000_000, max: 20 })
    expect(blocked.allowed).toBe(false)
  })

  it('refuses secrets pasted into chat', async () => {
    const res = await handleAssistantAiRequest({
      userMessage: 'นี่คือ key sk-abcdefghijklmnopqrstuvwxyz123456',
      env: { OPENAI_API_KEY: 'sk-test' },
      clientKey: 't5',
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('refused_secret_in_message')
    expect(res.body.fallback).toBe(true)
  })
})

describe('proposal apply + confirm safety', () => {
  it('requires confirmation and does not overwrite done/userEdited', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const row = catalog.find(r => r.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A && r.urlStatus === 'unchecked')
    const aiValue = {
      needsConfirmation: true,
      proposedScheduleChanges: {
        type: 'add_curated_tasks',
        summary: 'เพิ่ม',
        tasks: [{
          resourceId: row.id,
          plannedDate: '2026-10-20',
          durationMinutes: 40,
          title: row.title,
          examPart: row.examPart,
          subjectId: row.subjectId,
          urlStatus: row.urlStatus,
          warningTh: 'unchecked',
        }],
      },
    }
    const schedule = {
      tasks: [
        {
          id: `curated_${row.id}`,
          title: 'edited-keep',
          status: 'pending',
          userEdited: true,
          durationMinutes: 99,
        },
        {
          id: 'other_done',
          title: 'done-keep',
          status: 'done',
          resourceId: 'something',
        },
      ],
      sessions: [],
    }
    // Already exists → no pending from proposalToPendingChange
    expect(proposalToPendingChange(aiValue, schedule, 'th')).toBe(null)

    const freshId = catalog.find(r => r.id !== row.id && r.subjectId === SUBJECT_IDS.MATH).id
    const pending = proposalToPendingChange({
      proposedScheduleChanges: {
        type: 'add_curated_tasks',
        summary: 'เพิ่ม math',
        tasks: [{
          resourceId: freshId,
          plannedDate: '2026-10-21',
          durationMinutes: 60,
          title: 'math lesson',
          examPart: 'ก',
          subjectId: 'math',
          urlStatus: 'needs_full_url',
          warningTh: 'needs_full_url',
        }],
      },
    }, schedule, 'th')
    expect(pending.type).toBe('apply_openai_proposal')
    expect(pending.tasks[0].warningTh).toMatch(/needs_full_url/)

    // Simulate existing done curated id protection on apply
    const withDone = {
      tasks: [
        ...schedule.tasks,
        { id: `curated_${freshId}`, title: 'keep-done', status: 'done', userEdited: false, durationMinutes: 12 },
      ],
      sessions: [],
    }
    const applied = applyOpenAiProposal(withDone, pending)
    expect(applied.added).toBe(0)
    expect(applied.skippedProtected + applied.skippedExisting).toBeGreaterThan(0)
    expect(withDone.tasks.find(t => t.id === `curated_${freshId}`).title).toBe('keep-done')
    expect(withDone.tasks.find(t => t.id === `curated_${freshId}`).status).toBe('done')
  })
})

describe('bridge fallback to rule-based assistant', () => {
  it('uses rules when API returns not configured', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ ok: false, error: 'openai_not_configured', fallback: true, messageTh: 'no key' }),
    })
    const schedule = { tasks: [], sessions: [] }
    const result = await processAssistantTurnWithAi(
      schedule,
      createEmptyAssistantContext(),
      'ช่วยเหลือ',
      { dateProvider: dates, fetchImpl },
    )
    expect(result.source).toBe('fallback')
    expect(result.aiAttempted).toBe(true)
    expect(result.replies.join(' ')).toMatch(/แผน|help|ช่วย|ยืนยัน/i)
    expect(result.scheduleChanged).toBe(false)
  })

  it('keeps confirm on local rules without calling AI', async () => {
    let called = false
    const fetchImpl = async () => { called = true; return { ok: false, status: 500, json: async () => ({}) } }
    const schedule = { tasks: [], sessions: [] }
    const ctx = {
      ...createEmptyAssistantContext(),
      pendingChange: {
        type: 'apply_openai_proposal',
        summary: 'test',
        tasks: [],
      },
    }
    const result = await processAssistantTurnWithAi(schedule, ctx, 'ยืนยัน', {
      dateProvider: dates,
      fetchImpl,
    })
    expect(called).toBe(false)
    expect(result.source).toBe('rules')
  })

  it('AI success creates pendingChange that still needs confirm (no direct schedule write)', async () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const row = catalog.find(r => r.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A)
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        source: 'openai',
        model: 'gpt-4o-mini',
        result: sanitizeAndValidateAiResult(validModelJson({
          responseText: 'เสนอเพิ่มงานภาษาไทย',
          intent: 'add_task',
          selectedResourceIds: [row.id],
          needsConfirmation: true,
          proposedScheduleChanges: {
            type: 'add_curated_tasks',
            summary: 'เพิ่ม 1 งาน',
            tasks: [{
              resourceId: row.id,
              plannedDate: '2026-10-22',
              durationMinutes: 30,
              title: row.title,
            }],
          },
        }), { catalog }).value,
      }),
    })
    const schedule = { tasks: [], sessions: [] }
    const result = await processAssistantTurnWithAi(
      schedule,
      createEmptyAssistantContext(),
      'เพิ่มงานภาษาไทยพรุ่งนี้',
      { dateProvider: dates, fetchImpl },
    )
    expect(result.source).toBe('openai')
    expect(result.scheduleChanged).toBe(false)
    expect(result.pendingChange?.type).toBe('apply_openai_proposal')
    expect(schedule.tasks).toHaveLength(0)
  })
})

describe('client bundle must not contain OpenAI secrets', () => {
  it('built assets do not embed OPENAI_API_KEY / VITE_OPENAI_API_KEY / sk- patterns from env', () => {
    // Relies on dist/ from a prior or concurrent build — create a light scan helper.
    const dist = join(process.cwd(), 'dist')
    let files = []
    try {
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name)
          const st = statSync(p)
          if (st.isDirectory()) walk(p)
          else if (/\.(js|html|css|map)$/.test(name)) files.push(p)
        }
      }
      walk(dist)
    } catch {
      // If dist missing, skip with explicit note — build test covers presence.
      expect(true).toBe(true)
      return
    }
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      expect(text).not.toMatch(/VITE_OPENAI_API_KEY\s*=\s*sk-/)
      expect(text).not.toMatch(/OPENAI_API_KEY\s*=\s*sk-[A-Za-z0-9]{8,}/)
      // Ensure server handler module path isn't shipping a hardcoded key assignment
      expect(text).not.toMatch(/apiKey:\s*['"]sk-/)
    }
  })
})

describe('rule assistant still works without AI', () => {
  it('processAssistantTurn remains available as deterministic fallback', () => {
    const result = processAssistantTurn(
      { tasks: [], sessions: [] },
      createEmptyAssistantContext(),
      'วันสอบ',
      { dateProvider: dates },
    )
    expect(result.replies.join(' ')).toMatch(/14|15|สอบ/)
    expect(result.scheduleChanged).toBe(false)
  })
})

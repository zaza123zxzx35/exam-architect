/**
 * Validatable OpenAI assistant response schema (server + client-safe).
 * No secrets. No OpenAI SDK import.
 */

export const ASSISTANT_AI_SCHEMA_VERSION = '1.0'

/** Allowed intent labels the model may return. */
export const AI_INTENTS = Object.freeze([
  'help',
  'show_today',
  'show_exams',
  'summarize_progress',
  'find_resources',
  'show_weakness',
  'create_plan',
  'revise_plan',
  'add_task',
  'remove_task',
  'reschedule_task',
  'change_duration',
  'change_daily_limit',
  'change_priority',
  'clarify',
  'explain_scope',
  'unsupported',
])

/** Map common model paraphrases onto the allowlist instead of failing the turn. */
const AI_INTENT_ALIASES = Object.freeze({
  provide_info: 'explain_scope',
  explain: 'explain_scope',
  answer: 'explain_scope',
  info: 'explain_scope',
  question: 'clarify',
  ask: 'clarify',
  search: 'find_resources',
  find: 'find_resources',
  resources: 'find_resources',
  plan: 'create_plan',
  schedule: 'create_plan',
  weakness: 'show_weakness',
  today: 'show_today',
  exams: 'show_exams',
  progress: 'summarize_progress',
})

/**
 * @param {string} raw
 * @returns {string | null}
 */
export function normalizeAiIntent(raw) {
  const intent = String(raw || '').trim()
  if (!intent) return null
  if (AI_INTENTS.includes(intent)) return intent
  const aliased = AI_INTENT_ALIASES[intent] || AI_INTENT_ALIASES[intent.toLowerCase()]
  if (aliased && AI_INTENTS.includes(aliased)) return aliased
  // Unknown but non-empty → keep the reply usable
  return 'unsupported'
}

/**
 * JSON Schema-ish description embedded in the system prompt.
 * Kept as a plain object for Responses API json_schema if needed.
 */
export const ASSISTANT_RESPONSE_JSON_SCHEMA = Object.freeze({
  name: 'teacher_exam_assistant_response',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'responseText',
      'intent',
      'selectedResourceIds',
      'proposedScheduleChanges',
      'clarificationQuestion',
      'needsConfirmation',
      'evidenceNotes',
    ],
    properties: {
      responseText: { type: 'string' },
      intent: { type: 'string' },
      selectedResourceIds: {
        type: 'array',
        items: { type: 'string' },
      },
      // Always an object in strict mode; use type "none" when no schedule change.
      proposedScheduleChanges: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'summary', 'tasks'],
        properties: {
          type: {
            type: 'string',
            enum: ['add_curated_tasks', 'none'],
          },
          summary: { type: 'string' },
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['resourceId', 'plannedDate', 'durationMinutes', 'title'],
              properties: {
                resourceId: { type: 'string' },
                plannedDate: { type: 'string' },
                durationMinutes: { type: ['number', 'null'] },
                title: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      clarificationQuestion: { type: ['string', 'null'] },
      needsConfirmation: { type: 'boolean' },
      evidenceNotes: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
})

/**
 * @param {unknown} raw
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseAssistantAiResponse(raw) {
  let data = raw
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    // Strip accidental markdown fences
    const unfenced = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    try {
      data = JSON.parse(unfenced)
    } catch {
      return { ok: false, error: 'malformed_json' }
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'not_object' }
  }

  const responseText = typeof data.responseText === 'string' ? data.responseText.trim() : ''
  if (!responseText) return { ok: false, error: 'missing_responseText' }

  const intent = normalizeAiIntent(typeof data.intent === 'string' ? data.intent : '')
  if (!intent) {
    return { ok: false, error: 'invalid_intent' }
  }

  if (!Array.isArray(data.selectedResourceIds)) {
    return { ok: false, error: 'selectedResourceIds_not_array' }
  }
  const selectedResourceIds = data.selectedResourceIds
    .filter(id => typeof id === 'string' && id.trim())
    .map(id => String(id).trim())
    .slice(0, 40)

  if (!Array.isArray(data.evidenceNotes)) {
    return { ok: false, error: 'evidenceNotes_not_array' }
  }
  const evidenceNotes = data.evidenceNotes
    .filter(n => typeof n === 'string' && n.trim())
    .map(n => String(n).trim().slice(0, 500))
    .slice(0, 20)

  const needsConfirmation = Boolean(data.needsConfirmation)
  const clarificationQuestion = data.clarificationQuestion == null
    ? null
    : (typeof data.clarificationQuestion === 'string' ? data.clarificationQuestion.trim().slice(0, 500) || null : null)

  let proposedScheduleChanges = null
  if (data.proposedScheduleChanges != null) {
    const p = data.proposedScheduleChanges
    if (typeof p !== 'object' || Array.isArray(p)) {
      return { ok: false, error: 'proposedScheduleChanges_invalid' }
    }
    const type = String(p.type || '')
    if (type !== 'add_curated_tasks' && type !== 'none') {
      return { ok: false, error: 'proposedScheduleChanges_type_invalid' }
    }
    if (type === 'none') {
      proposedScheduleChanges = null
    } else {
      if (!Array.isArray(p.tasks)) return { ok: false, error: 'proposed_tasks_not_array' }
      const tasks = []
      for (const t of p.tasks.slice(0, 30)) {
        if (!t || typeof t !== 'object') continue
        const resourceId = typeof t.resourceId === 'string' ? t.resourceId.trim() : ''
        const plannedDate = typeof t.plannedDate === 'string' ? t.plannedDate.trim() : ''
        if (!resourceId || !/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
          return { ok: false, error: 'proposed_task_invalid' }
        }
        const durationMinutes = t.durationMinutes == null
          ? null
          : (Number.isFinite(Number(t.durationMinutes)) ? Number(t.durationMinutes) : null)
        if (durationMinutes != null && (durationMinutes <= 0 || durationMinutes > 480)) {
          return { ok: false, error: 'proposed_duration_invalid' }
        }
        tasks.push({
          resourceId,
          plannedDate,
          durationMinutes,
          title: typeof t.title === 'string' ? t.title.slice(0, 200) : null,
        })
      }
      proposedScheduleChanges = {
        type: 'add_curated_tasks',
        summary: typeof p.summary === 'string' ? p.summary.slice(0, 400) : 'เสนอเพิ่มงานจากคลัง',
        tasks,
      }
    }
  }

  // Confirmation required whenever schedule changes are proposed.
  const forceConfirm = Boolean(proposedScheduleChanges?.tasks?.length)

  return {
    ok: true,
    value: {
      schemaVersion: ASSISTANT_AI_SCHEMA_VERSION,
      responseText: responseText.slice(0, 6000),
      intent,
      selectedResourceIds,
      proposedScheduleChanges,
      clarificationQuestion,
      needsConfirmation: forceConfirm ? true : needsConfirmation,
      evidenceNotes,
    },
  }
}

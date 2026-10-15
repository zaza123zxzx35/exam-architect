import { classifyIntent, detectLanguage } from './intents.js'
import { createDateProvider } from './dateProvider.js'
import {
  appendMessage,
  createEmptyAssistantContext,
  sanitizeAssistantContext,
} from './context.js'
import {
  handleAddTask,
  handleCancel,
  handleChangeDurationOrLimit,
  handleChangePriority,
  handleConfirm,
  handleCreateOrRevisePlan,
  handleFindResources,
  handleShowWeakness,
  handleHelp,
  handleRemoveTask,
  handleReschedule,
  handleShowExams,
  handleShowToday,
  handleSummarizeProgress,
  handleUnsupported,
} from './handlers.js'

/**
 * Process one user turn against schedule + conversation context.
 * Mutating intents produce a pendingChange preview; confirm applies.
 *
 * @param {object} schedule
 * @param {object} context
 * @param {string} userText
 * @param {{ dateProvider?: object, quizResults?: Record<string, unknown>, quizzes?: unknown[] }} [options]
 */
export function processAssistantTurn(schedule, context, userText, options = {}) {
  const dates = options.dateProvider || createDateProvider()
  let ctx = sanitizeAssistantContext(context || createEmptyAssistantContext())
  const text = String(userText || '').trim()

  if (!text) {
    const lang = ctx.language || 'th'
    const msg = lang === 'en' ? 'Please type a message.' : 'พิมพ์ข้อความได้เลย'
    ctx = appendMessage(ctx, 'user', '')
    ctx = appendMessage(ctx, 'assistant', msg, { intent: 'unsupported' })
    return {
      context: ctx,
      replies: [msg],
      classification: { intent: 'unsupported', confidence: 0 },
      scheduleChanged: false,
      nextSchedule: schedule,
      readOnly: true,
    }
  }

  const langHint = detectLanguage(text)
  ctx = { ...ctx, language: langHint }
  ctx = appendMessage(ctx, 'user', text)

  const classification = classifyIntent(text, {
    pendingChange: ctx.pendingChange,
    lastIntent: ctx.lastIntent,
    lastRequest: ctx.lastRequest,
  })

  // Ambiguous non-confirm intents → ask instead of guessing dates/subjects
  if (
    classification.ambiguous
    && classification.intent !== 'confirm'
    && classification.intent !== 'cancel'
    && classification.intent !== 'create_plan'
    && classification.confidence < 0.95
  ) {
    const result = handleUnsupported(ctx.language, classification)
    return finalize(ctx, schedule, classification, result)
  }

  let result
  switch (classification.intent) {
    case 'help':
      result = handleHelp(ctx.language)
      break
    case 'show_today':
      result = handleShowToday(schedule, dates, ctx.language, {
        weaknessAnalysis: options.weaknessAnalysis,
        priorityMode: options.priorityMode,
      })
      break
    case 'show_exams':
      result = handleShowExams(ctx.language)
      break
    case 'summarize_progress':
      result = handleSummarizeProgress(schedule, ctx.language)
      break
    case 'find_resources':
      result = handleFindResources(text, ctx.language)
      break
    case 'show_weakness':
      result = handleShowWeakness(options.quizResults, options.quizzes, ctx.language)
      break
    case 'create_plan':
      result = handleCreateOrRevisePlan(text, schedule, ctx, dates, ctx.language, 'create')
      break
    case 'revise_plan':
      result = handleCreateOrRevisePlan(text, schedule, ctx, dates, ctx.language, 'revise')
      break
    case 'add_task':
      result = handleAddTask(text, schedule, ctx, dates, ctx.language)
      break
    case 'remove_task':
      result = handleRemoveTask(text, schedule, ctx.language)
      break
    case 'reschedule_task':
      result = handleReschedule(schedule, dates, ctx.language)
      break
    case 'change_duration':
      result = handleChangeDurationOrLimit(text, schedule, ctx, dates, ctx.language, 'session')
      break
    case 'change_daily_limit':
      result = handleChangeDurationOrLimit(text, schedule, ctx, dates, ctx.language, 'daily')
      break
    case 'change_priority':
      result = handleChangePriority(text, schedule, ctx, dates, ctx.language)
      break
    case 'confirm':
      result = handleConfirm(schedule, ctx, ctx.language)
      break
    case 'cancel':
      result = handleCancel(schedule, ctx, ctx.language)
      break
    default:
      result = handleUnsupported(ctx.language, classification)
  }

  return finalize(ctx, schedule, classification, result)
}

function finalize(ctx, schedule, classification, result) {
  let nextCtx = { ...ctx, lastIntent: classification.intent }
  if (result.lastRequest) nextCtx.lastRequest = result.lastRequest
  if (result.pendingChange) nextCtx.pendingChange = result.pendingChange
  if (result.clearPending) nextCtx.pendingChange = null

  const replies = result.messages || []
  for (const text of replies) {
    nextCtx = appendMessage(nextCtx, 'assistant', text, { intent: classification.intent })
  }

  const scheduleChanged = Boolean(result.applySchedule)
  return {
    context: nextCtx,
    replies,
    classification,
    scheduleChanged,
    nextSchedule: result.applySchedule || schedule,
    readOnly: result.readOnly !== false && !scheduleChanged && !result.pendingChange,
    pendingChange: nextCtx.pendingChange,
    clarifying: Boolean(result.clarifying),
  }
}

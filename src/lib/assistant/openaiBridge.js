/**
 * Browser-safe bridge: calls /api/assistant then falls back to rule-based dialogue.
 * Never reads OPENAI_API_KEY. Never imports the OpenAI SDK.
 */

import { appendMessage, sanitizeAssistantContext } from './context.js'
import { classifyIntent } from './intents.js'
import { processAssistantTurn } from './dialogue.js'
import { proposalToPendingChange } from './openai/applyProposal.js'

/**
 * @param {object} schedule
 * @param {object} context
 * @param {string} userText
 * @param {{
 *   dateProvider?: object,
 *   quizResults?: object,
 *   quizzes?: unknown[],
 *   weaknessAnalysis?: object,
 *   priorityMode?: string,
 *   fetchImpl?: typeof fetch,
 *   preferAi?: boolean,
 * }} [options]
 */
export async function processAssistantTurnWithAi(schedule, context, userText, options = {}) {
  const text = String(userText || '').trim()
  const ctx = sanitizeAssistantContext(context)
  const preferAi = options.preferAi !== false

  // Confirm / cancel stay local — no paid round-trip.
  const quick = classifyIntent(text, {
    pendingChange: ctx.pendingChange,
    lastIntent: ctx.lastIntent,
    lastRequest: ctx.lastRequest,
  })
  if (quick.intent === 'confirm' || quick.intent === 'cancel' || !text) {
    return {
      ...processAssistantTurn(schedule, ctx, text, options),
      source: 'rules',
      aiAttempted: false,
    }
  }

  if (!preferAi) {
    return {
      ...processAssistantTurn(schedule, ctx, text, options),
      source: 'rules',
      aiAttempted: false,
    }
  }

  const fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch : null)
  if (!fetchImpl) {
    return {
      ...processAssistantTurn(schedule, ctx, text, options),
      source: 'rules',
      aiAttempted: false,
      aiError: 'fetch_unavailable',
    }
  }

  let aiBody = null
  let aiError = null
  try {
    const existingTaskSummaries = (schedule?.tasks || []).slice(0, 40).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      userEdited: t.userEdited,
      resourceId: t.resourceId,
    }))
    const res = await fetchImpl('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: text,
        language: ctx.language,
        todayIso: options.dateProvider?.todayIso?.() || undefined,
        priorityMode: options.priorityMode || 'balanced',
        recentMessages: (ctx.messages || []).slice(-6).map(m => ({ role: m.role, text: m.text })),
        weaknessAnalysis: options.weaknessAnalysis
          ? { observedWeaknesses: (options.weaknessAnalysis.observedWeaknesses || []).slice(0, 8) }
          : undefined,
        existingTaskSummaries,
      }),
    })
    aiBody = await res.json().catch(() => null)
    if (!res.ok || !aiBody?.ok) {
      aiError = aiBody?.error || `http_${res.status}`
    }
  } catch (err) {
    aiError = err?.name === 'AbortError' ? 'timeout' : 'network_error'
  }

  if (!aiBody?.ok || !aiBody?.result) {
    const fallback = processAssistantTurn(schedule, ctx, text, options)
    const note = aiBody?.messageTh
      || (aiError === 'openai_not_configured'
        ? 'ยังไม่ได้ตั้งค่า OpenAI ฝั่งเซิร์ฟเวอร์ — ใช้ผู้ช่วยแบบกฎ'
        : 'ใช้ผู้ช่วยแบบกฎแทน (OpenAI ไม่พร้อม)')
    // Prepend a short notice once without mutating schedule
    let nextCtx = fallback.context
    if (fallback.replies?.length) {
      // Already has assistant reply; leave as-is but mark meta on last message if possible
      nextCtx = {
        ...nextCtx,
        lastAiMeta: { source: 'fallback', error: aiError || aiBody?.error || 'unknown' },
      }
    }
    return {
      ...fallback,
      context: nextCtx,
      source: 'fallback',
      aiAttempted: true,
      aiError: aiError || aiBody?.error || 'unknown',
      fallbackNote: note,
    }
  }

  const result = aiBody.result
  let nextCtx = sanitizeAssistantContext(ctx)
  nextCtx = appendMessage(nextCtx, 'user', text)
  nextCtx = {
    ...nextCtx,
    lastIntent: result.intent,
    language: ctx.language,
  }

  const replies = [result.responseText]
  if (result.clarificationQuestion) replies.push(result.clarificationQuestion)
  if (result.selectedResources?.length) {
    const lines = result.selectedResources.slice(0, 8).map(r =>
      `• ${r.title} (${r.subjectId} · ภาค ${r.examPart} · ${r.urlStatus})`
    )
    replies.push(`ทรัพยากรที่เลือก:\n${lines.join('\n')}`)
  }
  if (result.evidenceNotes?.length) {
    replies.push(`หลักฐาน/ข้อจำกัด:\n- ${result.evidenceNotes.slice(0, 6).join('\n- ')}`)
  }

  const pending = result.needsConfirmation
    ? proposalToPendingChange(result, schedule, nextCtx.language)
    : null
  if (pending) {
    nextCtx.pendingChange = pending
    replies.push(
      nextCtx.language === 'en'
        ? `${pending.summary}. Reply "confirm" or "cancel".`
        : `${pending.summary} พิมพ์ "ยืนยัน" หรือ "ยกเลิก"`,
    )
  }

  for (const msg of replies) {
    nextCtx = appendMessage(nextCtx, 'assistant', msg, { intent: result.intent, source: 'openai' })
  }
  nextCtx.lastAiMeta = { source: 'openai', model: aiBody.model || null }

  return {
    context: nextCtx,
    replies,
    classification: { intent: result.intent, confidence: 0.7, source: 'openai' },
    scheduleChanged: false,
    nextSchedule: schedule,
    readOnly: !pending,
    pendingChange: nextCtx.pendingChange,
    clarifying: Boolean(result.clarificationQuestion),
    source: 'openai',
    aiAttempted: true,
    aiResult: result,
  }
}

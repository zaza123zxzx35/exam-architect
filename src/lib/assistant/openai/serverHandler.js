/**
 * Server-side OpenAI assistant handler.
 * MUST NOT be imported from React client modules.
 */

import OpenAI from 'openai'
import { readOpenAiServerConfig, MAX_USER_MESSAGE_CHARS, looksLikeSecretLeak } from './config.js'
import { checkRateLimit } from './rateLimit.js'
import { ASSISTANT_RESPONSE_JSON_SCHEMA } from './schema.js'
import { buildModelContextPayload, buildSystemInstructions } from './contextPayload.js'
import { sanitizeAndValidateAiResult } from './sanitizeProposal.js'

/**
 * @param {{
 *   userMessage: string,
 *   language?: 'th'|'en',
 *   todayIso?: string,
 *   priorityMode?: string,
 *   recentMessages?: Array<{ role: string, text: string }>,
 *   weaknessAnalysis?: object,
 *   existingTaskSummaries?: object[],
 *   clientKey?: string,
 *   env?: Record<string, string | undefined>,
 *   openaiClient?: { responses: { create: Function } },
 *   now?: number,
 * }} body
 */
export async function handleAssistantAiRequest(body = {}) {
  const env = body.env || process.env
  const config = readOpenAiServerConfig(env)
  const userMessage = String(body.userMessage || '').trim().slice(0, MAX_USER_MESSAGE_CHARS)

  if (!userMessage) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'empty_message',
        messageTh: 'ข้อความว่าง',
        fallback: true,
      },
    }
  }

  if (looksLikeSecretLeak(userMessage)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'refused_secret_in_message',
        messageTh: 'ห้ามส่ง API key หรือ secret ผ่านแชต',
        fallback: true,
      },
    }
  }

  const rate = checkRateLimit(body.clientKey || 'anon', { now: body.now })
  if (!rate.allowed) {
    return {
      status: 429,
      body: {
        ok: false,
        error: 'rate_limited',
        messageTh: 'เรียกถี่เกินไป — ลองใหม่ในอีกสักครู่ หรือใช้โหมดกฎชั่วคราว',
        retryAfterMs: rate.retryAfterMs,
        fallback: true,
      },
    }
  }

  if (!config.configured) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'openai_not_configured',
        messageTh: 'ยังไม่ได้ตั้ง OPENAI_API_KEY ฝั่งเซิร์ฟเวอร์ — ใช้ผู้ช่วยแบบกฎแทน',
        fallback: true,
      },
    }
  }

  const { payload, json, catalog } = buildModelContextPayload({
    userMessage,
    language: body.language,
    todayIso: body.todayIso,
    priorityMode: body.priorityMode,
    recentMessages: body.recentMessages,
    weaknessAnalysis: body.weaknessAnalysis,
    existingTaskSummaries: body.existingTaskSummaries,
  })

  const client = body.openaiClient || new OpenAI({
    apiKey: config.apiKey,
    timeout: config.timeoutMs,
    maxRetries: 0,
  })

  let rawText = ''
  try {
    const response = await client.responses.create({
      model: config.model,
      instructions: buildSystemInstructions(),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: [
                `User message:\n${userMessage}`,
                '',
                'Context JSON (officialFacts vs appCatalogMetadata labeled):',
                json,
              ].join('\n'),
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: ASSISTANT_RESPONSE_JSON_SCHEMA.name,
          strict: true,
          schema: ASSISTANT_RESPONSE_JSON_SCHEMA.schema,
        },
      },
    })
    rawText = typeof response.output_text === 'string'
      ? response.output_text
      : extractOutputText(response)
  } catch (err) {
    const code = classifyOpenAiError(err)
    return {
      status: code === 'timeout' ? 504 : 502,
      body: {
        ok: false,
        error: code,
        messageTh: humanErrorTh(code),
        fallback: true,
      },
    }
  }

  if (!rawText || looksLikeSecretLeak(rawText)) {
    return {
      status: 502,
      body: {
        ok: false,
        error: 'empty_or_unsafe_model_output',
        messageTh: 'โมเดลตอบไม่ครบหรือไม่ปลอดภัย — ใช้ผู้ช่วยแบบกฎแทน',
        fallback: true,
      },
    }
  }

  const sanitized = sanitizeAndValidateAiResult(rawText, { catalog })
  if (!sanitized.ok) {
    return {
      status: 502,
      body: {
        ok: false,
        error: sanitized.error,
        code: sanitized.code,
        messageTh: 'รูปแบบคำตอบจากโมเดลไม่ถูกต้อง — ใช้ผู้ช่วยแบบกฎแทน',
        fallback: true,
      },
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      source: 'openai',
      model: config.model,
      result: sanitized.value,
      contextMeta: {
        catalogTotal: payload.meta.catalogTotal,
        officialCheckedAt: payload.officialFacts.checkedAt,
        priorityMode: payload.meta.priorityMode,
      },
    },
  }
}

function extractOutputText(response) {
  const parts = []
  for (const item of response?.output || []) {
    if (item?.type === 'message') {
      for (const c of item.content || []) {
        if (c?.type === 'output_text' && typeof c.text === 'string') parts.push(c.text)
      }
    }
  }
  return parts.join('\n').trim()
}

function classifyOpenAiError(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  const status = err?.status || err?.statusCode
  if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out')) return 'timeout'
  if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) return 'quota_or_rate_limit'
  if (status === 401 || status === 403) return 'auth_failed'
  return 'api_error'
}

function humanErrorTh(code) {
  switch (code) {
    case 'timeout':
      return 'การเรียก OpenAI หมดเวลา — ใช้ผู้ช่วยแบบกฎแทน'
    case 'quota_or_rate_limit':
      return 'โควต้าหรืออัตราเรียกเต็ม — ใช้ผู้ช่วยแบบกฎแทน'
    case 'auth_failed':
      return 'คีย์เซิร์ฟเวอร์ไม่ถูกต้องหรือไม่มีสิทธิ์ — ใช้ผู้ช่วยแบบกฎแทน'
    default:
      return 'เรียก OpenAI ไม่สำเร็จ — ใช้ผู้ช่วยแบบกฎแทน'
  }
}

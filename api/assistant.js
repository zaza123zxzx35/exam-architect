/**
 * Vercel Serverless Function: POST /api/assistant
 * Reads OPENAI_API_KEY / OPENAI_MODEL from server env only.
 */

import { handleAssistantAiRequest } from '../src/lib/assistant/openai/serverHandler.js'

function corsHeaders(origin) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // Same-origin app; keep CORS tight.
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

function clientKeyFromReq(req) {
  const xf = req.headers?.['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || req.headers?.['x-real-ip'] || 'anon'
}

export default async function handler(req, res) {
  const origin = typeof req.headers?.origin === 'string' ? req.headers.origin : ''
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, headers)
    res.end(JSON.stringify({ ok: false, error: 'method_not_allowed', fallback: true }))
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  if (!body || typeof body !== 'object') body = {}

  try {
    const result = await handleAssistantAiRequest({
      ...body,
      clientKey: clientKeyFromReq(req),
      env: process.env,
    })
    res.writeHead(result.status, headers)
    res.end(JSON.stringify(result.body))
  } catch {
    res.writeHead(500, headers)
    res.end(JSON.stringify({
      ok: false,
      error: 'internal_error',
      messageTh: 'เซิร์ฟเวอร์ผิดพลาด — ใช้ผู้ช่วยแบบกฎแทน',
      fallback: true,
    }))
  }
}

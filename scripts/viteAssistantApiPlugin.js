/**
 * Vite middleware that serves POST /api/assistant locally using the same
 * server handler as the Vercel function. Loads OPENAI_* from env files via
 * Vite loadEnv (server-side only — never exposed as import.meta.env.VITE_*).
 */

import { loadEnv } from 'vite'
import { handleAssistantAiRequest } from '../src/lib/assistant/openai/serverHandler.js'

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

export function viteAssistantApiPlugin() {
  return {
    name: 'vite-assistant-api',
    configureServer(server) {
      const mode = server.config.mode || 'development'
      const fileEnv = loadEnv(mode, server.config.envDir || process.cwd(), '')
      // Merge file env under process.env without overriding real process env.
      const serverEnv = { ...fileEnv, ...process.env }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (!url.startsWith('/api/assistant')) return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'method_not_allowed', fallback: true }))
          return
        }

        try {
          const body = await readJson(req)
          const result = await handleAssistantAiRequest({
            ...body,
            clientKey: req.socket?.remoteAddress || 'local',
            env: serverEnv,
          })
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify(result.body))
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ok: false,
            error: 'internal_error',
            messageTh: 'เซิร์ฟเวอร์ local ผิดพลาด — ใช้ผู้ช่วยแบบกฎแทน',
            fallback: true,
          }))
        }
      })
    },
  }
}

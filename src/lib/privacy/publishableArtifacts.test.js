/**
 * Privacy regression: publishable seeds/build must not reintroduce private query params.
 * Never embeds real personal identifier values.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { htmlPlannerLinkInventory } from '../../data/htmlPlannerData.js'
import { buildHtmlResourceAccounting } from '../planner/resourceAccounting.js'
import { sanitizeUrl } from '../storage/sanitize.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const PROHIBITED_QUERY_KEYS = ['u_id', 'uid', 'user_id', 'userid', 'access_token', 'api_key']

function collectJsFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(name => name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.map'))
    .map(name => join(dir, name))
}

function findProhibitedParamMentions(text) {
  const hits = []
  for (const key of PROHIBITED_QUERY_KEYS) {
    const re = new RegExp(`[?&]${key}=`, 'i')
    if (re.test(text)) hits.push(key)
  }
  return hits
}

describe('publishable artifact privacy (Phase 8)', () => {
  it('seed planner inventory has no prohibited personal query params', () => {
    expect(htmlPlannerLinkInventory.length).toBeGreaterThan(0)
    for (const row of htmlPlannerLinkInventory) {
      const hits = findProhibitedParamMentions(String(row.url || ''))
      expect(hits, `seed URL still carries private params: ${hits.join(',')}`).toEqual([])
    }
    const accounting = buildHtmlResourceAccounting()
    expect(accounting.summary.withUidFlag).toBe(0)
  })

  it('source data modules do not embed u_id query parameters', () => {
    const dataDir = join(root, 'src/data')
    const files = readdirSync(dataDir).filter(name => name.endsWith('.js') && !name.endsWith('.test.js'))
    for (const name of files) {
      const text = readFileSync(join(dataDir, name), 'utf8')
      expect(findProhibitedParamMentions(text), name).toEqual([])
    }
  })

  it('sanitizeUrl still strips prohibited keys when present (defense in depth)', () => {
    const raw = 'https://i-test.example.com/pro/quiz.php?id=3/21&u_id=SAMPLE_NOT_REAL&token=SAMPLE_TOKEN'
    const safe = sanitizeUrl(raw)
    expect(safe).toMatch(/[?&]id=/)
    expect(findProhibitedParamMentions(safe || '')).toEqual([])
    expect(safe).not.toContain('SAMPLE_NOT_REAL')
    expect(safe).not.toContain('SAMPLE_TOKEN')
  })

  it('production dist assets (when present) do not contain prohibited query params or source maps with them', () => {
    const distAssets = join(root, 'dist/assets')
    const files = collectJsFiles(distAssets)
    // Skip when dist has not been built in this environment — full gate rebuilds first.
    if (files.length === 0) {
      expect(files.length).toBe(0)
      return
    }
    const offending = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      const hits = findProhibitedParamMentions(text)
      if (hits.length) offending.push({ file: file.replace(root + '/', ''), keys: hits })
    }
    expect(offending, JSON.stringify(offending)).toEqual([])
    // Vite production default: no .map in assets when sourcemap unset
    const maps = files.filter(f => f.endsWith('.map'))
    expect(maps).toHaveLength(0)
  })
})

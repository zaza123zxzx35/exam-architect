import { describe, expect, it } from 'vitest'
import { htmlPlannerLinkInventory } from '../../data/htmlPlannerData.js'
import { buildHtmlResourceAccounting } from './resourceAccounting.js'
import { safeResourceUrl } from './safeLink.js'
import { sanitizeUrl } from '../storage/sanitize.js'

describe('safeResourceUrl (P0 render sanitization)', () => {
  it('strips u_id from href/display while preserving quiz id', () => {
    const raw = 'https://i-test.example.com/pro/quiz.php?id=3/21&u_id=REDACTED_SAMPLE'
    const safe = safeResourceUrl(raw)
    expect(safe).toBe(sanitizeUrl(raw))
    expect(safe).toMatch(/[?&]id=/)
    expect(safe).toContain('3')
    expect(safe).not.toMatch(/u_id/i)
    expect(safe).not.toContain('REDACTED_SAMPLE')
  })

  it('sanitizes every inventory URL that carries u_id without dropping rows', () => {
    const accounting = buildHtmlResourceAccounting()
    expect(accounting.summary.inventoryRows).toBe(htmlPlannerLinkInventory.length)
    expect(accounting.summary.withUidFlag).toBeGreaterThan(0)

    const uidRows = accounting.rows.filter(r => r.flags.includes('contains-u_id'))
    expect(uidRows.length).toBe(accounting.summary.withUidFlag)

    for (const row of uidRows) {
      // Accounting still sees raw seed (flag semantics unchanged)
      expect(row.url).toMatch(/u_id=/i)
      const safe = safeResourceUrl(row.url)
      expect(safe).toBeTruthy()
      expect(safe).not.toMatch(/u_id/i)
      // quiz id query preserved when present on source
      if (/[?&]id=/.test(row.url)) {
        expect(safe).toMatch(/[?&]id=/)
      }
    }
  })

  it('returns null for non-http schemes and does not echo the raw value', () => {
    expect(safeResourceUrl('javascript:alert(1)')).toBeNull()
    expect(safeResourceUrl('')).toBeNull()
    expect(safeResourceUrl(null)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  classifyResourceUrl,
  isIncompleteUrl,
  canOpenExternally,
  copyUrlPayload,
  markVerifiedAccessible,
  normalizeUrlStatus,
  isVerifiedAccessibleStatus,
  URL_STATUS,
} from './urlStatus.js'

describe('curated URL status', () => {
  it('marks Facebook pcb ellipsis stubs as needs_full_url and refuses open', () => {
    const stub = 'https://www.facebook.com/.../pcb.../1401771264932757'
    expect(isIncompleteUrl(stub)).toBe(true)
    const result = classifyResourceUrl(stub)
    expect(result.status).toBe(URL_STATUS.NEEDS_FULL_URL)
    expect(result.safeUrl).toBeNull()
    expect(canOpenExternally(result.status)).toBe(false)
    expect(copyUrlPayload({ url: stub, urlStatus: result.status, originalUrl: stub })).toBe(stub)
  })

  it('keeps structurally complete https URLs as unchecked (not claimed openable)', () => {
    const url = 'https://drive.google.com/file/d/1EQsgY1jDAJejp-sGbLQgqPgV9zGTmKMn/view?usp=sharing'
    const result = classifyResourceUrl(url)
    expect(result.status).toBe(URL_STATUS.UNCHECKED)
    expect(result.safeUrl).toMatch(/^https:\/\/drive\.google\.com\//)
    expect(canOpenExternally(result.status)).toBe(true)
  })

  it('rejects javascript: schemes', () => {
    expect(classifyResourceUrl('javascript:alert(1)').safeUrl).toBeNull()
  })

  it('supports verified_accessible with evidence and legacy openable alias', () => {
    expect(normalizeUrlStatus(URL_STATUS.OPENABLE)).toBe(URL_STATUS.VERIFIED_ACCESSIBLE)
    expect(isVerifiedAccessibleStatus(URL_STATUS.OPENABLE)).toBe(true)
    expect(canOpenExternally(URL_STATUS.VERIFIED_ACCESSIBLE)).toBe(true)
    expect(markVerifiedAccessible({ method: '', checkedAtIso: '' }).status).toBe(URL_STATUS.UNCHECKED)
    const ok = markVerifiedAccessible({
      method: 'manual-browser-session',
      checkedAtIso: '2026-10-14T00:00:00+07:00',
    })
    expect(ok.status).toBe(URL_STATUS.VERIFIED_ACCESSIBLE)
    expect(ok.evidence.method).toBe('manual-browser-session')
  })
})

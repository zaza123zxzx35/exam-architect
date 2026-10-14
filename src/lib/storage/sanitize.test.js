import { describe, expect, it } from 'vitest'
import { sanitizeUrl, urlHadSensitiveParams } from './sanitize.js'

describe('sanitizeUrl', () => {
  it('strips u_id without retaining the value', () => {
    const input = 'https://i-test.example.com/pro/quiz.php?id=2/5&u_id=0610395503'
    expect(urlHadSensitiveParams(input)).toBe(true)
    const cleaned = sanitizeUrl(input)
    expect(cleaned).toBe('https://i-test.example.com/pro/quiz.php?id=2%2F5')
    expect(cleaned).not.toMatch(/u_id/i)
    expect(cleaned).not.toContain('0610395503')
  })

  it('accepts non-YouTube https URLs', () => {
    expect(sanitizeUrl('https://www.facebook.com/share/v/14iDtAkcMHX/')).toContain('facebook.com')
  })

  it('rejects malformed URLs', () => {
    expect(sanitizeUrl('not-a-url')).toBeNull()
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeUrl('')).toBeNull()
  })
})

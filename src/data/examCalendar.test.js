import { describe, expect, it } from 'vitest'
import {
  EXAMS,
  getCountdown,
  getKeyDates,
  getPrimaryExam,
} from './examCalendar.js'

describe('examCalendar', () => {
  it('uses 14 Nov 2026 09:00 +07 as primary exam (ภาค ก)', () => {
    const primary = getPrimaryExam()
    expect(primary.part).toBe('ก')
    expect(primary.startsAt).toBe('2026-11-14T09:00:00+07:00')
  })

  it('lists ภาค ข on 15 Nov 2026 09:00 +07', () => {
    const partB = EXAMS.find(exam => exam.part === 'ข')
    expect(partB?.startsAt).toBe('2026-11-15T09:00:00+07:00')
  })

  it('computes countdown from a fixed now', () => {
    const before = new Date('2026-11-13T09:00:00+07:00').getTime()
    const result = getCountdown(before)
    expect(result.isPast).toBe(false)
    expect(result.days).toBe(1)
    expect(result.hours).toBe(0)
  })

  it('marks past when now is after exam', () => {
    const after = new Date('2026-11-14T10:00:00+07:00').getTime()
    const result = getCountdown(after)
    expect(result.isPast).toBe(true)
    expect(result.days).toBe(0)
  })

  it('exposes key dates from the same module (no divergent hardcodes)', () => {
    const dates = getKeyDates()
    expect(dates.map(item => item.title)).toEqual([
      'ช่วงรับสมัคร',
      'สอบภาค ก',
      'สอบภาค ข',
    ])
    expect(dates[1].date).toBe(getPrimaryExam().labelShort)
  })
})

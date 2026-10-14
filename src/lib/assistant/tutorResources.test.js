import { describe, expect, it } from 'vitest'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import {
  findTutorResources,
  formatTutorResourceMessages,
  interpretTutorResourceQuery,
} from './tutorResources.js'

describe('Smart Tutor resources (Phase 4)', () => {
  it('keeps english-skills-a and english-major distinct', () => {
    const skills = interpretTutorResourceQuery('หาลิงก์ ภาค ก ภาษาอังกฤษ')
    const major = interpretTutorResourceQuery('หาวิดีโอ วิชาเอกอังกฤษ')
    expect(skills).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    })
    expect(major).toMatchObject({
      examPart: 'ข',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    })

    const skillsHits = findTutorResources('หาลิงก์ ภาค ก ภาษาอังกฤษ').hits
    const majorHits = findTutorResources('หาวิดีโอ วิชาเอกอังกฤษ').hits
    expect(skillsHits.every(h => h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(majorHits.every(h => h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
  })

  it('treats bare อังกฤษ as ambiguous and lists both subjects separately', () => {
    const q = interpretTutorResourceQuery('หาลิงก์ อังกฤษ')
    expect(q.ambiguity).toBe('english-unspecified')
    const { hits } = findTutorResources('หาลิงก์ อังกฤษ')
    const subjects = new Set(hits.map(h => h.taxonomy.subjectId))
    expect(subjects.has(SUBJECT_IDS.ENGLISH_SKILLS_A) || subjects.has(SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    expect(hits.every(h => (
      h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A
      || h.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR
    ))).toBe(true)
    const messages = formatTutorResourceMessages({ interpreted: q, hits }, 'th')
    expect(messages.some(m => m.includes('อังกฤษ ภาค ก') || m.includes('วิชาเอก'))).toBe(true)
  })

  it('never invents URLs — empty catalog yields no fabricated links', () => {
    const { hits } = findTutorResources('หาลิงก์ วิชาเอก', { catalog: [] })
    expect(hits).toEqual([])
    const messages = formatTutorResourceMessages(
      { interpreted: interpretTutorResourceQuery('หาลิงก์ วิชาเอก'), hits: [] },
      'th',
    )
    expect(messages[0]).toContain('ไม่สร้าง URL ใหม่')
    expect(messages.join('\n')).not.toMatch(/https?:\/\/(?!)/)
  })
})

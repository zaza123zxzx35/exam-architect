import { describe, expect, it } from 'vitest'
import { dailyPlan } from '../../data/htmlPlannerData.js'
import { classifyTask } from './taxonomy.js'
import { SUBJECT_IDS } from './taxonomy.js'

/**
 * Hard ownership rules for สพฐ. 2569 packs:
 * - English ก + ข → ครูเลดี้เก๋เก๋ only (never อ.นนท์)
 * - วิชาการศึกษา / กฎหมายการศึกษา / ข้าราชการที่ดี → อ.นนท์ (civil may also use ขงเบ้ง clips)
 */
describe('tutor ownership — no subject mix-ups', () => {
  it('never attributes English ก/ข LIVE titles to อ.นนท์ in html dailyPlan', () => {
    const bad = []
    for (const day of dailyPlan) {
      for (const task of day || []) {
        const text = String(task.text || '')
        const isEnglish = /ภาษาอังกฤษ|วิชาเอกอังกฤษ|แหกโค้ง.*ภาษาอังกฤษ|หมาหอน.*ภาษาอังกฤษ/.test(text)
        if (isEnglish && /อ\.นนท์/.test(text)) {
          bad.push(text)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('classifies English ก titles as english-skills-a (Lady track)', () => {
    const samples = [
      '🔴 LIVE ครูเลดี้เก๋เก๋: ภาษาอังกฤษภาค ก',
      '🔴 LIVE ครูเลดี้เก๋เก๋: ภาษาอังกฤษภาค ก (Ep9.1 แหกโค้ง เก็งปี69)',
      '🧪 i-test: Grammar and Structure',
    ]
    for (const text of samples) {
      const c = classifyTask({ text, title: text })
      expect(c.subjectId).toBe(SUBJECT_IDS.ENGLISH_SKILLS_A)
      expect(c.examPart).toBe('ก')
    }
  })

  it('classifies English major titles as english-major', () => {
    const c = classifyTask({ text: '🩷 Ep8.3 วิชาเอกอังกฤษ เก็งปี69 — Part 3' })
    expect(c.subjectId).toBe(SUBJECT_IDS.ENGLISH_MAJOR)
    expect(c.examPart).toBe('ข')
  })

  it('keeps อ.นนท์ education/law titles on education/law subjects', () => {
    const edu = classifyTask({ text: '🔴 LIVE อ.นนท์: วิชาการศึกษา (จิตวิทยาการศึกษา)' })
    expect(edu.subjectId).toBe(SUBJECT_IDS.EDUCATION)
    const law = classifyTask({ text: '🔴 LIVE อ.นนท์: กฎหมายการศึกษา (พ.ร.บ.การศึกษาแห่งชาติ)' })
    expect(law.subjectId).toBe(SUBJECT_IDS.LAW)
  })

  it('does not label Thai/Math review as อ.นนท์ LIVE in dailyPlan', () => {
    const bad = []
    for (const day of dailyPlan) {
      for (const task of day || []) {
        const text = String(task.text || '')
        if (/LIVE อ\.นนท์/.test(text) && /ภาษาไทย|คณิตศาสตร์|ตัวเลขและเหตุผล/.test(text)) {
          bad.push(text)
        }
      }
    }
    expect(bad).toEqual([])
  })
})

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { initialQuizzes } from '../../data/quizData.js'
import { initialNotes } from '../../data/notesData.js'
import { initialVideos } from '../../data/videoData.js'
import { initialStudyPlan } from '../../data/planData.js'
import { dailyPlan, htmlPlannerLinkInventory } from '../../data/htmlPlannerData.js'
import {
  TAXONOMY_VERSION,
  SUBJECT_IDS,
  classifyQuiz,
  classifyNote,
  classifyVideo,
  classifyPlanItem,
  classifyTask,
  subjectIdToExamPart,
} from './taxonomy.js'

const taxonomySource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'taxonomy.js'),
  'utf8',
)

describe('study taxonomy (Phase 2B)', () => {
  it('exposes a stable taxonomyVersion', () => {
    expect(TAXONOMY_VERSION).toBe('2b.3')
    const sample = classifyQuiz(initialQuizzes[0])
    expect(sample.taxonomyVersion).toBe(TAXONOMY_VERSION)
  })

  it('maps ภาค ก English quiz to english-skills-a and ภาค ข major to english-major', () => {
    const skills = classifyQuiz(initialQuizzes.find(q => q.id === 'q-g2'))
    const major = classifyQuiz(initialQuizzes.find(q => q.id === 'q-m1'))
    expect(skills).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      confidence: 'explicit',
      sourceId: 'q-g2',
    })
    expect(major).toMatchObject({
      examPart: 'ข',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      confidence: 'explicit',
      sourceId: 'q-m1',
    })
    expect(skills.subjectId).not.toBe(major.subjectId)
  })

  it('never collapses the two English subject IDs across seed quizzes', () => {
    const byId = Object.fromEntries(initialQuizzes.map(q => [q.id, classifyQuiz(q)]))
    expect(byId['q-g2'].subjectId).toBe(SUBJECT_IDS.ENGLISH_SKILLS_A)
    expect(byId['q-m1'].subjectId).toBe(SUBJECT_IDS.ENGLISH_MAJOR)
    expect(byId['q-m2'].subjectId).toBe(SUBJECT_IDS.ENGLISH_MAJOR)
    expect(byId['q-g2'].examPart).toBe('ก')
    expect(byId['q-m1'].examPart).toBe('ข')
  })

  it('maps education quizzes to education when category evidence supports it', () => {
    const e1 = classifyQuiz(initialQuizzes.find(q => q.id === 'q-e1'))
    const e2 = classifyQuiz(initialQuizzes.find(q => q.id === 'q-e2'))
    expect(e1).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.EDUCATION, confidence: 'explicit' })
    expect(e2).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.EDUCATION, confidence: 'explicit' })
  })

  it('documents q-g3 as ภาค ก general-knowledge despite / สัมภาษณ์ fragment', () => {
    const g3 = initialQuizzes.find(q => q.id === 'q-g3')
    expect(g3.category).toContain('ความรู้ทั่วไป')
    expect(g3.category).toContain('สัมภาษณ์')
    const c = classifyQuiz(g3)
    expect(c).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
      confidence: 'explicit',
      sourceId: 'q-g3',
    })
  })

  it('classifies all seed quizzes without inventing unmapped categories', () => {
    for (const quiz of initialQuizzes) {
      const c = classifyQuiz(quiz)
      expect(EXAM_PART_OK(c.examPart)).toBe(true)
      expect(c.taxonomyVersion).toBe(TAXONOMY_VERSION)
      expect(c.sourceId).toBe(quiz.id)
    }
  })

  it('uses note category+subject carefully; custom categories are unknown', () => {
    const n2 = classifyNote(initialNotes.find(n => n.id === 'n2'))
    expect(n2).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      confidence: 'explicit',
    })
    const n3 = classifyNote(initialNotes.find(n => n.id === 'n3'))
    expect(n3).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.EDUCATION })
    const n4 = classifyNote(initialNotes.find(n => n.id === 'n4'))
    expect(n4).toMatchObject({ examPart: 'ค', subjectId: SUBJECT_IDS.INTERVIEW_C })

    const custom = classifyNote({ id: 'custom', category: 'หมวดของฉัน', subject: 'อะไรก็ได้' })
    expect(custom).toMatchObject({ examPart: 'unknown', subjectId: SUBJECT_IDS.UNKNOWN, confidence: 'unknown' })

    // Bare ภาษาอังกฤษ under ภาค ข without วิชาเอก → unknown subject (part still ข from category)
    const ambiguous = classifyNote({ id: 'n-x', category: 'ภาค ข', subject: 'ภาษาอังกฤษทั่วไป' })
    expect(ambiguous).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.UNKNOWN })
  })

  it('keeps category-derived ภาค ก ภาษาอังกฤษ videos explicit and distinct from major', () => {
    const skillsCat = initialVideos.find(v => v.category.includes('ภาค ก ภาษาอังกฤษ'))
    const majorCat = initialVideos.find(v => v.category.includes('ภาคข วิชาเอก'))
    expect(skillsCat).toBeTruthy()
    expect(majorCat).toBeTruthy()
    const skills = classifyVideo(skillsCat)
    const major = classifyVideo(majorCat)
    expect(skills).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      confidence: 'explicit',
    })
    expect(major).toMatchObject({
      examPart: 'ข',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      confidence: 'explicit',
    })
    expect(skills.subjectId).not.toBe(major.subjectId)
  })

  it('marks title-derived หมาหอน mappings as heuristic and mixed/unknown when underspecified', () => {
    const vipBoth = classifyVideo(initialVideos.find(v => v.id === 'lady-vip-group'))
    expect(vipBoth.examPart).toBe('mixed')
    expect(vipBoth.confidence).toBe('mixed')

    const friMixed = classifyVideo(initialVideos.find(v => v.id === 'lady-hm-fri1'))
    expect(friMixed.examPart).toBe('mixed')

    const tueSkills = classifyVideo(initialVideos.find(v => v.id === 'lady-hm-tue1'))
    expect(tueSkills).toMatchObject({
      examPart: 'ก',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      confidence: 'heuristic',
    })
    expect(tueSkills.evidence.some(e => e.includes('video.title'))).toBe(true)

    const friUnspecified = classifyVideo(initialVideos.find(v => v.id === 'lady-hm-fri2'))
    expect(friUnspecified.examPart).toBe('unknown')
    expect(friUnspecified.subjectId).toBe(SUBJECT_IDS.UNKNOWN)
  })

  it('maps bare law without part markers; math titles map to ภาค ก per official scope', () => {
    const law = classifyTask({ id: 't-law', title: 'ทบทวนกฎหมายครู' })
    const math = classifyTask({ id: 't-math', title: 'ฝึกคณิตศาสตร์เพิ่มเติม' })
    // Bare "กฎหมาย" without พ.ร.บ./การศึกษา → subject only, part unknown
    expect(law).toMatchObject({ subjectId: SUBJECT_IDS.LAW, examPart: 'unknown' })
    // Math is officially under ภาค ก (ว14/2566)
    expect(math).toMatchObject({ subjectId: SUBJECT_IDS.MATH, examPart: 'ก' })
    expect(subjectIdToExamPart(SUBJECT_IDS.LAW)).toBe('ข')
    expect(subjectIdToExamPart(SUBJECT_IDS.MATH)).toBe('ก')
    expect(subjectIdToExamPart(SUBJECT_IDS.EDUCATION)).toBe('ข')
  })

  it('does not derive content examPart from schedule examId alone', () => {
    const partBDay = classifyTask({
      id: 'html_late_0',
      title: '🏆 วันสอบภาค ข! สู้ๆ ครูเก้า!',
      examId: 'exam-part-a-2569',
    })
    expect(partBDay.examPart).not.toBe('ก')
    expect(partBDay.examPart).toBe('unknown')
    expect(partBDay.subjectId).toBe(SUBJECT_IDS.UNKNOWN)
    expect(partBDay.scheduleExamId).toBe('exam-part-a-2569')

    const breakfast = classifyTask({
      id: 'html_late_1',
      title: '☀️ กินข้าวเช้าให้อิ่ม',
      examId: 'exam-part-a-2569',
    })
    expect(breakfast.examPart).toBe('unknown')
    expect(breakfast.subjectId).toBe(SUBJECT_IDS.UNKNOWN)
    expect(breakfast.scheduleExamId).toBe('exam-part-a-2569')
  })

  it('prefers explicit task.subjectId and title content evidence over examId', () => {
    const explicit = classifyTask({
      id: 'html_x_0',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      title: 'อะไรก็ได้',
      examId: 'exam-part-a-2569',
    })
    expect(explicit).toMatchObject({
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      examPart: 'ข',
      confidence: 'explicit',
      scheduleExamId: 'exam-part-a-2569',
    })

    const examOnly = classifyTask({ id: 't1', examId: 'exam-part-b-2569' })
    expect(examOnly).toMatchObject({
      examPart: 'unknown',
      subjectId: SUBJECT_IDS.UNKNOWN,
      scheduleExamId: 'exam-part-b-2569',
    })

    const majorTitle = classifyTask({ id: 't2', text: '🩷 Ep8.1 วิชาเอกอังกฤษ เก็งปี69' })
    expect(majorTitle).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.ENGLISH_MAJOR, confidence: 'heuristic' })

    const skillsTitle = classifyTask({ id: 't3', text: 'ภาษาอังกฤษภาค ก (Ep9.1)' })
    expect(skillsTitle).toMatchObject({ examPart: 'ก', subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A, confidence: 'heuristic' })

    const bareEnglish = classifyTask({ id: 't4', title: 'ทบทวนอังกฤษเพิ่ม' })
    expect(bareEnglish.examPart).toBe('unknown')
    expect(bareEnglish.subjectId).toBe(SUBJECT_IDS.UNKNOWN)
  })

  it('does not classify bare Ep8. as english-major without วิชาเอก', () => {
    const bareEp8 = classifyTask({ id: 't-ep8', title: 'ทบทวน Ep8. summary notes' })
    expect(bareEp8.subjectId).not.toBe(SUBJECT_IDS.ENGLISH_MAJOR)
    expect(bareEp8.examPart).toBe('unknown')

    const ep8WithMajor = classifyTask({ id: 't-ep8m', title: 'Ep8.3 วิชาเอกอังกฤษ Part 3' })
    expect(ep8WithMajor).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.ENGLISH_MAJOR })
  })

  it('classifies seed plan items with mixed P1 and admin registration', () => {
    const p1 = classifyPlanItem(initialStudyPlan.find(p => p.id === 'p1'))
    expect(p1.examPart).toBe('mixed')
    const admin = classifyPlanItem(initialStudyPlan.find(p => p.id === 'p5'))
    expect(admin).toMatchObject({ examPart: 'admin', subjectId: SUBJECT_IDS.ADMIN })
    const edu = classifyPlanItem(initialStudyPlan.find(p => p.id === 'p3'))
    expect(edu).toMatchObject({ examPart: 'ข', subjectId: SUBJECT_IDS.EDUCATION })
  })

  it('does not mutate input objects', () => {
    const quiz = { ...initialQuizzes[0], category: initialQuizzes[0].category }
    const snapshot = JSON.stringify(quiz)
    classifyQuiz(quiz)
    expect(JSON.stringify(quiz)).toBe(snapshot)

    const note = { ...initialNotes[0] }
    const noteSnap = JSON.stringify(note)
    classifyNote(note)
    expect(JSON.stringify(note)).toBe(noteSnap)

    const video = { ...initialVideos[0] }
    const videoSnap = JSON.stringify(video)
    classifyVideo(video)
    expect(JSON.stringify(video)).toBe(videoSnap)
  })

  it('handles malformed input without throwing and is deterministic', () => {
    expect(() => classifyQuiz(null)).not.toThrow()
    expect(() => classifyNote(undefined)).not.toThrow()
    expect(() => classifyVideo(42)).not.toThrow()
    expect(() => classifyTask('x')).not.toThrow()
    expect(classifyQuiz(null).examPart).toBe('unknown')

    const a = classifyQuiz(initialQuizzes[1])
    const b = classifyQuiz(initialQuizzes[1])
    expect(a).toEqual(b)
    expect(a.evidence).toEqual(b.evidence)
  })

  it('preserves raw source ids and does not alter seed inventory/task counts', () => {
    for (const q of initialQuizzes) {
      expect(classifyQuiz(q).sourceId).toBe(q.id)
    }
    expect(htmlPlannerLinkInventory).toHaveLength(89)
    expect(dailyPlan.reduce((n, d) => n + d.length, 0)).toBe(139)
  })

  it('taxonomy module source has no storage imports or persistence APIs', () => {
    expect(taxonomySource).not.toMatch(/localStorage/)
    expect(taxonomySource).not.toMatch(/sessionStorage/)
    expect(taxonomySource).not.toMatch(/from ['"].*storage/)
    expect(taxonomySource).not.toMatch(/useLocalStorage|useScheduleStore|getScheduleSnapshot|saveSchedule/)
    expect(taxonomySource).not.toMatch(/\.clear\s*\(/)
    expect(taxonomySource).not.toMatch(/setItem\s*\(|getItem\s*\(/)
  })
})

function EXAM_PART_OK(part) {
  return ['ก', 'ข', 'ค', 'admin', 'mixed', 'unknown'].includes(part)
}

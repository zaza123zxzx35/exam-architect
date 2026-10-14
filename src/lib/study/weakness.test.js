import { describe, expect, it } from 'vitest'
import { initialQuizzes } from '../../data/quizData.js'
import { initialNotes } from '../../data/notesData.js'
import { initialVideos } from '../../data/videoData.js'
import { initialStudyPlan } from '../../data/planData.js'
import { importantLinks } from '../../data/htmlPlannerData.js'
import { buildStudyHubCatalog } from './hub.js'
import { SUBJECT_IDS } from './taxonomy.js'
import {
  WEAKNESS_ENGINE_VERSION,
  analyzeQuizPerformance,
  parseQuizResultKey,
  recommendPracticeFromWeakness,
  weaknessConfidence,
} from './weakness.js'

const catalog = buildStudyHubCatalog({
  quizzes: initialQuizzes,
  notes: initialNotes,
  videos: initialVideos,
  planItems: initialStudyPlan,
  links: importantLinks.map((link, i) => ({ id: `i${i}`, title: link.name, url: link.url })),
})

describe('Smart Tutor weakness analysis (Phase 4/8)', () => {
  it('parses quiz_results keys without mutating them', () => {
    expect(parseQuizResultKey('q-g2__1700000000000')).toEqual({ quizId: 'q-g2', atMs: 1700000000000 })
  })

  it('reports insufficient data when there are no attempts', () => {
    const analysis = analyzeQuizPerformance({}, initialQuizzes)
    expect(analysis.engineVersion).toBe(WEAKNESS_ENGINE_VERSION)
    expect(analysis.insufficientData).toBe(true)
    expect(analysis.summaryLabel).toBe('no-attempts')
    expect(analysis.observedWeaknesses).toHaveLength(0)
  })

  it('labels a single low english-skills-a attempt as preliminary, not definitive', () => {
    const results = {
      'q-g2__1': {
        score: 1,
        total: 5,
        pct: 20,
        title: 'ชุดฝึกหัด 2',
        category: 'ภาค ก - ทักษะภาษาอังกฤษ',
        at: '2026-10-01T00:00:00.000Z',
      },
      'q-m1__2': {
        score: 5,
        total: 5,
        pct: 100,
        title: 'ชุดฝึกหัด 6',
        category: 'ภาค ข - วิชาเอกภาษาอังกฤษ (Grammar)',
        at: '2026-10-02T00:00:00.000Z',
      },
    }
    const analysis = analyzeQuizPerformance(results, initialQuizzes)
    expect(analysis.attemptCount).toBe(2)
    const weak = analysis.observedWeaknesses.find(w => w.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
    expect(weak).toBeTruthy()
    expect(weak.avgPct).toBe(20)
    expect(weak.attempts).toBe(1)
    expect(weak.confidence).toBe('preliminary')
    expect(weaknessConfidence(1)).toBe('preliminary')
    expect(analysis.observedWeaknesses.some(w => w.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)

    const { reasons, recommendations, mode } = recommendPracticeFromWeakness(analysis, catalog, { limit: 8 })
    expect(mode).toBe('target-weakness')
    expect(reasons.some(r => r.kind === 'preliminary-weakness' && /เบื้องต้น|Preliminary/i.test(r.messageTh + r.messageEn))).toBe(true)
    expect(reasons.some(r => r.kind === 'observed-weakness')).toBe(false)
    expect(recommendations.every(r => r.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(recommendations.some(r => r.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)
  })

  it('keeps english-skills-a recommendations distinct from english-major', () => {
    const results = {
      'q-g2__1': { score: 1, total: 5, pct: 20, category: 'ภาค ก - ทักษะภาษาอังกฤษ' },
    }
    const analysis = analyzeQuizPerformance(results, initialQuizzes)
    const { recommendations, mode } = recommendPracticeFromWeakness(analysis, catalog, { limit: 8 })
    expect(mode).toBe('target-weakness')
    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations.every(r => r.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(recommendations.some(r => r.taxonomy.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)).toBe(false)
  })

  it('does not mutate results or quizzes inputs', () => {
    const results = {
      'q-g1__9': { score: 2, total: 5, pct: 40, category: 'ภาค ก - ความสามารถในการคิดวิเคราะห์' },
    }
    const snap = JSON.stringify(results)
    const quizSnap = JSON.stringify(initialQuizzes[0])
    analyzeQuizPerformance(results, initialQuizzes)
    expect(JSON.stringify(results)).toBe(snap)
    expect(JSON.stringify(initialQuizzes[0])).toBe(quizSnap)
  })

  it('handles malformed results without throwing', () => {
    expect(() => analyzeQuizPerformance(null, initialQuizzes)).not.toThrow()
    expect(() => analyzeQuizPerformance({ bad: { score: 'x' } }, initialQuizzes)).not.toThrow()
    expect(analyzeQuizPerformance({ bad: { score: 'x' } }, initialQuizzes).attemptCount).toBe(0)
  })

  it('aggregates repeated low scores as evidence-based (non-preliminary) weakness', () => {
    const results = {
      'q-g2__1': { score: 1, total: 5, pct: 20, category: 'ภาค ก - ทักษะภาษาอังกฤษ' },
      'q-g2__2': { score: 2, total: 5, pct: 40, category: 'ภาค ก - ทักษะภาษาอังกฤษ' },
    }
    const analysis = analyzeQuizPerformance(results, initialQuizzes)
    expect(analysis.attemptCount).toBe(2)
    const weak = analysis.observedWeaknesses.find(w => w.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
    expect(weak).toBeTruthy()
    expect(weak.attempts).toBe(2)
    expect(weak.avgPct).toBe(30)
    expect(weak.confidence).toBe('observed')
    const { reasons, mode } = recommendPracticeFromWeakness(analysis, catalog)
    expect(mode).toBe('target-weakness')
    expect(reasons.some(r => r.kind === 'observed-weakness' && r.avgPct === 30 && r.attempts === 2)).toBe(true)
    expect(reasons.some(r => /เบื้องต้น|Preliminary/i.test(r.messageTh + r.messageEn))).toBe(false)
  })

  it('recommendPracticeFromWeakness stays in insufficient-data mode with empty history', () => {
    const analysis = analyzeQuizPerformance({}, initialQuizzes)
    const { mode, reasons, recommendations } = recommendPracticeFromWeakness(analysis, catalog, { limit: 3 })
    expect(mode).toBe('insufficient-data')
    expect(reasons[0].kind).toBe('insufficient-data')
    expect(recommendations.every(r => r.kind === 'quiz')).toBe(true)
  })
})

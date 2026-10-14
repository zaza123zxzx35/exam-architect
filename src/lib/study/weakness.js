/**
 * Rule-based Smart Tutor weakness analysis (Phase 4).
 * Pure: caller supplies quiz_results + quiz bank. Never reads/writes storage.
 * Distinguishes observed weakness vs insufficient data. No LLM. No invented scores.
 */

import { classifyQuiz, SUBJECT_IDS } from './taxonomy.js'
import { filterStudyHubItems } from './hub.js'

export const WEAKNESS_ENGINE_VERSION = '4.1'

/** Minimum attempts before a category average is treated as observed weakness. */
export const MIN_ATTEMPTS_FOR_WEAKNESS = 1

/** pct below this → observed weakness (when attempt threshold met). */
export const WEAKNESS_PCT_THRESHOLD = 70

/**
 * @typedef {object} QuizAttempt
 * @property {number} score
 * @property {number} total
 * @property {number} [pct]
 * @property {string} [title]
 * @property {string} [category]
 * @property {string} [date]
 * @property {string} [at]
 */

/**
 * Parse `quizId__timestamp` keys used by Quiz.jsx.
 * @param {string} key
 * @returns {{ quizId: string, atMs: number | null }}
 */
export function parseQuizResultKey(key) {
  const raw = String(key || '')
  const idx = raw.lastIndexOf('__')
  if (idx <= 0) return { quizId: raw, atMs: null }
  const quizId = raw.slice(0, idx)
  const ts = Number(raw.slice(idx + 2))
  return { quizId, atMs: Number.isFinite(ts) ? ts : null }
}

/**
 * @param {Record<string, QuizAttempt> | null | undefined} results
 * @param {unknown[]} quizzes
 * @returns {{
 *   engineVersion: string,
 *   attemptCount: number,
 *   byQuiz: Array<object>,
 *   bySubject: Array<object>,
 *   observedWeaknesses: Array<object>,
 *   insufficientData: boolean,
 *   summaryLabel: 'no-attempts' | 'insufficient-data' | 'has-observations',
 * }}
 */
export function analyzeQuizPerformance(results, quizzes = []) {
  const quizList = Array.isArray(quizzes) ? quizzes : []
  const quizById = new Map(
    quizList.filter(q => q && typeof q === 'object' && q.id != null).map(q => [String(q.id), q]),
  )

  const entries = results && typeof results === 'object' ? Object.entries(results) : []
  /** @type {Map<string, { quizId: string, title: string, category: string, taxonomy: import('./taxonomy.js').TaxonomyClassification, attempts: number, sumPct: number, lastPct: number, lastAt: string | null }>} */
  const byQuiz = new Map()

  for (const [key, attempt] of entries) {
    if (!attempt || typeof attempt !== 'object') continue
    const total = Number(attempt.total)
    const score = Number(attempt.score)
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(score)) continue

    const pct = Number.isFinite(Number(attempt.pct))
      ? Number(attempt.pct)
      : Math.round((score / total) * 100)

    const { quizId } = parseQuizResultKey(key)
    const quiz = quizById.get(quizId)
    const category = String(attempt.category || quiz?.category || '')
    const title = String(attempt.title || quiz?.title || quizId)
    const taxonomy = classifyQuiz(quiz || { id: quizId, category })

    const prev = byQuiz.get(quizId) || {
      quizId,
      title,
      category,
      taxonomy,
      attempts: 0,
      sumPct: 0,
      lastPct: pct,
      lastAt: null,
    }
    prev.attempts += 1
    prev.sumPct += pct
    prev.lastPct = pct
    prev.lastAt = String(attempt.at || attempt.date || '') || prev.lastAt
    prev.title = title
    prev.category = category || prev.category
    if (quiz) prev.taxonomy = taxonomy
    byQuiz.set(quizId, prev)
  }

  const byQuizList = [...byQuiz.values()].map(row => ({
    quizId: row.quizId,
    title: row.title,
    category: row.category,
    examPart: row.taxonomy.examPart,
    subjectId: row.taxonomy.subjectId,
    attempts: row.attempts,
    avgPct: Math.round(row.sumPct / row.attempts),
    lastPct: row.lastPct,
    lastAt: row.lastAt,
    status:
      row.attempts < MIN_ATTEMPTS_FOR_WEAKNESS
        ? 'insufficient-data'
        : row.sumPct / row.attempts < WEAKNESS_PCT_THRESHOLD
          ? 'observed-weakness'
          : 'ok',
  }))

  /** @type {Map<string, { subjectId: string, examPart: string, attempts: number, sumPct: number, quizIds: Set<string> }>} */
  const bySubject = new Map()
  for (const row of byQuizList) {
    const sid = row.subjectId || SUBJECT_IDS.UNKNOWN
    const prev = bySubject.get(sid) || {
      subjectId: sid,
      examPart: row.examPart,
      attempts: 0,
      sumPct: 0,
      quizIds: new Set(),
    }
    prev.attempts += row.attempts
    prev.sumPct += row.avgPct * row.attempts
    prev.quizIds.add(row.quizId)
    bySubject.set(sid, prev)
  }

  const bySubjectList = [...bySubject.values()].map(row => {
    const avgPct = Math.round(row.sumPct / row.attempts)
    return {
      subjectId: row.subjectId,
      examPart: row.examPart,
      attempts: row.attempts,
      avgPct,
      quizIds: [...row.quizIds],
      status:
        row.attempts < MIN_ATTEMPTS_FOR_WEAKNESS
          ? 'insufficient-data'
          : avgPct < WEAKNESS_PCT_THRESHOLD
            ? 'observed-weakness'
            : 'ok',
    }
  })

  const observedWeaknesses = bySubjectList
    .filter(r => r.status === 'observed-weakness')
    .sort((a, b) => a.avgPct - b.avgPct)

  const attemptCount = byQuizList.reduce((n, r) => n + r.attempts, 0)
  const insufficientData = attemptCount === 0
  const summaryLabel = insufficientData
    ? 'no-attempts'
    : observedWeaknesses.length === 0 && bySubjectList.every(r => r.status !== 'ok')
      ? 'insufficient-data'
      : 'has-observations'

  return {
    engineVersion: WEAKNESS_ENGINE_VERSION,
    attemptCount,
    byQuiz: byQuizList.sort((a, b) => a.avgPct - b.avgPct),
    bySubject: bySubjectList.sort((a, b) => a.avgPct - b.avgPct),
    observedWeaknesses,
    insufficientData,
    summaryLabel,
  }
}

/**
 * Recommend hub practice items for observed weaknesses (or general practice if none).
 * @param {ReturnType<typeof analyzeQuizPerformance>} analysis
 * @param {import('./hub.js').StudyHubItem[]} catalog
 * @param {{ limit?: number }} [options]
 */
export function recommendPracticeFromWeakness(analysis, catalog, options = {}) {
  const limit = options.limit ?? 6
  const items = Array.isArray(catalog) ? catalog : []
  const reasons = []

  if (!analysis || analysis.insufficientData || analysis.attemptCount === 0) {
    reasons.push({
      kind: 'insufficient-data',
      messageTh: 'ยังไม่มีผลแบบทดสอบพอ — ลองทำควิซอย่างน้อย 1 ชุดก่อน',
      messageEn: 'Not enough quiz attempts yet — complete at least one quiz first.',
    })
    const starter = filterStudyHubItems(items, { kind: 'quiz' }).slice(0, limit)
    return { reasons, recommendations: starter, mode: 'insufficient-data' }
  }

  if (analysis.observedWeaknesses.length === 0) {
    reasons.push({
      kind: 'no-observed-weakness',
      messageTh: 'ยังไม่พบจุดอ่อนชัดจากเกณฑ์คะแนน — แนะนำทบทวนชุดที่มีอยู่ต่อ',
      messageEn: 'No clear weakness under the score threshold — continue with available practice sets.',
    })
    const keep = filterStudyHubItems(items, { kind: 'quiz' }).slice(0, limit)
    return { reasons, recommendations: keep, mode: 'maintain' }
  }

  const recommendations = []
  const seen = new Set()
  for (const weak of analysis.observedWeaknesses) {
    reasons.push({
      kind: 'observed-weakness',
      subjectId: weak.subjectId,
      examPart: weak.examPart,
      avgPct: weak.avgPct,
      attempts: weak.attempts,
      messageTh: `คะแนนเฉลี่ย ${weak.avgPct}% ใน ${weak.subjectId} (จาก ${weak.attempts} ครั้ง) ต่ำกว่า ${WEAKNESS_PCT_THRESHOLD}%`,
      messageEn: `Average ${weak.avgPct}% in ${weak.subjectId} (${weak.attempts} attempts) is below ${WEAKNESS_PCT_THRESHOLD}%`,
    })
    const hits = filterStudyHubItems(items, {
      subjectId: weak.subjectId,
      examPart: weak.examPart === 'unknown' ? 'all' : weak.examPart,
    })
    for (const hit of hits) {
      if (seen.has(hit.id) || recommendations.length >= limit) continue
      seen.add(hit.id)
      recommendations.push({
        ...hit,
        recommendReason: `weakness:${weak.subjectId}:${weak.avgPct}`,
      })
    }
  }

  return { reasons, recommendations, mode: 'target-weakness' }
}

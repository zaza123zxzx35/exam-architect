/**
 * Evidence-aware exam prioritization for curated catalog items.
 * Separates known taxonomy/scope facts from system estimates and unknown stats.
 * Never invents historical frequency or official score weights.
 */

import { SUBJECT_IDS } from '../study/taxonomy.js'
import { URL_STATUS, isVerifiedAccessibleStatus } from './urlStatus.js'
import { curationStageForKind } from './validateCatalog.js'
import { resolveSubjectScoreBucket } from './officialExamScope.js'

/** @typedef {'score-max' | 'balanced' | 'weakness-focus'} PriorityMode */

export const PRIORITY_MODES = Object.freeze({
  SCORE_MAX: 'score-max',
  BALANCED: 'balanced',
  WEAKNESS_FOCUS: 'weakness-focus',
})

export const PRIORITY_MODE_LABELS_TH = Object.freeze({
  'score-max': 'เน้นคะแนนสูงสุด',
  balanced: 'สมดุล',
  'weakness-focus': 'ทบทวนจุดอ่อน',
})

export const PRIORITY_TIERS = Object.freeze({
  MUST: 'must-score',
  IF_TIME: 'if-time',
  DEFER: 'defer',
})

export const PRIORITY_TIER_LABELS_TH = Object.freeze({
  'must-score': 'ต้องเก็บคะแนน',
  'if-time': 'ควรอ่านถ้ามีเวลา',
  defer: 'พักไว้ก่อน',
})

/**
 * Official-scope membership from ก.ค.ศ. ว14/2566 (+ ประกาศเขต 2569).
 * Relative scopeRank values are estimates within a part — not official score weights.
 * See officialExamScope.js for source documents and verification date.
 */
export const SUBJECT_SCOPE = Object.freeze({
  [SUBJECT_IDS.MATH]: {
    examPart: 'ก',
    scopeRank: 0.9,
    label: 'คณิตอยู่ในคิดวิเคราะห์เชิงปริมาณของภาค ก (ก.ค.ศ. ว14/2566)',
  },
  [SUBJECT_IDS.EDUCATION]: {
    examPart: 'ข',
    scopeRank: 0.9,
    label: 'วิชาการศึกษา = มาตรฐานความรู้ทั่วไปในการจัดการเรียนการสอน ภาค ข (ว14/2566)',
  },
  [SUBJECT_IDS.LAW]: {
    examPart: 'ข',
    scopeRank: 0.85,
    label: 'กฎหมายครูอยู่ภาค ข (25 คะแนน ตาม ว14/2566)',
  },
  [SUBJECT_IDS.GENERAL_KNOWLEDGE_A]: {
    examPart: 'ก',
    scopeRank: 0.8,
    label: 'ภาษาไทย/จับใจความ สอดคล้องคิดวิเคราะห์เชิงภาษาภาค ก',
  },
  [SUBJECT_IDS.CIVIL_SERVANT_A]: {
    examPart: 'ก',
    scopeRank: 0.85,
    label: 'ความรู้และลักษณะการเป็นข้าราชการที่ดี ภาค ก (50 คะแนน · ว14/2566) — ไม่ปนกฎหมายภาค ข',
  },
  [SUBJECT_IDS.ENGLISH_SKILLS_A]: {
    examPart: 'ก',
    scopeRank: 0.9,
    label: 'ทักษะอังกฤษภาค ก — แยกจากวิชาเอก',
  },
  [SUBJECT_IDS.ENGLISH_MAJOR]: {
    examPart: 'ข',
    scopeRank: 0.95,
    label: 'วิชาเอกอังกฤษภาค ข — แยกจากอังกฤษภาค ก',
  },
})

/** Mode weights — apply only to numeric dimensions; unknown dims stay unknown. */
const MODE_WEIGHTS = Object.freeze({
  'score-max': {
    examRelevance: 0.35,
    foundationValue: 0.25,
    timeEfficiency: 0.2,
    weaknessNeed: 0.1,
    sourceConfidence: 0.1,
  },
  balanced: {
    examRelevance: 0.28,
    foundationValue: 0.2,
    timeEfficiency: 0.18,
    weaknessNeed: 0.2,
    sourceConfidence: 0.14,
  },
  'weakness-focus': {
    examRelevance: 0.22,
    foundationValue: 0.15,
    timeEfficiency: 0.13,
    weaknessNeed: 0.4,
    sourceConfidence: 0.1,
  },
})

/**
 * Per-part percentile bands (must share / if-time share of that part's items).
 * Different bands for ภาค ก vs ภาค ข — not one global threshold.
 */
const TIER_BANDS = Object.freeze({
  ก: {
    'score-max': { mustShare: 0.22, ifTimeShare: 0.28 },
    balanced: { mustShare: 0.3, ifTimeShare: 0.3 },
    'weakness-focus': { mustShare: 0.28, ifTimeShare: 0.32 },
  },
  ข: {
    'score-max': { mustShare: 0.35, ifTimeShare: 0.3 },
    balanced: { mustShare: 0.4, ifTimeShare: 0.3 },
    'weakness-focus': { mustShare: 0.38, ifTimeShare: 0.32 },
  },
})

const HYPE_TITLE_RE = /แหกโค้ง|เก็งข้อสอบ|ติวเข้ม|ห้ามพลาด|ต้องดู|ด่วน|ชัวร์/i

/**
 * @param {unknown} mode
 * @returns {PriorityMode}
 */
export function normalizePriorityMode(mode) {
  const m = String(mode || '')
  if (m === PRIORITY_MODES.SCORE_MAX || m === PRIORITY_MODES.WEAKNESS_FOCUS) return m
  return PRIORITY_MODES.BALANCED
}

/**
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 * @returns {{ value: number | 'unknown', evidence: 'known' | 'estimate' | 'unknown', noteTh: string, reasonCodes: string[] }}
 */
export function scoreExamRelevance(row) {
  const scope = SUBJECT_SCOPE[row.subjectId]
  const codes = []
  if (!scope) {
    return {
      value: 'unknown',
      evidence: 'unknown',
      noteTh: 'ยังไม่มีแผนที่ขอบเขตสอบอย่างเป็นทางการสำหรับวิชานี้ในระบบ',
      reasonCodes: ['exam-relevance-unknown'],
    }
  }
  if (row.examPart !== scope.examPart) {
    codes.push('exam-part-mismatch')
    return {
      value: 0.2,
      evidence: 'known',
      noteTh: `วิชาถูกระบุภาค ${row.examPart} แต่ taxonomy คาดหวังภาค ${scope.examPart}`,
      reasonCodes: codes,
    }
  }
  codes.push('in-official-part-scope')
  if (row.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A) codes.push('english-skills-a-part-a')
  if (row.subjectId === SUBJECT_IDS.ENGLISH_MAJOR) codes.push('english-major-part-b')
  return {
    value: scope.scopeRank,
    evidence: 'known',
    noteTh: scope.label,
    reasonCodes: codes,
  }
}

/**
 * No historical item bank in repo → always unknown (never invent from hype titles).
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 */
export function scoreHistoricalFrequency(row) {
  const hype = HYPE_TITLE_RE.test(String(row.title || '')) || HYPE_TITLE_RE.test(String(row.series || ''))
  return {
    value: 'unknown',
    evidence: 'unknown',
    noteTh: hype
      ? 'ชื่อคลิปมีคำโฆษณา แต่ระบบไม่ใช้เป็นหลักฐานว่าออกสอบบ่อย'
      : 'ยังไม่มีสถิติความถี่จากข้อสอบเก่าในคลังข้อมูลนี้',
    reasonCodes: hype ? ['frequency-unknown', 'hype-title-ignored'] : ['frequency-unknown'],
  }
}

/**
 * Category-level score guidance from official curriculum buckets (fallback).
 * Never invents per-lesson / per-course points from category totals.
 */
export function scoreScoreWeight(row) {
  const guidance = resolveSubjectScoreBucket(row?.subjectId)
  if (guidance.status !== 'mapped') {
    return {
      value: 'unknown',
      evidence: 'unknown',
      noteTh: guidance.reasonTh || 'รอยืนยันหมวดวิชา',
      reasonCodes: ['score-weight-awaiting-mapping', `subject:${row?.subjectId || 'unknown'}`],
    }
  }
  return {
    value: guidance.prioritySignal,
    evidence: 'official-curriculum-bucket',
    noteTh: guidance.reasonTh,
    reasonCodes: [
      'score-weight-category-guidance',
      `bucket-score:${guidance.maxScore}`,
      `subject:${row.subjectId}`,
      ...(guidance.sharedBucket ? ['shared-score-bucket'] : []),
    ],
  }
}

/**
 * Foundation heuristic — system estimate, not official.
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 */
export function scoreFoundationValue(row) {
  const stage = curationStageForKind(row.kind)
  const episode = Number(row.episode)
  let value = 0.3
  const codes = ['foundation-estimate']
  if (stage === 'foundation' || row.kind === 'document') {
    value = 0.9
    codes.push('kind-document-or-foundation')
  } else if (row.kind === 'lesson' || row.kind === 'live') {
    if (Number.isFinite(episode) && episode > 0 && episode <= 3) {
      value = 0.82
      codes.push('early-episode-estimate')
    } else if (Number.isFinite(episode) && episode <= 8) {
      value = 0.58
      codes.push('mid-episode-estimate')
    } else {
      value = 0.4
      codes.push('late-episode-estimate')
    }
  } else if (row.kind === 'quiz-practice') {
    value = Number.isFinite(episode) && episode <= 5 ? 0.5 : 0.32
    codes.push('practice-kind')
  } else if (row.kind === 'answer-key') {
    value = 0.28
    codes.push('answer-key-kind')
  }
  return {
    value,
    evidence: 'estimate',
    noteTh: 'ค่าประมาณจากประเภทเนื้อหา/ลำดับตอน — ไม่ใช่สถิติข้อสอบ',
    reasonCodes: codes,
  }
}

/**
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 * @param {Map<string, { avgPct?: number, attempts?: number, confidence?: string }>|undefined} weaknessBySubject
 */
export function scoreWeaknessNeed(row, weaknessBySubject) {
  if (!weaknessBySubject || weaknessBySubject.size === 0) {
    return {
      value: 'unknown',
      evidence: 'unknown',
      noteTh: 'ยังไม่มีผลควิซเพียงพอสำหรับจุดอ่อนรายวิชา',
      reasonCodes: ['weakness-unknown'],
    }
  }
  const weak = weaknessBySubject.get(row.subjectId)
  if (!weak) {
    return {
      value: 0.15,
      evidence: 'known',
      noteTh: 'มีผลควิซบางวิชา แต่ยังไม่พบจุดอ่อนในวิชานี้',
      reasonCodes: ['weakness-not-observed-for-subject'],
    }
  }
  const avg = Number(weak.avgPct)
  const need = Number.isFinite(avg) ? Math.max(0, Math.min(1, (70 - avg) / 70)) : 0.5
  const preliminary = weak.confidence === 'preliminary'
  return {
    value: preliminary ? need * 0.7 : need,
    evidence: 'known',
    noteTh: preliminary
      ? `สัญญาณเบื้องต้นจากควิซ (เฉลี่ย ${avg}%) — ยังไม่ใช่ข้อสรุปจุดอ่อน`
      : `จุดอ่อนจากผลควิซ (เฉลี่ย ${avg}% · ${weak.attempts || '?'} ครั้ง)`,
    reasonCodes: preliminary ? ['weakness-preliminary'] : ['weakness-observed'],
  }
}

/**
 * @param {import('../../data/curatedCatalog.js').CuratedResource & { urlStatus?: string }} row
 */
export function scoreSourceConfidence(row) {
  const status = row.urlStatus
  if (status === URL_STATUS.NEEDS_FULL_URL || status === URL_STATUS.UNREACHABLE) {
    return {
      value: 0.15,
      evidence: 'known',
      noteTh: 'URL ไม่ครบ/ใช้เปิดไม่ได้ — ไม่เสนอเป็นลิงก์พร้อมใช้งาน',
      reasonCodes: ['url-incomplete'],
    }
  }
  if (isVerifiedAccessibleStatus(status)) {
    return {
      value: 0.9,
      evidence: 'known',
      noteTh: 'มีสถานะ verified_accessible พร้อมหลักฐานในข้อมูล',
      reasonCodes: ['url-verified'],
    }
  }
  if (status === URL_STATUS.UNCHECKED || status === URL_STATUS.NEEDS_LOGIN) {
    return {
      value: 0.45,
      evidence: 'known',
      noteTh: 'รูปแบบ URL ครบแต่ยังไม่ตรวจสิทธิ์ — ไม่ถือว่า verified',
      reasonCodes: ['url-unchecked'],
    }
  }
  return {
    value: 0.35,
    evidence: 'estimate',
    noteTh: 'ความน่าเชื่อถือแหล่งเรียนยังไม่ชัด',
    reasonCodes: ['source-uncertain'],
  }
}

/**
 * Time efficiency uses only estimated dimensions — never fabricates exam points.
 * @param {{ examRelevance: { value: number|'unknown' }, foundationValue: { value: number|'unknown' }, weaknessNeed: { value: number|'unknown' } }} dims
 * @param {import('../../data/curatedCatalog.js').CuratedResource} row
 */
export function scoreTimeEfficiency(dims, row) {
  const minutes = Number(row.estimatedMinutes) > 0 ? Number(row.estimatedMinutes) : 45
  const parts = [dims.examRelevance.value, dims.foundationValue.value, dims.weaknessNeed.value]
    .filter(v => typeof v === 'number')
  if (!parts.length) {
    return {
      value: 'unknown',
      evidence: 'unknown',
      noteTh: 'ยังคำนวณคุ้มเวลาไม่ได้เพราะขาดมิติคะแนน',
      reasonCodes: ['time-efficiency-unknown'],
      estimatedMinutes: minutes,
    }
  }
  const expected = parts.reduce((a, b) => a + b, 0) / parts.length
  const value = Math.max(0, Math.min(1, expected / (minutes / 60)))
  return {
    value: Math.max(0, Math.min(1, value / 1.5)),
    evidence: 'estimate',
    noteTh: `ค่าประมาณคุ้มเวลาจากมิติที่มี ÷ ≈${minutes} นาที (ไม่ใช่คะแนนสอบจริง)`,
    reasonCodes: ['time-efficiency-estimate'],
    estimatedMinutes: minutes,
  }
}

/**
 * @param {import('../../data/curatedCatalog.js').CuratedResource & { urlStatus?: string }} row
 * @param {{
 *   mode?: PriorityMode,
 *   weaknessBySubject?: Map<string, { avgPct?: number, attempts?: number, confidence?: string }>,
 * }} [options]
 */
export function scoreCuratedResource(row, options = {}) {
  const mode = normalizePriorityMode(options.mode)
  const examRelevance = scoreExamRelevance(row)
  const historicalFrequency = scoreHistoricalFrequency(row)
  const scoreWeight = scoreScoreWeight(row)
  const foundationValue = scoreFoundationValue(row)
  const weaknessNeed = scoreWeaknessNeed(row, options.weaknessBySubject)
  const sourceConfidence = scoreSourceConfidence(row)
  const timeEfficiency = scoreTimeEfficiency(
    { examRelevance, foundationValue, weaknessNeed },
    row,
  )

  const dims = {
    examRelevance,
    historicalFrequency,
    scoreWeight,
    foundationValue,
    weaknessNeed,
    timeEfficiency,
    sourceConfidence,
  }

  const weights = MODE_WEIGHTS[mode]
  let weighted = 0
  let weightSum = 0
  /** @type {string[]} */
  const reasonCodes = []
  const limitations = []

  // Always surface codes from every dimension (including unknown ones like frequency).
  for (const dim of Object.values(dims)) {
    reasonCodes.push(...(dim.reasonCodes || []))
  }

  for (const [key, weight] of Object.entries(weights)) {
    const dim = dims[key]
    if (dim.value === 'unknown' || typeof dim.value !== 'number') {
      limitations.push(`${key}:unknown`)
      continue
    }
    weighted += dim.value * weight
    weightSum += weight
  }

  // Floor: strong official-scope items are never fully eliminated by weakness-only mode.
  const scopeFloor = typeof examRelevance.value === 'number' && examRelevance.value >= 0.8
    ? examRelevance.value * 0.35
    : 0

  const composite = weightSum > 0 ? weighted / weightSum : 0
  let priorityScore = Math.max(composite, scopeFloor)
  // Soft penalty only — incomplete URLs stay eligible for must when they are
  // the best available evidence for an official-scope subject (e.g. math stubs).
  if (sourceConfidence.reasonCodes.includes('url-incomplete')) {
    priorityScore *= 0.9
    reasonCodes.push('penalized-incomplete-url')
  }

  const reasonTh = buildReasonTh({ dims, tier: null, mode, priorityScore, limitations })

  return {
    id: row.id,
    mode,
    examPart: row.examPart,
    subjectId: row.subjectId,
    priorityScore,
    /** Tier assigned in rankCuratedCatalog via per-part percentiles. */
    tier: PRIORITY_TIERS.IF_TIME,
    tierLabelTh: PRIORITY_TIER_LABELS_TH[PRIORITY_TIERS.IF_TIME],
    dimensions: dims,
    reasonCodes: [...new Set(reasonCodes)],
    reasonTh,
    limitations,
    dataConfidence: limitations.length >= 3 ? 'low' : limitations.length > 0 ? 'mixed' : 'moderate',
    dataConfidenceLabelTh:
      limitations.length >= 3
        ? 'ข้อมูลจำกัด — ใช้ขอบเขตสอบ/ประเภทเนื้อหาเป็นหลัก'
        : limitations.length > 0
          ? 'ผสม: มีทั้งข้อเท็จจริงและการประมาณ'
          : 'พอใช้จากขอบเขตสอบ + การประมาณที่ระบุชัด',
  }
}

function buildReasonTh({ dims, tier, mode, priorityScore, limitations }) {
  const bits = [
    tier ? PRIORITY_TIER_LABELS_TH[tier] : null,
    PRIORITY_MODE_LABELS_TH[mode],
    `คะแนนรวมประมาณ ${priorityScore.toFixed(2)}`,
  ].filter(Boolean)
  if (dims.examRelevance.evidence === 'known') bits.push(dims.examRelevance.noteTh)
  if (dims.foundationValue.evidence === 'estimate') bits.push('พื้นฐาน/ลำดับตอนเป็นค่าประมาณ')
  if (dims.historicalFrequency.value === 'unknown') bits.push('ยังไม่มีสถิติความถี่ข้อสอบ')
  if (dims.historicalFrequency.reasonCodes?.includes('hype-title-ignored')) {
    bits.push('ชื่อคลิปโฆษณาไม่ใช้เป็นหลักฐานความถี่')
  }
  if (dims.scoreWeight.value === 'unknown') bits.push('ยังไม่มีน้ำหนักคะแนนรายข้อ')
  if (dims.weaknessNeed.evidence === 'known' && dims.weaknessNeed.value > 0.3) {
    bits.push(dims.weaknessNeed.noteTh)
  }
  if (dims.sourceConfidence.reasonCodes.includes('url-incomplete')) {
    bits.push('URL ไม่ครบ — ไม่ใช่ลิงก์พร้อมใช้งาน')
  } else if (dims.sourceConfidence.reasonCodes.includes('url-unchecked')) {
    bits.push('URL ยังไม่ตรวจ (unchecked) — ไม่ใช่ verified')
  }
  if (limitations.length) bits.push(`ข้อจำกัด: ${limitations.join(', ')}`)
  return bits.join(' · ')
}

/**
 * Ensure each official-scope subject in a part has at least one must-score item
 * (best-scoring row), so long duration / missing weakness / incomplete URL
 * cannot wipe an entire exam subject from the must pack.
 * @param {Array<{ row: object, score: object }>} scored
 * @param {'ก'|'ข'} part
 */
export function ensureSubjectMustCoverage(scored, part) {
  const scopeSubjects = Object.entries(SUBJECT_SCOPE)
    .filter(([, meta]) => meta.examPart === part)
    .map(([subjectId]) => subjectId)

  for (const subjectId of scopeSubjects) {
    const subjectRows = scored
      .filter(e => e.row.examPart === part && e.row.subjectId === subjectId)
      .sort((a, b) => b.score.priorityScore - a.score.priorityScore
        || String(a.row.id).localeCompare(String(b.row.id)))
    if (!subjectRows.length) continue
    const hasMust = subjectRows.some(e => e.score.tier === PRIORITY_TIERS.MUST)
    if (hasMust) continue
    const promote = subjectRows[0]
    promote.score.tier = PRIORITY_TIERS.MUST
    promote.score.tierLabelTh = PRIORITY_TIER_LABELS_TH[PRIORITY_TIERS.MUST]
    promote.score.reasonCodes = [...new Set([
      ...promote.score.reasonCodes,
      'subject-coverage-floor',
    ])]
    promote.score.reasonTh = buildReasonTh({
      dims: promote.score.dimensions,
      tier: PRIORITY_TIERS.MUST,
      mode: promote.score.mode,
      priorityScore: promote.score.priorityScore,
      limitations: promote.score.limitations,
    }) + ' · ยกระดับเพื่อไม่ให้วิชาในขอบเขตสอบหายจากกลุ่มต้องเก็บคะแนน'
  }
}

/**
 * @param {Array<import('../../data/curatedCatalog.js').CuratedResource & { urlStatus?: string }>} catalog
 * @param {{
 *   mode?: PriorityMode,
 *   weaknessBySubject?: Map<string, { avgPct?: number, attempts?: number, confidence?: string }>,
 * }} [options]
 */
export function rankCuratedCatalog(catalog, options = {}) {
  const mode = normalizePriorityMode(options.mode)
  const scored = (catalog || []).map(row => ({
    row,
    score: scoreCuratedResource(row, { ...options, mode }),
  }))

  // Assign tiers per exam part using percentile bands (ก ≠ ข).
  for (const part of ['ก', 'ข']) {
    const band = TIER_BANDS[part][mode]
    const group = scored
      .filter(e => e.row.examPart === part)
      .sort((a, b) => b.score.priorityScore - a.score.priorityScore || String(a.row.id).localeCompare(String(b.row.id)))
    const n = group.length
    const mustCount = Math.max(1, Math.floor(n * band.mustShare))
    const ifTimeCount = Math.max(0, Math.floor(n * band.ifTimeShare))
    group.forEach((entry, index) => {
      let tier = PRIORITY_TIERS.DEFER
      if (index < mustCount) tier = PRIORITY_TIERS.MUST
      else if (index < mustCount + ifTimeCount) tier = PRIORITY_TIERS.IF_TIME
      // Incomplete URL: warn loudly but do not strip official-scope subjects from must.
      if (tier === PRIORITY_TIERS.MUST && entry.score.reasonCodes.includes('penalized-incomplete-url')) {
        entry.score.reasonCodes = [...entry.score.reasonCodes, 'must-with-incomplete-url-warning']
      }
      entry.score.tier = tier
      entry.score.tierLabelTh = PRIORITY_TIER_LABELS_TH[tier]
      entry.score.reasonTh = buildReasonTh({
        dims: entry.score.dimensions,
        tier,
        mode,
        priorityScore: entry.score.priorityScore,
        limitations: entry.score.limitations,
      })
    })
    ensureSubjectMustCoverage(scored, part)
  }

  scored.sort((a, b) => {
    const tierRank = {
      [PRIORITY_TIERS.MUST]: 0,
      [PRIORITY_TIERS.IF_TIME]: 1,
      [PRIORITY_TIERS.DEFER]: 2,
    }
    const td = tierRank[a.score.tier] - tierRank[b.score.tier]
    if (td !== 0) return td
    if (b.score.priorityScore !== a.score.priorityScore) {
      return b.score.priorityScore - a.score.priorityScore
    }
    return String(a.row.id).localeCompare(String(b.row.id))
  })
  return scored
}

/**
 * Build weakness map from analyzeQuizPerformance output.
 * @param {{ observedWeaknesses?: Array<{ subjectId: string, avgPct: number, attempts: number, confidence?: string }> }} [analysis]
 */
export function weaknessMapFromAnalysis(analysis) {
  /** @type {Map<string, { avgPct: number, attempts: number, confidence?: string }>} */
  const map = new Map()
  for (const w of analysis?.observedWeaknesses || []) {
    if (!w?.subjectId) continue
    map.set(String(w.subjectId), {
      avgPct: Number(w.avgPct),
      attempts: Number(w.attempts) || 0,
      confidence: w.confidence,
    })
  }
  return map
}

import { describe, expect, it } from 'vitest'
import { enrichCuratedResources } from './catalog.js'
import { FIXTURE_CURATED_RESOURCES } from '../../data/curatedCatalog.fixture.js'
import {
  PRIORITY_MODES,
  PRIORITY_TIERS,
  normalizePriorityMode,
  rankCuratedCatalog,
  scoreCuratedResource,
  scoreHistoricalFrequency,
  scoreScoreWeight,
  weaknessMapFromAnalysis,
} from './priorityScoring.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { generateUnifiedStudyDraft, mergeUnifiedDraftIntoSchedule } from './unifiedPlan.js'

function baseRow(overrides = {}) {
  return {
    id: 't1',
    series: 'ทดสอบ',
    episode: 1,
    title: 'พื้นฐานตอนที่ 1',
    kind: 'lesson',
    examPart: 'ก',
    subjectId: 'math',
    url: 'https://example.com/a',
    estimatedMinutes: 45,
    priority: 10,
    source: 'test',
    urlStatus: 'unchecked',
    ...overrides,
  }
}

describe('priority scoring', () => {
  it('ranks high exam-scope foundation above low-value practice when frequency is unknown', () => {
    const high = scoreCuratedResource(baseRow({
      id: 'high',
      kind: 'document',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      examPart: 'ก',
      episode: 1,
      title: 'เอกสารพื้นฐานทักษะอังกฤษ',
    }), { mode: 'score-max' })
    const low = scoreCuratedResource(baseRow({
      id: 'low',
      kind: 'answer-key',
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      examPart: 'ก',
      episode: 40,
      title: 'เฉลยเสริม',
      estimatedMinutes: 120,
    }), { mode: 'score-max' })
    expect(high.dimensions.historicalFrequency.value).toBe('unknown')
    // Category score guidance is available from official buckets (not per-lesson invent).
    expect(low.dimensions.scoreWeight.value).toBeCloseTo(50 / 400)
    expect(low.dimensions.scoreWeight.reasonCodes).toContain('score-weight-category-guidance')
    expect(high.priorityScore).toBeGreaterThan(low.priorityScore)
    const ranked = rankCuratedCatalog([
      baseRow({
        id: 'high',
        kind: 'document',
        subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
        examPart: 'ก',
        episode: 1,
        title: 'เอกสารพื้นฐานทักษะอังกฤษ',
        urlStatus: 'unchecked',
      }),
      baseRow({
        id: 'low',
        kind: 'answer-key',
        subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
        examPart: 'ก',
        episode: 40,
        title: 'เฉลยเสริม',
        estimatedMinutes: 120,
        urlStatus: 'unchecked',
      }),
    ], { mode: 'score-max' })
    expect(ranked[0].row.id).toBe('high')
    expect(ranked[0].score.tier).toBe(PRIORITY_TIERS.MUST)
  })

  it('does not treat hype titles as historical frequency evidence', () => {
    const hype = scoreHistoricalFrequency(baseRow({ title: 'เก็งข้อสอบ ติวเข้ม ห้ามพลาด' }))
    expect(hype.value).toBe('unknown')
    expect(hype.reasonCodes).toContain('hype-title-ignored')
    // Unknown subject → awaiting mapping (not invented).
    expect(scoreScoreWeight(baseRow({ subjectId: SUBJECT_IDS.UNKNOWN })).value).toBe('unknown')
    expect(scoreScoreWeight(baseRow({ subjectId: SUBJECT_IDS.UNKNOWN })).reasonCodes)
      .toContain('score-weight-awaiting-mapping')
    // Mapped category gets soft guidance from official bucket — not per-lesson points.
    const majorWeight = scoreScoreWeight(baseRow({
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      examPart: 'ข',
    }))
    expect(majorWeight.value).toBeCloseTo(100 / 400)
    expect(majorWeight.reasonCodes).toContain('score-weight-category-guidance')
    expect(majorWeight.noteTh).toMatch(/ไม่ใช่คะแนนรายคอร์ส/)
    const scored = scoreCuratedResource(baseRow({
      title: 'แหกโค้งเก็งข้อสอบจริง สพฐ.ปี69',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      examPart: 'ข',
    }), { mode: 'score-max' })
    expect(scored.reasonCodes).toContain('hype-title-ignored')
    expect(scored.reasonCodes).toContain('frequency-unknown')
    expect(scored.reasonTh).toMatch(/โฆษณาไม่ใช้เป็นหลักฐาน|สถิติความถี่/)
    // "แหกโค้ง" alone (without เก็งข้อสอบ) must still be flagged as hype, not frequency.
    const haekAlone = scoreHistoricalFrequency(baseRow({
      title: 'Ep.7 แหกโค้ง (สรุป Grammar Post-Test)',
    }))
    expect(haekAlone.value).toBe('unknown')
    expect(haekAlone.reasonCodes).toContain('hype-title-ignored')
  })

  it('keeps at least one must-score item per official-scope subject (fixture catalog)', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const ranked = rankCuratedCatalog(catalog, { mode: 'score-max' })
    const mustSubjectsA = new Set(
      ranked.filter(e => e.row.examPart === 'ก' && e.score.tier === PRIORITY_TIERS.MUST).map(e => e.row.subjectId),
    )
    const mustSubjectsB = new Set(
      ranked.filter(e => e.row.examPart === 'ข' && e.score.tier === PRIORITY_TIERS.MUST).map(e => e.row.subjectId),
    )
    expect(mustSubjectsA.has('math')).toBe(true)
    expect(mustSubjectsA.has(SUBJECT_IDS.ENGLISH_SKILLS_A)).toBe(true)
    expect(mustSubjectsB.has('law')).toBe(true)
    expect(mustSubjectsB.has(SUBJECT_IDS.EDUCATION)).toBe(true)
    expect(mustSubjectsB.has(SUBJECT_IDS.ENGLISH_MAJOR)).toBe(true)
    const mathMust = ranked.filter(e => e.row.subjectId === 'math' && e.score.tier === PRIORITY_TIERS.MUST)
    expect(mathMust.length).toBeGreaterThanOrEqual(1)
  })

  it('keeps english-skills-a and english-major on separate exam parts in ranking', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const ranked = rankCuratedCatalog(catalog, { mode: 'balanced' })
    const skills = ranked.filter(e => e.row.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A)
    const major = ranked.filter(e => e.row.subjectId === SUBJECT_IDS.ENGLISH_MAJOR)
    expect(skills.length).toBeGreaterThan(0)
    expect(major.length).toBeGreaterThan(0)
    expect(skills.every(e => e.row.examPart === 'ก' && e.score.examPart === 'ก')).toBe(true)
    expect(major.every(e => e.row.examPart === 'ข' && e.score.examPart === 'ข')).toBe(true)
  })

  it('unknown dimensions are not scored as high confirmed evidence', () => {
    const scored = scoreCuratedResource(baseRow(), { mode: 'balanced' })
    expect(scored.dimensions.historicalFrequency.value).toBe('unknown')
    // Category bucket guidance is known; frequency remains unknown → still mixed confidence.
    expect(typeof scored.dimensions.scoreWeight.value).toBe('number')
    expect(scored.dimensions.scoreWeight.noteTh).toMatch(/ไม่ใช่คะแนนรายคอร์ส/)
    expect(scored.limitations.some(l => l.includes('unknown'))).toBe(true)
    expect(scored.dataConfidence).not.toBe('high')
    expect(scored.reasonTh).toMatch(/สถิติความถี่|unknown|จำกัด|ประมาณ/i)
  })

  it('weakness boost does not eliminate strong official-scope subjects', () => {
    const weaknessBySubject = weaknessMapFromAnalysis({
      observedWeaknesses: [
        { subjectId: 'law', avgPct: 20, attempts: 3, confidence: 'observed' },
      ],
    })
    const math = scoreCuratedResource(baseRow({
      id: 'math-f',
      subjectId: 'math',
      kind: 'document',
      title: 'เอกสารคณิตพื้นฐาน',
    }), { mode: 'weakness-focus', weaknessBySubject })
    const law = scoreCuratedResource(baseRow({
      id: 'law-w',
      subjectId: 'law',
      kind: 'lesson',
      title: 'กฎหมายตอนที่ 1',
    }), { mode: 'weakness-focus', weaknessBySubject })
    expect(law.priorityScore).toBeGreaterThan(math.priorityScore)
    expect(math.tier === PRIORITY_TIERS.MUST || math.tier === PRIORITY_TIERS.IF_TIME).toBe(true)
  })

  it('score-max, balanced, and weakness-focus produce distinguishable rankings', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const weaknessBySubject = weaknessMapFromAnalysis({
      observedWeaknesses: [
        { subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A, avgPct: 25, attempts: 2, confidence: 'observed' },
      ],
    })
    const rankIds = (mode) => rankCuratedCatalog(catalog, { mode, weaknessBySubject })
      .slice(0, 12)
      .map(e => e.row.id)
      .join(',')
    const a = rankIds('score-max')
    const b = rankIds('balanced')
    const c = rankIds('weakness-focus')
    expect(normalizePriorityMode('nope')).toBe(PRIORITY_MODES.BALANCED)
    expect(a === b && b === c).toBe(false)

    const avgRank = (mode, subjectId) => {
      const ranked = rankCuratedCatalog(catalog, { mode, weaknessBySubject })
      const idxs = ranked
        .map((e, i) => (e.row.subjectId === subjectId ? i : -1))
        .filter(i => i >= 0)
      return idxs.reduce((s, i) => s + i, 0) / idxs.length
    }
    expect(avgRank('weakness-focus', SUBJECT_IDS.ENGLISH_SKILLS_A))
      .toBeLessThan(avgRank('score-max', SUBJECT_IDS.ENGLISH_SKILLS_A))
  })

  it('deferred items remain in catalog ranking while schedule skips them', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
    const ranked = rankCuratedCatalog(catalog, { mode: 'score-max' })
    const deferredIds = new Set(
      ranked.filter(e => e.score.tier === PRIORITY_TIERS.DEFER).map(e => e.row.id),
    )
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'score-max',
      catalog,
    })
    expect(draft.proposedTasks.every(t => !t.resourceId || !deferredIds.has(t.resourceId))).toBe(true)
  })

  it('schedule stays within daily budget and never plans before today', () => {
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'balanced',
      catalog: enrichCuratedResources(FIXTURE_CURATED_RESOURCES),
    })
    expect(draft.proposedTasks.every(t => t.plannedDate >= '2026-10-14')).toBe(true)
    const byDate = new Map()
    for (const t of draft.proposedTasks.filter(x => x.resourceId)) {
      byDate.set(t.plannedDate, (byDate.get(t.plannedDate) || 0) + t.estimatedMinutes)
    }
    for (const [, minutes] of byDate) {
      expect(minutes).toBeLessThanOrEqual(180)
    }
  })

  it('unchecked URLs are never labeled verified in scoring reasons', () => {
    const scored = scoreCuratedResource(baseRow({ urlStatus: 'unchecked' }), { mode: 'balanced' })
    expect(scored.dimensions.sourceConfidence.reasonCodes).toContain('url-unchecked')
    expect(scored.reasonTh).not.toMatch(/verified_accessible|ยืนยันว่าเปิดได้/)
    expect(scored.reasonTh).toMatch(/ยังไม่ตรวจ|unchecked/)
  })

  it('repeated merge stays add-only and preserves done / userEdited', () => {
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'score-max',
      catalog: enrichCuratedResources(FIXTURE_CURATED_RESOURCES),
    })
    const first = draft.proposedTasks.find(t => t.resourceId)
    expect(first).toBeTruthy()
    const schedule = {
      tasks: [
        { ...first, status: 'done', title: 'done-keep' },
        {
          id: draft.proposedTasks[1].id,
          title: 'edited-keep',
          status: 'pending',
          plannedDate: '2026-10-20',
          userEdited: true,
          origin: 'curated-unified-plan',
        },
      ],
    }
    const once = mergeUnifiedDraftIntoSchedule(schedule, draft)
    const twice = mergeUnifiedDraftIntoSchedule(once, draft)
    expect(twice.tasks.find(t => t.id === first.id)).toMatchObject({ status: 'done', title: 'done-keep' })
    expect(twice.tasks.find(t => t.id === draft.proposedTasks[1].id)).toMatchObject({
      title: 'edited-keep',
      userEdited: true,
    })
    const curated = twice.tasks.filter(t => String(t.id).startsWith('curated_'))
    expect(new Set(curated.map(t => t.id)).size).toBe(curated.length)
  })
})

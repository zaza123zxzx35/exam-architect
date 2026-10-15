/**
 * Forced 29-day Part ข coverage pack (education + law + english-major).
 *
 * Cuts are budget / official-score-weight / duplicate / URL-usability decisions.
 * Never claims a topic "will not appear" on the exam — no frequency stats in repo.
 */

import { getExams } from '../../data/examCalendar.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'
import { enrichCuratedResources } from './catalog.js'
import {
  DEFAULT_DAILY_STUDY_MINUTES,
  committedMinutesByDate,
  mergeUnifiedDraftIntoSchedule,
} from './unifiedPlan.js'
import {
  PRIORITY_MODE_LABELS_TH,
  PRIORITY_TIERS,
  PRIORITY_TIER_LABELS_TH,
  normalizePriorityMode,
  rankCuratedCatalog,
  weaknessMapFromAnalysis,
} from './priorityScoring.js'
import { OFFICIAL_CURRICULUM_BUCKETS } from './officialExamScope.js'
import {
  generateLiveScheduleTasks,
  reorderQueueForDateFocus,
  subjectFocusForDate,
} from './liveSchedulePlan.js'

export const PART_B_29_PLAN_VERSION = '1.1-part-b-forced-lives'
export const PART_B_29_DAY_TARGET = 29
export const PART_B_29_ORIGIN = 'curated-part-b-29'

/** Official Part ข bucket scores (ว14/2566) — used only as relative caps, not item weights. */
const PART_B_OFFICIAL_SCORES = Object.freeze({
  [SUBJECT_IDS.ENGLISH_MAJOR]: 100,
  [SUBJECT_IDS.EDUCATION]: 75,
  [SUBJECT_IDS.LAW]: 25,
})

/**
 * Hard caps for the forced pack. Minutes are estimates from catalog rows.
 * @type {Readonly<Record<string, { maxItems: number, maxMinutes: number, examPart: 'ก'|'ข' }>>}
 */
export const PART_B_29_CAPS = Object.freeze({
  [SUBJECT_IDS.ENGLISH_MAJOR]: { maxItems: 12, maxMinutes: 1080, examPart: 'ข' },
  [SUBJECT_IDS.EDUCATION]: { maxItems: 6, maxMinutes: 360, examPart: 'ข' },
  [SUBJECT_IDS.LAW]: { maxItems: 6, maxMinutes: 330, examPart: 'ข' },
  [SUBJECT_IDS.ENGLISH_SKILLS_A]: { maxItems: 4, maxMinutes: 300, examPart: 'ก' },
  [SUBJECT_IDS.MATH]: { maxItems: 5, maxMinutes: 300, examPart: 'ก' },
  [SUBJECT_IDS.GENERAL_KNOWLEDGE_A]: { maxItems: 6, maxMinutes: 270, examPart: 'ก' },
})

/**
 * Prefer these ids when present (skill / early foundation / docs).
 * Soft preference only — still subject to caps and ranking.
 * Lady Kaekae pack: Ep.8.x ปี 69 + foundation ข first; หมาหอน ก Ep.1–4 for slim Part ก.
 */
const PREFER_IDS = Object.freeze(new Set([
  // Major ข · ครูเลดี้เก๋เก๋ Ep.8.1–8.10 ปี 69 + foundation
  'lady-b-001',
  'lady-b-002',
  'lady-b-003',
  'lady-b-004',
  'lady-b-005',
  'lady-b-006',
  'lady-b-007',
  'lady-b-008',
  'lady-b-009',
  'lady-b-010',
  'lady-b-011',
  'lady-b-012',
  // Skills ก · คืนหมาหอน Ep.1–4 + Ep.9 เก็งปี 69
  'lady-a-001',
  'lady-a-002',
  'lady-a-003',
  'lady-a-004',
  'lady-a-005',
  'lady-a-006',
  // Education ข · อ.นนท์ foundation + เอกสารวิเคราะห์ (URL ครบ)
  'edu-nonn-analysis-doc',
  'edu-nonn-01',
  'edu-nonn-02',
  'edu-nonn-03',
  'edu-nonn-04',
  'edu-nonn-live-01',
  // Law ข · อ.นนท์ แกนกฎหมายครู + Drive ที่ URL ครบ
  'law-nonn-redbook-key',
  'law-nonn-01',
  'law-nonn-02',
  'law-nonn-04',
  'law-nonn-07',
  'law-nonn-10',
  'law-nonn-special-34-doc',
  // Math ก · YouTube ตัวเลขและเหตุผล Ep.1–5 (slim Part A)
  'math-num-01',
  'math-num-02',
  'math-num-03',
  'math-num-04',
  'math-num-05',
]))
/**
 * Explicit deprioritize (duplicates, bare FB links, late episodes beyond Part A slim caps).
 * Still kept in library — only excluded from this 29-day forced pack.
 */
const DEPRIORITIZE_IDS = Object.freeze(new Set([
  // Major ข · older archive / if-time beyond Ep.8 cap
  'lady-b-019',
  'lady-b-020',
  'lady-b-021',
  'lady-b-022',
  'lady-b-023',
  'lady-b-024',
  'lady-b-025',
  'lady-b-026',
  'lady-b-027',
  'lady-b-028',
  'lady-b-029',
  'lady-b-030',
  'lady-b-031',
  'lady-b-032',
  // Skills ก · archive + ก.พ. + หมาหอนเก่า (beyond slim Part A)
  'lady-a-021',
  'lady-a-022',
  'lady-a-023',
  'lady-a-024',
  'lady-a-025',
  'lady-a-026',
  'lady-a-027',
  'lady-a-028',
  'lady-a-029',
  'lady-a-030',
  'lady-a-031',
  'lady-a-032',
  'lady-a-033',
  'lady-a-034',
  'lady-a-035',
  'lady-a-036',
  'lady-a-037',
  'lady-a-038',
  'lady-a-039',
  'lady-a-040',
  'lady-a-041',
  'lady-a-042',
  'lady-a-043',
  'lady-a-044',
  'lady-a-045',
  'lady-a-046',
  'lady-a-047',
  'lady-a-048',
  'lady-a-049',
  'lady-a-050',
  'lady-a-051',
  'lady-a-052',
  'lady-a-053',
  'lady-a-054',
  'lady-a-055',
  'lady-a-056',
  'lady-a-057',
  'lady-a-058',
  'lady-a-059',
  'lady-a-060',
  'lady-a-061',
  'lady-a-062',
  'lady-a-063',
  'lady-a-064',
  'lady-a-065',
  'lady-a-066',
  'lady-a-067',
  'lady-a-068',
  'lady-a-069',
  'lady-a-070',
  'lady-a-071',
  'lady-a-072',
  'lady-a-073',
  'lady-a-074',
  'lady-a-075',
  'lady-a-076',
  'lady-a-077',
  // Education ข · ข้อสอบเล่มแดงท้ายชุด + ไลฟ์ 2 + เฉลย stub (เกิน cap 6)
  'edu-nonn-05',
  'edu-nonn-06',
  'edu-nonn-07',
  'edu-nonn-08',
  'edu-nonn-09',
  'edu-nonn-live-02',
  'edu-nonn-analysis-key',
  // Law ข · ตะลุยเล่มแดงท้ายชุด + stub / ไลฟ์ที่ไม่ครบ (เกิน cap 6)
  'law-nonn-17',
  'law-nonn-18',
  'law-nonn-19',
  'law-nonn-20',
  'law-nonn-21',
  'law-nonn-22',
  'law-nonn-23',
  'law-nonn-24',
  'law-nonn-special-12-doc',
  'law-nonn-special-34-key',
  'law-nonn-live-02',
  'law-nonn-live-03',
  'law-nonn-live-04',
  // Math ก · อ.แก็บทั้งชุด + YouTube ตอนท้ายเกิน slim cap
  'math-num-06',
  'math-num-07',
  'math-num-08',
  'math-num-09',
  'math-gab-01',
  'math-gab-02',
  'math-gab-03',
  'math-gab-04',
  'math-gab-05',
  'math-gab-06',
  'math-gab-07',
  'math-gab-08',
  'math-gab-09',
  'math-gab-10a',
  'math-gab-10b',
  'math-gab-11',
  'math-gab-12',
  'math-gab-13',
  'math-gab-14',
  'math-gab-15',
  'math-gab-16',
  'math-gab-17',
  'math-gab-18',
]))

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00+07:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

function daysBetween(startIso, endIso) {
  const a = new Date(`${startIso}T12:00:00+07:00`).getTime()
  const b = new Date(`${endIso}T12:00:00+07:00`).getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

function estimateMinutes(row) {
  const m = Number(row?.estimatedMinutes)
  return Number.isFinite(m) && m > 0 ? m : 45
}

function urlReadyRank(row) {
  if (row.urlStatus === 'needs_full_url' || row.urlStatus === 'unreachable') return 2
  if (row.urlStatus === 'unchecked' || row.urlStatus === 'needs_login') return 1
  if (row.urlStatus === 'verified_accessible' || row.urlStatus === 'openable') return 0
  return 1
}

function kindRank(row) {
  if (row.kind === 'document') return 0
  if (row.kind === 'lesson') return 1
  if (row.kind === 'quiz-practice') return 2
  if (row.kind === 'live') return 3
  return 4
}

/**
 * Human-readable cut policy shown before apply.
 */
export function buildPartB29CutPolicy() {
  const buckets = OFFICIAL_CURRICULUM_BUCKETS.filter(b => b.examPart === 'ข')
  return {
    version: PART_B_29_PLAN_VERSION,
    honestyTh: [
      'ไม่ได้ตัดเพราะ "ไม่น่าออกสอบ" — ระบบไม่มีสถิติความถี่ข้อสอบเก่า',
      'ตัดเพื่อให้อยู่ในงบ ≈120 นาที/วัน × 29 วัน และจัดภาค ข must ให้ครบก่อน',
      'สัดส่วนแพ็กอิงคะแนนหลักสูตร ก.ค.ศ. ว14/2566 (เอก 100 · การศึกษา 75 · กฎหมาย 25) ไม่ใช่น้ำหนักรายข้อ',
    ],
    officialPartBTh: buckets.map(b => `${b.titleTh} (${b.maxScore} คะแนน)`),
    caps: PART_B_29_CAPS,
    cutGroupsTh: [
      {
        id: 'major-dupes',
        titleTh: 'วิชาเอกอังกฤษ (ครูเลดี้เก๋เก๋) — เก็บ Ep.8.x ปี 69 + foundation · ตัด archive เก่า',
        reasonTh: 'งบไม่พอเก็บ must ข ทั้งชุด (≈25 ตอน) · เหลือประมาณ 12 ตอน: Ep.8.1–8.10 ปี 69 + Grammar/กรณีพิเศษ',
        exampleIds: [
          'lady-b-019',
          'lady-b-023',
          'lady-b-026',
          'lady-b-030',
        ],
      },
      {
        id: 'law-slim',
        titleTh: 'กฎหมาย (อ.นนท์) — เก็บแกน พ.ร.บ. + เฉลยเล่มแดง / เอกสารพิเศษที่ URL ครบ',
        reasonTh: 'หมวดกฎหมายภาค ข มีแค่ 25 คะแนน · cap ≈6 ตอน · ตัดตะลุยเล่มแดงตอนท้ายและ stub',
        exampleIds: ['law-nonn-19', 'law-nonn-22', 'law-nonn-special-12-doc'],
      },
      {
        id: 'edu-keep',
        titleTh: 'วิชาการศึกษา (อ.นนท์) — เก็บเอกสารวิเคราะห์ + ตอน 1–4 + ไลฟ์ 1',
        reasonTh: 'หมวดการศึกษา 75 คะแนน · cap ≈6 ตอน · FB ส่วนใหญ่ยัง needs_full_url แต่เก็บลำดับพื้นฐานก่อน',
        exampleIds: ['edu-nonn-05', 'edu-nonn-09', 'edu-nonn-analysis-key'],
      },
      {
        id: 'part-a-slim',
        titleTh: 'ภาค ก — หมาหอนอังกฤษ + YouTube คณิต Ep.1–5 · ตัดแก็บ/ตอนท้าย',
        reasonTh: 'บังคับภาค ข ก่อน · ภาค ก เหลือช่องว่างจึงเก็บอังกฤษล่าสุด + คณิตชุดหลักไม่เกิน 5 ตอน',
        exampleIds: [
          'lady-a-025',
          'math-gab-15',
          'math-num-09',
        ],
      },
    ],
  }
}

/**
 * Rank entries for pack selection within one subject.
 * @param {Array<{ row: object, score: object }>} entries
 */
function episodeNum(row) {
  const n = Number(row?.episode)
  return Number.isFinite(n) && n > 0 ? n : 9999
}

function sortForPack(entries) {
  return [...entries].sort((a, b) => {
    const aPref = PREFER_IDS.has(String(a.row.id)) ? 0 : 1
    const bPref = PREFER_IDS.has(String(b.row.id)) ? 0 : 1
    if (aPref !== bPref) return aPref - bPref
    const aDep = DEPRIORITIZE_IDS.has(String(a.row.id)) ? 1 : 0
    const bDep = DEPRIORITIZE_IDS.has(String(b.row.id)) ? 1 : 0
    if (aDep !== bDep) return aDep - bDep
    const tierOrder = { [PRIORITY_TIERS.MUST]: 0, [PRIORITY_TIERS.IF_TIME]: 1, [PRIORITY_TIERS.DEFER]: 2 }
    const td = (tierOrder[a.score.tier] ?? 9) - (tierOrder[b.score.tier] ?? 9)
    if (td !== 0) return td
    // Earlier episodes / foundation order before late review dumps.
    const ed = episodeNum(a.row) - episodeNum(b.row)
    if (ed !== 0) return ed
    const kd = kindRank(a.row) - kindRank(b.row)
    if (kd !== 0) return kd
    const ud = urlReadyRank(a.row) - urlReadyRank(b.row)
    if (ud !== 0) return ud
    if (b.score.priorityScore !== a.score.priorityScore) {
      return b.score.priorityScore - a.score.priorityScore
    }
    return String(a.row.id).localeCompare(String(b.row.id))
  })
}

/**
 * Select capped pack for one subject from ranked catalog entries.
 * @param {Array<{ row: object, score: object }>} ranked
 * @param {string} subjectId
 */
export function selectSubjectPack(ranked, subjectId) {
  const cap = PART_B_29_CAPS[subjectId]
  if (!cap) {
    return { kept: [], cut: [], subjectId, minutesKept: 0, minutesCut: 0 }
  }
  const pool = sortForPack(
    ranked.filter(e => e.row.subjectId === subjectId && e.row.examPart === cap.examPart),
  )
  const kept = []
  const cut = []
  let minutesKept = 0
  for (const entry of pool) {
    const id = String(entry.row.id)
    const minutes = estimateMinutes(entry.row)
    const wouldExceedItems = kept.length >= cap.maxItems
    const wouldExceedMinutes = minutesKept + minutes > cap.maxMinutes && kept.length > 0
    const forcedOut = DEPRIORITIZE_IDS.has(id) && !PREFER_IDS.has(id)
    if (forcedOut || wouldExceedItems || wouldExceedMinutes) {
      cut.push({
        id,
        title: entry.row.title,
        subjectId,
        examPart: entry.row.examPart,
        minutes,
        tier: entry.score.tier,
        reasonTh: forcedOut
          ? 'ตัดจากแพ็ก 29 วัน: ตอนซ้ำ/ไลฟ์ยาว/ลิงก์แชร์เปล่า หรือเกินสัดส่วนคะแนนหมวด'
          : wouldExceedItems
            ? `เกินเพดานจำนวน ${cap.maxItems} ตอนของวิชานี้`
            : `เกินเพดานเวลา ≈${cap.maxMinutes} นาทีของวิชานี้`,
      })
      continue
    }
    kept.push(entry)
    minutesKept += minutes
  }
  const minutesCut = cut.reduce((s, c) => s + c.minutes, 0)
  return { kept, cut, subjectId, minutesKept, minutesCut, cap }
}

/**
 * Build the full forced pack (Part ข first subjects, then slim Part ก).
 * @param {ReturnType<typeof rankCuratedCatalog>} ranked
 */
export function buildPartB29Pack(ranked) {
  const partBSubjects = [
    SUBJECT_IDS.ENGLISH_MAJOR,
    SUBJECT_IDS.EDUCATION,
    SUBJECT_IDS.LAW,
  ]
  const partASubjects = [
    SUBJECT_IDS.ENGLISH_SKILLS_A,
    SUBJECT_IDS.MATH,
    SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
  ]
  const packs = {}
  const cutList = []
  for (const subjectId of [...partBSubjects, ...partASubjects]) {
    const pack = selectSubjectPack(ranked, subjectId)
    packs[subjectId] = pack
    cutList.push(...pack.cut)
  }

  const partBQueue = partBSubjects.flatMap(id => packs[id].kept)
  const partAQueue = partASubjects.flatMap(id => packs[id].kept)

  return {
    packs,
    partBQueue,
    partAQueue,
    cutList,
    summary: {
      partBItems: partBQueue.length,
      partBMinutes: partBQueue.reduce((s, e) => s + estimateMinutes(e.row), 0),
      partAItems: partAQueue.length,
      partAMinutes: partAQueue.reduce((s, e) => s + estimateMinutes(e.row), 0),
      cutItems: cutList.length,
      cutMinutes: cutList.reduce((s, c) => s + c.minutes, 0),
      officialScores: PART_B_OFFICIAL_SCORES,
    },
  }
}

/**
 * Generate a 29-day draft that schedules Part ข pack before Part ก filler.
 * @param {{
 *   todayIso?: string,
 *   dailyMinutes?: number,
 *   dayTarget?: number,
 *   existingTaskIds?: string[],
 *   existingTasks?: Array<object>,
 *   catalog?: ReturnType<typeof enrichCuratedResources>,
 *   mode?: import('./priorityScoring.js').PriorityMode,
 *   weaknessAnalysis?: object,
 * }} [options]
 */
export function generatePartB29Draft(options = {}) {
  const exams = getExams()
  const examA = exams.find(e => e.id === 'exam-part-a-2569') || exams[0]
  const examB = exams.find(e => e.id === 'exam-part-b-2569') || exams[1]
  const todayIso = options.todayIso || isoDate(new Date())
  const dailyMinutes = Number(options.dailyMinutes) > 0
    ? Number(options.dailyMinutes)
    : DEFAULT_DAILY_STUDY_MINUTES
  const mode = normalizePriorityMode(options.mode || 'score-max')
  const dayTarget = Number(options.dayTarget) > 0
    ? Number(options.dayTarget)
    : PART_B_29_DAY_TARGET

  const examAIso = String(examA?.startsAt || '').slice(0, 10)
  const examBIso = String(examB?.startsAt || examA?.startsAt || todayIso).slice(0, 10)
  const daysToExamA = daysBetween(todayIso, examAIso)
  // Use the shorter of fixed 29-day sprint and calendar to Part ก (inclusive study through day before exam if needed).
  const dayCount = Math.max(1, Math.min(dayTarget, Math.max(daysToExamA, 1)))
  const reviewBufferDays = Math.min(2, Math.floor(dayCount / 10) || 1)
  const studyDays = Math.max(1, dayCount - reviewBufferDays)

  const existingIdsFromTasks = (options.existingTasks || []).map(t => t?.id).filter(Boolean)
  const existing = new Set([...existingIdsFromTasks, ...(options.existingTaskIds || [])].map(String))
  const doneResourceIds = new Set(
    (options.existingTasks || [])
      .filter(t => t && t.status === 'done' && String(t.id || '').startsWith('curated_'))
      .map(t => String(t.id).replace(/^curated_/, '')),
  )
  const committed = committedMinutesByDate(options.existingTasks, { curatedOnly: true })

  const catalog = options.catalog || enrichCuratedResources()
  const weaknessBySubject = weaknessMapFromAnalysis(options.weaknessAnalysis)
  const ranked = rankCuratedCatalog(catalog, { mode, weaknessBySubject })
  const pack = buildPartB29Pack(ranked)
  const cutPolicy = buildPartB29CutPolicy()

  /** @type {Array<{ row: object, score: object }>} */
  let remainingB = [...pack.partBQueue]
  /** @type {Array<{ row: object, score: object }>} */
  let remainingA = [...pack.partAQueue]
  const proposedTasks = []

  const pushTask = (entry, date, reasonExtraTh = '') => {
    const res = entry.row
    const taskId = `curated_${res.id}`
    if (
      existing.has(taskId)
      || proposedTasks.some(t => t.id === taskId)
      || doneResourceIds.has(String(res.id))
    ) {
      return false
    }
    const minutes = estimateMinutes(res)
    const focus = subjectFocusForDate(date)
    proposedTasks.push({
      id: taskId,
      title: res.title,
      plannedDate: date,
      status: 'pending',
      origin: PART_B_29_ORIGIN,
      examPart: res.examPart,
      subjectId: res.subjectId,
      resourceId: res.id,
      resourceUrl: res.safeUrl || res.originalUrl || '',
      urlStatus: res.urlStatus,
      estimatedMinutes: minutes,
      durationMinutes: minutes,
      durationIsEstimate: true,
      priorityTier: entry.score.tier,
      priorityScore: entry.score.priorityScore,
      priorityMode: mode,
      reasonTh: [
        'แผน 29 วันบังคับภาค ข',
        entry.score.tier === PRIORITY_TIERS.MUST
          ? PRIORITY_TIER_LABELS_TH[PRIORITY_TIERS.MUST]
          : PRIORITY_TIER_LABELS_TH[entry.score.tier] || entry.score.tier,
        focus && focus.subjectId === res.subjectId
          ? `ตรงบล็อกไลฟ์/เนื้อหา: ${focus.titleTh}`
          : null,
        reasonExtraTh,
        entry.score.reasonTh,
      ].filter(Boolean).join(' · '),
      reasonCodes: [...new Set([
        ...(entry.score.reasonCodes || []),
        'part-b-29-forced',
        ...(focus && focus.subjectId === res.subjectId ? ['vip-date-focus'] : []),
      ])],
      planPack: 'part-b-29',
    })
    return minutes
  }

  const packQueueIntoDay = (date, budget, queue, reasonTh) => {
    const ordered = reorderQueueForDateFocus(date, queue)
    /** @type {Array<{ row: object, score: object }>} */
    const leftover = []
    let remainingBudget = budget
    for (const entry of ordered) {
      if (remainingBudget <= 0) {
        leftover.push(entry)
        continue
      }
      const minutes = estimateMinutes(entry.row)
      const dayHasWork = (committed.get(date) || 0) > 0
        || proposedTasks.some(t => t.plannedDate === date)
      if (minutes > remainingBudget && dayHasWork) {
        leftover.push(entry)
        continue
      }
      if (minutes > remainingBudget && !dayHasWork && remainingBudget < dailyMinutes) {
        leftover.push(entry)
        continue
      }
      const used = pushTask(entry, date, reasonTh)
      if (used === false) continue
      remainingBudget -= used
    }
    return { leftover, remainingBudget }
  }

  // Phase 1: Part ข only (VIP date focus reorders within the pack).
  for (let day = 0; day < studyDays && remainingB.length > 0; day += 1) {
    const date = addDaysIso(todayIso, day)
    const budget = Math.max(0, dailyMinutes - (committed.get(date) || 0))
    const result = packQueueIntoDay(date, budget, remainingB, 'จัดก่อนภาค ก')
    remainingB = result.leftover
  }

  // Phase 2: leftover Part ข then slim Part ก, still honouring date focus.
  for (let day = 0; day < studyDays; day += 1) {
    const date = addDaysIso(todayIso, day)
    let budget = Math.max(0, dailyMinutes - (committed.get(date) || 0))
    budget -= proposedTasks
      .filter(t => t.plannedDate === date && String(t.origin || '').startsWith('curated'))
      .reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0)
    if (budget <= 0) continue
    if (remainingB.length) {
      const r = packQueueIntoDay(date, budget, remainingB, 'ส่วนที่เหลือของแพ็กภาค ข')
      remainingB = r.leftover
      budget = r.remainingBudget
    }
    if (budget > 0 && remainingA.length) {
      const r = packQueueIntoDay(date, budget, remainingA, 'เติมภาค กหลังบังคับภาค ข')
      remainingA = r.leftover
    }
  }

  // Pin poster live / content-block tasks (evening lives do not consume daytime curated budget).
  const liveDraft = generateLiveScheduleTasks({
    todayIso,
    untilIso: addDaysIso(todayIso, Math.max(0, dayCount - 1)),
    existingTaskIds: [...existing],
  })
  for (const task of liveDraft.proposedTasks) {
    if (existing.has(task.id) || proposedTasks.some(t => t.id === task.id)) continue
    proposedTasks.push(task)
  }

  // Review buffer
  for (let day = studyDays; day < dayCount; day += 1) {
    const date = addDaysIso(todayIso, day)
    const taskId = `curated_partb29_review_${date}`
    if (existing.has(taskId)) continue
    proposedTasks.push({
      id: taskId,
      title: day === dayCount - 1
        ? 'ทบทวนภาค ข (เอก+การศึกษา+กฎหมาย) + ไล่จุดอ่อนภาค ก'
        : 'วันทบทวนแพ็ก 29 วัน — ย้อนจุดอ่อนภาค ข',
      plannedDate: date,
      status: 'pending',
      origin: PART_B_29_ORIGIN,
      examPart: 'mixed',
      subjectId: 'unknown',
      resourceId: null,
      resourceUrl: '',
      urlStatus: 'unchecked',
      estimatedMinutes: dailyMinutes,
      durationMinutes: dailyMinutes,
      durationIsEstimate: true,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 1,
      priorityMode: mode,
      reasonTh: `กัน ${reviewBufferDays} วันทบทวนก่อนสอบภาค ก ${examAIso} / ภาค ข ${examBIso}`,
      reasonCodes: ['review-buffer', 'part-b-29-forced'],
      planPack: 'part-b-29',
    })
  }

  const scheduledResourceIds = new Set(
    proposedTasks.filter(t => t.resourceId).map(t => String(t.resourceId)),
  )
  const partBMustInPack = pack.partBQueue.filter(e => e.score.tier === PRIORITY_TIERS.MUST)
  const partBMustScheduled = partBMustInPack.filter(e => scheduledResourceIds.has(String(e.row.id)))
  const partBMustLeft = partBMustInPack.filter(e => !scheduledResourceIds.has(String(e.row.id)))

  const bySubject = {}
  for (const subjectId of Object.keys(PART_B_29_CAPS)) {
    const tasks = proposedTasks.filter(t => t.subjectId === subjectId)
    bySubject[subjectId] = {
      scheduled: tasks.length,
      minutes: tasks.reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0),
      packKept: pack.packs[subjectId]?.kept.length || 0,
      packCut: pack.packs[subjectId]?.cut.length || 0,
    }
  }

  const partBCoverageOk = partBMustLeft.length === 0
    && bySubject[SUBJECT_IDS.EDUCATION]?.scheduled > 0
    && bySubject[SUBJECT_IDS.LAW]?.scheduled > 0
    && bySubject[SUBJECT_IDS.ENGLISH_MAJOR]?.scheduled > 0

  const liveTasks = proposedTasks.filter(t => t.origin === 'live-tutor-schedule')
  const curatedTasks = proposedTasks.filter(t => t.resourceId)

  return {
    version: PART_B_29_PLAN_VERSION,
    planKind: 'part-b-29-forced',
    todayIso,
    examPartA: examAIso,
    examPartB: examBIso,
    dayCount,
    dayTarget,
    studyDays,
    reviewBufferDays,
    dailyMinutes,
    dailyMinutesIsDefault: !(Number(options.dailyMinutes) > 0),
    mode,
    modeLabelTh: PRIORITY_MODE_LABELS_TH[mode],
    proposedTasks,
    packSummary: pack.summary,
    bySubject,
    cutPolicy,
    cutList: pack.cutList,
    cutSample: pack.cutList.slice(0, 16),
    partBMustInPack: partBMustInPack.length,
    partBMustScheduled: partBMustScheduled.length,
    partBMustLeft: partBMustLeft.length,
    partBCoverageOk,
    liveSchedule: {
      taskCount: liveTasks.length,
      liveCount: liveTasks.filter(t => t.liveKind === 'live').length,
      contentBlockCount: liveTasks.filter(t => t.liveKind === 'content-block').length,
      notesTh: liveDraft.notesTh,
    },
    unscheduled: {
      partBPackLeft: remainingB.length,
      partAPackLeft: remainingA.length,
      partBMustLeft: partBMustLeft.length,
    },
    limitationsTh: [
      'ไม่ได้ตัดเพราะคาดว่าไม่ออกสอบ — ไม่มีสถิติความถี่ในระบบ',
      'เพดานวิชาอิงคะแนนหลักสูตร ก.ค.ศ. ไม่ใช่น้ำหนักรายข้อ',
      'URL unchecked / needs_full_url ยังไม่ใช่ verified_accessible',
      'english-skills-a (ภาค ก) ≠ english-major (ภาค ข)',
      'ข้าราชการที่ดี = ภาค ก — ไม่ปนกับกฎหมายภาค ข',
    ],
    notesTh: [
      `แผนบังคับภาค ข ${dayCount} วัน · งบ ≈ ${dailyMinutes} นาที/วัน`,
      `แพ็กภาค ข ${pack.summary.partBItems} ตอน ≈ ${pack.summary.partBMinutes} นาที · ภาค ก เติม ${pack.summary.partAItems} ตอน ≈ ${pack.summary.partAMinutes} นาที`,
      `ตัดออกจากแพ็กนี้ ${pack.summary.cutItems} ตอน (ยังอยู่ในคลัง) ≈ ${pack.summary.cutMinutes} นาที`,
      `ปักหมุดไลฟ์/บล็อกเนื้อหาจากโปสเตอร์ ${liveTasks.length} งาน (เย็น ไม่แย่งงบกลางวัน) · คลิปคลัง ${curatedTasks.length} งาน`,
      partBCoverageOk
        ? 'จัด must ในแพ็กภาค ข ได้ครบภายใต้งบ (ตามการประมาณ)'
        : `ยังจัด must ภาค ข ในแพ็กไม่ครบ ${partBMustLeft.length} รายการ — งบ/วันไม่พอหรือชนงานเดิม`,
      'ผสานแบบเพิ่มเท่านั้น — ไม่ทับ done / userEdited',
    ],
  }
}

/**
 * Merge Part-B-29 draft using the same add-only rules as unified plan.
 */
export function mergePartB29DraftIntoSchedule(schedule, draft) {
  return mergeUnifiedDraftIntoSchedule(schedule, draft)
}

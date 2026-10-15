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

export const PART_B_29_PLAN_VERSION = '1.0-part-b-forced'
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
  [SUBJECT_IDS.MATH]: { maxItems: 3, maxMinutes: 180, examPart: 'ก' },
  [SUBJECT_IDS.GENERAL_KNOWLEDGE_A]: { maxItems: 8, maxMinutes: 280, examPart: 'ก' },
})

/**
 * Prefer these ids when present (skill / early foundation / docs).
 * Soft preference only — still subject to caps and ranking.
 */
const PREFER_IDS = Object.freeze(new Set([
  // Major: early sessions + skill parts + early practice
  'eng-major-share-018',
  'eng-major-share-017',
  'eng-major-share-016',
  'eng-major-share-015',
  'eng-major-share-014',
  'eng-major-share-013',
  'eng-major-share-011',
  'eng-major-share-001',
  'eng-major-share-002',
  'eng-major-share-003',
  'eng-major-share-012',
  'eng-major-share-019',
  // Education: keep analysis doc + core lessons first
  'edu-special-analysis-doc',
  'edu-spth69-01',
  'edu-spth69-02',
  'edu-spth69-03',
  'edu-live-01',
  'edu-live-02',
  // Law: teacher-law core + one civil + usable docs
  'law-teacher-special-34-doc',
  'law-teacher-live-01',
  'law-teacher-01',
  'law-teacher-02',
  'law-civil-01',
  'law-teacher-special-12-doc',
  // Part ก slim
  'eng-skills-share-001',
  'eng-skills-share-002',
  'eng-skills-share-003',
  'eng-skills-share-004',
  'math-spth69-01',
  'math-spth69-02',
  'math-spth69-03',
  'thai-doc-principles',
  'thai-doc-reading',
  'thai-doc-usage',
  'thai-yt-drill-1',
  'thai-yt-drill-2',
  'thai-yt-idiom',
  'thai-yt-spelling',
  'thai-reading-set-01',
]))

/**
 * Explicit deprioritize (duplicates, bare FB links, long live when docs exist, late reading).
 * Still kept in library — only excluded from this 29-day forced pack.
 */
const DEPRIORITIZE_IDS = Object.freeze(new Set([
  // Major: late / duplicate แหกโค้ง + bare share links
  'eng-major-share-004',
  'eng-major-share-005',
  'eng-major-share-006',
  'eng-major-share-007',
  'eng-major-share-008',
  'eng-major-share-009',
  'eng-major-share-010',
  'eng-major-share-020',
  'eng-major-share-021',
  'eng-major-share-022',
  'eng-major-share-025',
  'eng-major-share-026',
  'eng-major-share-028',
  'eng-major-share-029',
  'eng-major-share-030',
  'eng-major-share-031',
  'eng-major-share-032',
  // Law: secondary civil beyond cap
  'law-civil-03',
  // Skills A: hype ep beyond first four practice
  'eng-skills-share-005',
  // Thai: long lives + late reading sets (budget)
  'thai-live-01',
  'thai-live-02',
  'thai-live-03',
  'thai-live-04',
  'thai-live-05',
  'thai-live-06',
  'thai-live-07',
  'thai-live-08',
  'thai-reading-set-03',
  'thai-reading-set-04',
  'thai-reading-set-05',
  'thai-reading-set-06',
  'thai-reading-set-07',
  'thai-yt-loanwords',
  'thai-yt-royal',
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
        titleTh: 'วิชาเอกอังกฤษ — ตัดตอนซ้ำชุดแหกโค้ง / ลิงก์แชร์เปล่า',
        reasonTh: 'งบไม่พอเก็บ must ทั้ง 19 ตอน (≈1710 นาที) · เหลือประมาณ 12 ตอนที่เน้นพื้นฐาน Grammar/Vocab/Conversation + ข้อสอบจริงช่วงต้น',
        exampleIds: [
          'eng-major-share-004',
          'eng-major-share-025',
          'eng-major-share-028',
          'eng-major-share-029',
        ],
      },
      {
        id: 'law-slim',
        titleTh: 'กฎหมาย — คงแกนกฎหมายครู + เอกสารที่ใช้ได้ · ตัดตอนข้าราชการที่ดีรอง',
        reasonTh: 'หมวดกฎหมายภาค ข มีแค่ 25 คะแนน · เก็บประมาณ 6 ตอน (≈300 นาที) พอสำหรับแกน พ.ร.บ./รัฐธรรมนูญ',
        exampleIds: ['law-civil-03'],
      },
      {
        id: 'edu-keep',
        titleTh: 'วิชาการศึกษา — ไม่ตัด must หลัก',
        reasonTh: 'ต้องเก็บทั้งเอกสารวิเคราะห์ + 3 ตอนหลัก + ไลฟ์ 2 (≈315 นาที) เพราะหมวดนี้ 75 คะแนน',
        exampleIds: [],
      },
      {
        id: 'part-a-slim',
        titleTh: 'ภาค ก — ตัดไลฟ์ยาวภาษาไทย / ชุดอ่านท้าย / เก็งอังกฤษเกินงบ',
        reasonTh: 'บังคับภาค ข ก่อน · ภาค ก เหลือช่องว่างจึงเก็บเอกสารไทยสั้น + อังกฤษภาค ก 4 ตอนแรก + คณิต 3 ตอน',
        exampleIds: [
          'thai-live-01',
          'thai-live-02',
          'thai-live-03',
          'thai-reading-set-06',
          'eng-skills-share-005',
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

  const partBQueue = [...pack.partBQueue]
  const partAQueue = [...pack.partAQueue]
  const proposedTasks = []
  let bIdx = 0
  let aIdx = 0

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
        reasonExtraTh,
        entry.score.reasonTh,
      ].filter(Boolean).join(' · '),
      reasonCodes: [...new Set([...(entry.score.reasonCodes || []), 'part-b-29-forced'])],
      planPack: 'part-b-29',
    })
    return minutes
  }

  // Phase 1: Part ข only until pack drained (or study days end).
  for (let day = 0; day < studyDays && bIdx < partBQueue.length; day += 1) {
    const date = addDaysIso(todayIso, day)
    let budget = Math.max(0, dailyMinutes - (committed.get(date) || 0))
    while (budget > 0 && bIdx < partBQueue.length) {
      const entry = partBQueue[bIdx]
      const minutes = estimateMinutes(entry.row)
      const dayHasWork = (committed.get(date) || 0) > 0
        || proposedTasks.some(t => t.plannedDate === date)
      if (minutes > budget && dayHasWork) break
      if (minutes > budget && !dayHasWork && budget < dailyMinutes) break
      const used = pushTask(entry, date, 'จัดก่อนภาค ก')
      if (used === false) {
        bIdx += 1
        continue
      }
      budget -= used
      bIdx += 1
    }
  }

  // Phase 2: fill remaining study-day budget with slim Part ก, then any leftover Part ข.
  for (let day = 0; day < studyDays; day += 1) {
    const date = addDaysIso(todayIso, day)
    let budget = Math.max(0, dailyMinutes - (committed.get(date) || 0))
    budget -= proposedTasks
      .filter(t => t.plannedDate === date)
      .reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0)
    if (budget <= 0) continue

    // Prefer Part ก filler once Part ข for earlier days is placed; still drain leftover ข first if any.
    while (budget > 0 && bIdx < partBQueue.length) {
      const entry = partBQueue[bIdx]
      const minutes = estimateMinutes(entry.row)
      const dayHasWork = proposedTasks.some(t => t.plannedDate === date) || (committed.get(date) || 0) > 0
      if (minutes > budget && dayHasWork) break
      const used = pushTask(entry, date, 'ส่วนที่เหลือของแพ็กภาค ข')
      if (used === false) {
        bIdx += 1
        continue
      }
      budget -= used
      bIdx += 1
    }
    while (budget > 0 && aIdx < partAQueue.length) {
      const entry = partAQueue[aIdx]
      const minutes = estimateMinutes(entry.row)
      const dayHasWork = proposedTasks.some(t => t.plannedDate === date) || (committed.get(date) || 0) > 0
      if (minutes > budget && dayHasWork) break
      const used = pushTask(entry, date, 'เติมภาค กหลังบังคับภาค ข')
      if (used === false) {
        aIdx += 1
        continue
      }
      budget -= used
      aIdx += 1
    }
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
    unscheduled: {
      partBPackLeft: partBQueue.length - bIdx,
      partAPackLeft: partAQueue.length - aIdx,
      partBMustLeft: partBMustLeft.length,
    },
    limitationsTh: [
      'ไม่ได้ตัดเพราะคาดว่าไม่ออกสอบ — ไม่มีสถิติความถี่ในระบบ',
      'เพดานวิชาอิงคะแนนหลักสูตร ก.ค.ศ. ไม่ใช่น้ำหนักรายข้อ',
      'URL unchecked / needs_full_url ยังไม่ใช่ verified_accessible',
      'english-skills-a (ภาค ก) ≠ english-major (ภาค ข)',
    ],
    notesTh: [
      `แผนบังคับภาค ข ${dayCount} วัน · งบ ≈ ${dailyMinutes} นาที/วัน`,
      `แพ็กภาค ข ${pack.summary.partBItems} ตอน ≈ ${pack.summary.partBMinutes} นาที · ภาค ก เติม ${pack.summary.partAItems} ตอน ≈ ${pack.summary.partAMinutes} นาที`,
      `ตัดออกจากแพ็กนี้ ${pack.summary.cutItems} ตอน (ยังอยู่ในคลัง) ≈ ${pack.summary.cutMinutes} นาที`,
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

/**
 * แผนพาบรรจุ 100 — controllable readiness levers.
 *
 * 100/100 = แผนพร้อมรบเต็มเกราะ (ทุกช่องว่างที่ควบคุมได้ถูกปิด)
 * ไม่ใช่การการันตีผลสอบ — ผลสอบมาจากความเชื่อ + พยายาม รันแผนนี้ให้ครบ
 */

import { SUBJECT_IDS } from '../study/taxonomy.js'
import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import { getExams } from '../../data/examCalendar.js'
import { enrichCuratedResources } from './catalog.js'
import {
  generatePartB29Draft,
  mergePartB29DraftIntoSchedule,
  PART_B_29_ORIGIN,
} from './partB29Plan.js'
import { LIVE_SCHEDULE_ORIGIN, resolveLadyLiveConflicts } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'
import { classifyResourceUrl, URL_STATUS } from './urlStatus.js'

export const VICTORY_PLAN_VERSION = '1.0-belief-effort-100'
export const VICTORY_PLAN_ORIGIN = 'victory-plan-100'
export const VICTORY_META_KEY = 'victoryPlan'
export const VICTORY_SEED_META_KEY = 'victoryPlanSeededAt'

/** Drive stubs that still need full URLs — effort substitute closes the lever. */
export const VICTORY_DRIVE_AWAITING = Object.freeze([
  {
    id: 'edu-nonn-analysis-key',
    substituteIds: ['edu-nonn-analysis-doc', 'edu-nonn-01', 'edu-nonn-02'],
    titleTh: 'Drive เฉลยวิเคราะห์การศึกษา — ทบทวนทดแทนด้วยเอกสาร/ตอนที่เปิดได้',
  },
  {
    id: 'law-nonn-special-12-doc',
    substituteIds: ['law-nonn-special-34-doc', 'law-nonn-01', 'law-nonn-02'],
    titleTh: 'Drive เอกสารกฎหมายพิเศษ 1–2 — ทบทวนทดแทนด้วยเอกสารที่เปิดได้',
  },
  {
    id: 'law-nonn-special-34-key',
    substituteIds: ['law-nonn-redbook-key', 'law-nonn-04', 'law-nonn-07'],
    titleTh: 'Drive เฉลยกฎหมายพิเศษ 3–4 — ทบทวนทดแทนด้วยเล่มแดง/ตอนแกน',
  },
  {
    id: 'civil-nonn-redbook-key',
    substituteIds: ['civil-kongbeng-01', 'civil-nonn-01', 'civil-nonn-03'],
    titleTh: 'Drive เฉลยข้าราชการที่ดี — ทบทวนทดแทนด้วยขงเบ้ง/อ.นนท์แกน',
  },
])

/**
 * Controllable levers. Weights sum to 100.
 * Plan-structure levers auto-complete when schedule is victory-shaped.
 * Effort levers complete when user marks done / substitute done.
 */
export const VICTORY_LEVERS = Object.freeze([
  {
    id: 'part_b_force',
    weight: 14,
    kind: 'plan',
    titleTh: 'บังคับภาค ข (เอก + การศึกษา + กฎหมาย)',
    beliefTh: 'คะแนนเอกตัดสินชะตา — จัดก่อนทุกอย่าง',
  },
  {
    id: 'lady_lives',
    weight: 14,
    kind: 'plan',
    titleTh: 'ไลฟ์เลดี้เก๋เก๋ ก+ข ปักครบ + ชนเวลาแล้วให้เลดี้ชนะ',
    beliefTh: 'คืนแหกโค้ง/หมาหอน/เอก = ห้ามพลาด',
  },
  {
    id: 'thai_force',
    weight: 12,
    kind: 'plan',
    titleTh: 'บังคับภาษาไทยครบ 6 ตอน',
    beliefTh: 'ภาค ก ไม่ปล่อยช่องว่าง — ไทยต้องครบ',
  },
  {
    id: 'math_force',
    weight: 12,
    kind: 'plan',
    titleTh: 'บังคับคณิต/เหตุผลอย่างน้อย 8 ตอน',
    beliefTh: 'ตัวเลขฝึกได้ด้วยพยายาม — ทำซ้ำจนชิน',
  },
  {
    id: 'civil_core',
    weight: 8,
    kind: 'plan',
    titleTh: 'ข้าราชการที่ดีแกนครบในแผน',
    beliefTh: '50 คะแนนภาค ก ที่หลายคนมองข้าม',
  },
  {
    id: 'conflict_clear',
    weight: 10,
    kind: 'plan',
    titleTh: 'ไม่มีชนเวลากับไลฟ์เลดี้ (VIP/ออนไลน์ถูกเลื่อนเป็นทบทวนกลางวัน)',
    beliefTh: 'เลือกศึกให้ถูก — ไลฟ์สดมาก่อน คลิปตามทีหลัง',
  },
  {
    id: 'weekly_mocks',
    weight: 10,
    kind: 'plan',
    titleTh: 'จุดตรวจ mock รายสัปดาห์ถึงวันสอบ',
    beliefTh: 'วัดผลบ่อย = รู้จุดอ่อนเร็ว = พลิกเกมได้',
  },
  {
    id: 'drive_effort',
    weight: 12,
    kind: 'plan',
    titleTh: 'ปิดช่อง Drive 4 ไฟล์ด้วยเส้นทางทบทวนทดแทน (ทำได้แม้ลิงก์ค้าง)',
    beliefTh: 'สิ่งที่เป็นไปไม่ได้ → กลายเป็นงานที่เปิดคลิปแทนได้',
  },
  {
    id: 'belief_streak',
    weight: 8,
    kind: 'effort',
    titleTh: 'ยืนยันความเชื่อ + พยายาม (หรือ streak ครบ 7 วัน)',
    beliefTh: 'กดยืนยันแล้วรันแผนทุกวัน — 100 คือคำสัญญาที่คุณถือ',
  },
])

function isoDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d)
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

function parseMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(String(t))) return null
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false
  let ae = aEnd
  let be = bEnd
  if (ae <= aStart) ae += 24 * 60
  if (be <= bStart) be += 24 * 60
  return aStart < be && bStart < ae
}

export { resolveLadyLiveConflicts }

/**
 * Weekly mock checkpoint tasks until Part ก exam.
 * @param {{ todayIso: string, existingIds?: Set<string> }} options
 */
export function buildWeeklyMockTasks(options) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const existing = options.existingIds || new Set()
  const exams = getExams()
  const examA = exams.find((e) => e.part === 'ก') || exams[0]
  const examAIso = String(examA?.startsAt || '').slice(0, 10)
  const span = daysBetween(todayIso, examAIso)
  const tasks = []
  // First mock this Sunday-ish: every 7 days from today+6, and final day before exam.
  for (let offset = 6; offset < span; offset += 7) {
    const date = addDaysIso(todayIso, offset)
    if (date >= examAIso) break
    const week = Math.floor(offset / 7)
    const part = week % 2 === 0 ? 'ข' : 'ก'
    const id = `victory_mock_${date}`
    if (existing.has(id) || tasks.some((t) => t.id === id)) continue
    tasks.push({
      id,
      title: part === 'ข'
        ? 'จุดตรวจ mock ภาค ข — เอก+การศึกษา+กฎหมาย (จับเวลา)'
        : 'จุดตรวจ mock ภาค ก — อังกฤษ+ไทย+คณิต+ข้าราชการที่ดี (จับเวลา)',
      plannedDate: date,
      status: 'pending',
      origin: VICTORY_PLAN_ORIGIN,
      examPart: part,
      subjectId: part === 'ข' ? SUBJECT_IDS.ENGLISH_MAJOR : SUBJECT_IDS.ENGLISH_SKILLS_A,
      estimatedMinutes: 90,
      durationMinutes: 90,
      durationIsEstimate: true,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.95,
      reasonTh: 'แผนพาบรรจุ 100 · mock รายสัปดาห์ = วัดความเชื่อด้วยผลจริง',
      reasonCodes: ['victory-weekly-mock'],
      planPack: 'victory-mock',
      victoryLever: 'weekly_mocks',
    })
  }
  const finalDate = addDaysIso(examAIso, -1)
  if (finalDate >= todayIso) {
    const id = `victory_mock_final_${finalDate}`
    if (!existing.has(id) && !tasks.some((t) => t.id === id)) {
      tasks.push({
        id,
        title: 'จุดตรวจสุดท้ายก่อนสอบ — ไล่จุดอ่อนทุกหมวด + พักสมอง',
        plannedDate: finalDate,
        status: 'pending',
        origin: VICTORY_PLAN_ORIGIN,
        examPart: 'mixed',
        subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
        estimatedMinutes: 120,
        durationMinutes: 120,
        durationIsEstimate: true,
        priorityTier: PRIORITY_TIERS.MUST,
        priorityScore: 0.99,
        reasonTh: 'แผนพาบรรจุ 100 · คืนสุดท้ายก่อนภาค ก',
        reasonCodes: ['victory-final-mock'],
        planPack: 'victory-mock',
        victoryLever: 'weekly_mocks',
      })
    }
  }
  return tasks
}

/**
 * Effort-substitute tasks for incomplete Drive URLs.
 * @param {{ todayIso: string, existingIds?: Set<string>, catalog?: ReturnType<typeof enrichCuratedResources> }} options
 */
export function buildDriveEffortTasks(options) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const existing = options.existingIds || new Set()
  const catalog = options.catalog || enrichCuratedResources()
  const byId = new Map(catalog.map((r) => [r.id, r]))
  const tasks = []

  VICTORY_DRIVE_AWAITING.forEach((slot, index) => {
    const stub = byId.get(slot.id)
    const stillIncomplete = !stub || classifyResourceUrl(stub.url).status === URL_STATUS.NEEDS_FULL_URL
    if (!stillIncomplete) return

    const sub = slot.substituteIds.map((id) => byId.get(id)).find((r) => r && r.canOpen)
    const date = addDaysIso(todayIso, Math.min(2 + index * 3, 20))
    const id = `victory_drive_${slot.id}`
    if (existing.has(id) || tasks.some((t) => t.id === id)) return

    tasks.push({
      id,
      title: slot.titleTh,
      plannedDate: date,
      status: 'pending',
      origin: VICTORY_PLAN_ORIGIN,
      examPart: stub?.examPart || 'ข',
      subjectId: stub?.subjectId || SUBJECT_IDS.EDUCATION,
      resourceId: sub?.id || null,
      resourceUrl: sub?.safeUrl || sub?.url || '',
      originalUrl: sub?.originalUrl || sub?.url || '',
      urlStatus: sub?.urlStatus || 'unchecked',
      tutorTh: sub?.tutorTh || 'อ.นนท์',
      estimatedMinutes: 45,
      durationMinutes: 45,
      durationIsEstimate: true,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.88,
      reasonTh: 'แผนพาบรรจุ 100 · ลิงก์ Drive ค้าง → ทบทวนทดแทนด้วยคลิปที่เปิดได้ (ความเชื่อ+พยายาม)',
      reasonCodes: ['victory-drive-effort', slot.id],
      planPack: 'victory-drive',
      victoryLever: 'drive_effort',
      driveStubId: slot.id,
    })
  })
  return tasks
}

/**
 * Force-insert missing Thai/Math curated rows onto lightest days.
 * @param {object} draft from generatePartB29Draft
 * @param {{ todayIso: string, catalog?: object[] }} options
 */
export function forceThaiMathIntoDraft(draft, options = {}) {
  const todayIso = options.todayIso || draft.todayIso || bangkokTodayIso()
  const catalog = options.catalog || enrichCuratedResources()
  const tasks = [...(draft.proposedTasks || [])]
  const scheduledResourceIds = new Set(
    tasks.map((t) => t.resourceId).filter(Boolean).map(String),
  )
  const existingIds = new Set(tasks.map((t) => t.id))

  const thaiNeed = catalog.filter(
    (r) => r.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A && String(r.id).startsWith('thai-yt-'),
  )
  const mathNeed = catalog.filter(
    (r) => r.subjectId === SUBJECT_IDS.MATH && /^math-num-0[1-8]$/.test(String(r.id)),
  )

  const pickLightDate = (preferSubject) => {
    const load = new Map()
    for (let i = 0; i < (draft.dayCount || 29); i += 1) {
      const d = addDaysIso(todayIso, i)
      if (d >= String(draft.examAIso || '2026-11-14')) break
      load.set(d, 0)
    }
    for (const t of tasks) {
      if (!load.has(t.plannedDate)) continue
      load.set(t.plannedDate, (load.get(t.plannedDate) || 0) + (Number(t.estimatedMinutes) || 0))
    }
    // Prefer VIP focus days for that subject when present
    const preferred = [...load.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    void preferSubject
    return preferred[0]?.[0] || todayIso
  }

  const insert = (row, reasonTh) => {
    if (!row || scheduledResourceIds.has(String(row.id))) return false
    const taskId = `curated_${row.id}`
    if (existingIds.has(taskId)) return false
    const date = pickLightDate(row.subjectId)
    const minutes = Number(row.estimatedMinutes) || 45
    tasks.push({
      id: taskId,
      title: row.title,
      plannedDate: date,
      status: 'pending',
      origin: PART_B_29_ORIGIN,
      examPart: row.examPart,
      subjectId: row.subjectId,
      resourceId: row.id,
      resourceUrl: row.safeUrl || row.url || '',
      originalUrl: row.originalUrl || row.url || '',
      urlStatus: row.urlStatus || 'unchecked',
      tutorTh: row.tutorTh || '',
      estimatedMinutes: minutes,
      durationMinutes: minutes,
      durationIsEstimate: true,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.92,
      reasonTh,
      reasonCodes: ['victory-force-part-a', row.subjectId],
      planPack: 'victory-force',
      victoryForced: true,
    })
    scheduledResourceIds.add(String(row.id))
    existingIds.add(taskId)
    return true
  }

  let thaiAdded = 0
  let mathAdded = 0
  for (const row of thaiNeed) {
    if (insert(row, 'แผนพาบรรจุ 100 · บังคับภาษาไทยครบชุด')) thaiAdded += 1
  }
  for (const row of mathNeed) {
    if (insert(row, 'แผนพาบรรจุ 100 · บังคับคณิต/เหตุผลแกน 8 ตอน')) mathAdded += 1
  }

  return {
    ...draft,
    proposedTasks: tasks,
    victoryForce: { thaiAdded, mathAdded, thaiTarget: thaiNeed.length, mathTarget: mathNeed.length },
  }
}

/**
 * Score controllable readiness from schedule + meta.
 * @param {object} schedule
 * @param {{ todayIso?: string }} [options]
 */
export function scoreVictoryReadiness(schedule, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const tasks = schedule?.tasks || []
  const meta = schedule?.meta?.[VICTORY_META_KEY] || {}
  const effort = meta.effort || {}

  const curated = tasks.filter((t) => String(t.id || '').startsWith('curated_'))
  const ladyLives = tasks.filter(
    (t) => t.liveKind === 'live' && String(t.liveEventId || '').startsWith('lady-'),
  )
  const thaiCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.GENERAL_KNOWLEDGE_A).length
  const mathCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.MATH).length
  const civilCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.CIVIL_SERVANT_A).length
  const majorCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.ENGLISH_MAJOR).length
  const eduCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.EDUCATION).length
  const lawCount = curated.filter((t) => t.subjectId === SUBJECT_IDS.LAW).length
  const mocks = tasks.filter((t) => t.planPack === 'victory-mock' || String(t.id || '').startsWith('victory_mock_'))
  const driveEffort = tasks.filter((t) => t.planPack === 'victory-drive')
  const driveDone = driveEffort.filter((t) => t.status === 'done').length
    + Number(effort.driveSubstitutesDone || 0)
  const unresolvedConflict = tasks.some(
    (t) => t.liveKind === 'content-block'
      && t.startTime
      && ladyLives.some((live) => (
        live.plannedDate === t.plannedDate
        && rangesOverlap(
          parseMinutes(live.startTime),
          parseMinutes(live.endTime),
          parseMinutes(t.startTime),
          parseMinutes(t.endTime),
        )
      )),
  )

  // Streak of completed days with any victory/curated work
  const byDate = new Map()
  for (const t of tasks) {
    if (!t.plannedDate || t.plannedDate > todayIso) continue
    if (!(String(t.id || '').startsWith('curated_')
      || String(t.id || '').startsWith('live_')
      || String(t.origin || '').startsWith('victory')
      || t.origin === PART_B_29_ORIGIN
      || t.origin === LIVE_SCHEDULE_ORIGIN
      || t.origin === VICTORY_PLAN_ORIGIN)) continue
    if (!byDate.has(t.plannedDate)) byDate.set(t.plannedDate, { total: 0, done: 0 })
    const row = byDate.get(t.plannedDate)
    row.total += 1
    if (t.status === 'done') row.done += 1
  }
  const dates = [...byDate.keys()].sort()
  let streak = 0
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const d = dates[i]
    const row = byDate.get(d)
    if (row.total > 0 && row.done === row.total) streak += 1
    else break
  }
  const beliefOk = streak >= 7 || effort.beliefCommitted === true

  const checks = {
    part_b_force: majorCount >= 8 && eduCount >= 4 && lawCount >= 4,
    lady_lives: ladyLives.length >= 10,
    thai_force: thaiCount >= 6,
    math_force: mathCount >= 8,
    civil_core: civilCount >= 3,
    conflict_clear: ladyLives.length > 0 && !unresolvedConflict,
    weekly_mocks: mocks.length >= 3,
    drive_effort: driveEffort.length >= VICTORY_DRIVE_AWAITING.length
      || driveDone >= VICTORY_DRIVE_AWAITING.length,
    belief_streak: beliefOk,
  }

  const levers = VICTORY_LEVERS.map((lever) => {
    const done = Boolean(checks[lever.id])
    return {
      ...lever,
      done,
      earned: done ? lever.weight : 0,
      detailTh: detailForLever(lever.id, {
        majorCount, eduCount, lawCount, thaiCount, mathCount, civilCount,
        ladyLives: ladyLives.length, mocks: mocks.length,
        driveDone, driveScheduled: driveEffort.length,
        driveTotal: VICTORY_DRIVE_AWAITING.length,
        streak, unresolvedConflict, beliefOk,
      }),
    }
  })

  const score = levers.reduce((s, l) => s + l.earned, 0)
  const planStructureScore = levers
    .filter((l) => l.kind === 'plan')
    .reduce((s, l) => s + l.earned, 0)
  const planStructureMax = levers
    .filter((l) => l.kind === 'plan')
    .reduce((s, l) => s + l.weight, 0)

  return {
    version: VICTORY_PLAN_VERSION,
    score,
    max: 100,
    isPerfect: score >= 100,
    planStructureScore,
    planStructureMax,
    levers,
    nextActionsTh: levers.filter((l) => !l.done).map((l) => l.titleTh),
    creedTh: 'สิ่งที่เป็นไปไม่ได้ จะเป็นไปได้ เพราะความเชื่อและพยายาม — 100 คือแผนพร้อมรบ + คุณรันให้ครบ',
  }
}

function detailForLever(id, s) {
  switch (id) {
    case 'part_b_force':
      return `เอก ${s.majorCount} · การศึกษา ${s.eduCount} · กฎหมาย ${s.lawCount}`
    case 'lady_lives':
      return `ไลฟ์เลดี้ ${s.ladyLives} คืน`
    case 'thai_force':
      return `ไทยในแผน ${s.thaiCount}/6`
    case 'math_force':
      return `คณิตในแผน ${s.mathCount}/8`
    case 'civil_core':
      return `ข้าราชการที่ดี ${s.civilCount}`
    case 'conflict_clear':
      return s.unresolvedConflict ? 'ยังชนเวลาไลฟ์' : 'เคลียร์แล้ว'
    case 'weekly_mocks':
      return `จุดตรวจ ${s.mocks}`
    case 'drive_effort':
      return `เส้นทางทดแทน ${s.driveScheduled}/${s.driveTotal} · ทำแล้ว ${s.driveDone}`
    case 'belief_streak':
      return s.beliefOk ? 'ยืนยันความมุ่งมั่นแล้ว' : `streak ${s.streak}/7 วัน`
    default:
      return ''
  }
}

/**
 * Build full victory-enhanced draft (Part B 29 + force Thai/Math + conflict resolve + mocks + Drive effort).
 */
export function generateVictoryDraft(options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  let draft = generatePartB29Draft({
    ...options,
    todayIso,
    dailyMinutes: options.dailyMinutes || 150,
  })
  draft = forceThaiMathIntoDraft(draft, { todayIso })

  const resolved = resolveLadyLiveConflicts(draft.proposedTasks || [])
  draft = { ...draft, proposedTasks: resolved.tasks, conflictsDemoted: resolved.demotedIds }

  const existing = new Set([
    ...(options.existingTaskIds || []).map(String),
    ...draft.proposedTasks.map((t) => t.id),
  ])
  const mocks = buildWeeklyMockTasks({ todayIso, existingIds: existing })
  for (const t of mocks) existing.add(t.id)
  const driveTasks = buildDriveEffortTasks({
    todayIso,
    existingIds: existing,
    catalog: options.catalog || enrichCuratedResources(),
  })

  const proposedTasks = [...draft.proposedTasks, ...mocks, ...driveTasks]
  return {
    ...draft,
    proposedTasks,
    victory: {
      version: VICTORY_PLAN_VERSION,
      conflictsDemoted: resolved.demotedIds,
      mockCount: mocks.length,
      driveEffortCount: driveTasks.length,
      force: draft.victoryForce,
      creedTh: 'สิ่งที่เป็นไปไม่ได้ จะเป็นไปได้ เพราะความเชื่อและพยายาม',
    },
    notesTh: [
      ...(draft.notesTh || []),
      'แผนพาบรรจุ 100: บังคับไทย+คณิต · ไลฟ์เลดี้ชนะเมื่อชนเวลา · mock รายสัปดาห์ · ทบทวนทดแทน Drive',
    ],
  }
}

/**
 * Merge victory draft into schedule and stamp meta.
 */
export function mergeVictoryDraftIntoSchedule(schedule, draft) {
  const merged = mergePartB29DraftIntoSchedule(schedule, draft)
  const scored = scoreVictoryReadiness(merged, { todayIso: draft.todayIso })
  return {
    ...merged,
    meta: {
      ...merged.meta,
      [VICTORY_SEED_META_KEY]: new Date().toISOString(),
      [VICTORY_META_KEY]: {
        version: VICTORY_PLAN_VERSION,
        lastScoredAt: new Date().toISOString(),
        lastScore: scored.score,
        effort: merged.meta?.[VICTORY_META_KEY]?.effort || {},
        creedTh: scored.creedTh,
      },
      curatedPlanSeedVersion: VICTORY_PLAN_VERSION,
    },
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Toggle effort lever completion in schedule meta.
 */
export function setVictoryEffort(schedule, patch) {
  const prev = schedule?.meta?.[VICTORY_META_KEY] || {}
  const effort = { ...(prev.effort || {}), ...patch }
  const next = {
    ...schedule,
    meta: {
      ...schedule.meta,
      [VICTORY_META_KEY]: {
        ...prev,
        effort,
        lastScoredAt: new Date().toISOString(),
      },
    },
    updatedAt: new Date().toISOString(),
  }
  const scored = scoreVictoryReadiness(next)
  next.meta[VICTORY_META_KEY].lastScore = scored.score
  return { schedule: next, readiness: scored }
}

/**
 * Tasks owned by curated / live / victory plans (force-regen targets).
 * @param {object} task
 */
export function isVictoryManagedTask(task) {
  if (!task) return false
  const id = String(task.id || '')
  const origin = String(task.origin || '')
  if (id.startsWith('curated_') || id.startsWith('live_') || id.startsWith('victory_')) return true
  return origin === 'curated-unified-plan'
    || origin === PART_B_29_ORIGIN
    || origin === LIVE_SCHEDULE_ORIGIN
    || origin === VICTORY_PLAN_ORIGIN
}

/**
 * Protected managed rows: never wipe on force regen (same spirit as AI apply).
 * @param {object} task
 */
export function isProtectedManagedTask(task) {
  if (!isVictoryManagedTask(task)) return false
  return task.status === 'done' || task.userEdited === true
}

/**
 * Force-regen keep set: non-managed tasks + protected managed (done / userEdited).
 * Pending unmanaged plan rows are dropped so a fresh draft can be merged.
 * @param {Array<object>} tasks
 */
export function retainTasksForForceRegen(tasks) {
  return (tasks || []).filter((t) => !isVictoryManagedTask(t) || isProtectedManagedTask(t))
}

/**
 * Read-only impact preview for force regen. Never mutates schedule.
 * @param {object} schedule
 */
export function buildForceRegenPreview(schedule) {
  const tasks = Array.isArray(schedule?.tasks) ? schedule.tasks : []
  /** @type {object[]} */
  const replace = []
  /** @type {object[]} */
  const keepDone = []
  /** @type {object[]} */
  const keepEdited = []
  /** @type {object[]} */
  const untouched = []

  for (const t of tasks) {
    if (!isVictoryManagedTask(t)) {
      untouched.push(t)
      continue
    }
    if (t.status === 'done') {
      keepDone.push(t)
      continue
    }
    if (t.userEdited === true) {
      keepEdited.push(t)
      continue
    }
    replace.push(t)
  }

  return {
    originalTaskCount: tasks.length,
    originalTaskIds: tasks.map((t) => String(t.id)),
    replaceCount: replace.length,
    keepDoneCount: keepDone.length,
    keepUserEditedCount: keepEdited.length,
    untouchedCount: untouched.length,
    sampleReplace: replace.slice(0, 10).map((t) => ({
      id: String(t.id),
      title: String(t.title || t.id),
      plannedDate: t.plannedDate ? String(t.plannedDate) : null,
    })),
    summaryTh: replace.length > 0
      ? `จะแทนที่งาน pending ที่ระบบจัดการ ${replace.length} รายการ · คง done ${keepDone.length} · คง userEdited ${keepEdited.length}`
      : `ยังไม่มีงาน pending ให้แทนที่ · จะสร้าง/รีเฟรชแผน 100 (คง done ${keepDone.length} · userEdited ${keepEdited.length})`,
  }
}

/**
 * One-shot / force seed of victory plan.
 *
 * force:true removes pending managed plan rows and reseeds, but keeps
 * status===done and userEdited===true managed tasks (and skips re-adding those ids).
 */
export function ensureVictoryPlanSeed(schedule, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  if (!schedule || typeof schedule !== 'object') {
    return { schedule, seeded: false, reason: 'no-schedule' }
  }
  if (!options.force && schedule.meta?.[VICTORY_SEED_META_KEY]) {
    let next = schedule
    let readiness = scoreVictoryReadiness(next, { todayIso })
    if (options.declareBelief && !readiness.isPerfect) {
      const out = setVictoryEffort(next, {
        beliefCommitted: true,
        beliefCommittedAt: new Date().toISOString(),
      })
      next = out.schedule
      readiness = out.readiness
      return { schedule: next, seeded: false, reason: 'belief-declared', readiness }
    }
    return {
      schedule: next,
      seeded: false,
      reason: 'already-seeded',
      readiness,
    }
  }

  // Shallow-clone retained rows so later conflict resolution cannot mutate caller objects.
  const retained = options.force
    ? retainTasksForForceRegen(schedule.tasks).map((t) => ({ ...t }))
    : (schedule.tasks || [])
  const preservedManaged = retained.filter(isProtectedManagedTask)

  const draft = generateVictoryDraft({
    todayIso,
    mode: options.mode || 'score-max',
    // Always honor retained rows (including protected done/userEdited on force).
    existingTasks: retained,
    existingTaskIds: retained.map((t) => t?.id).filter(Boolean),
  })

  const base = options.force
    ? { ...schedule, tasks: retained }
    : schedule

  let merged = mergeVictoryDraftIntoSchedule(base, draft)
  // Re-resolve any leftover evening overlaps already in SSOT.
  const resolved = resolveLadyLiveConflicts([...(merged.tasks || [])])
  merged = { ...merged, tasks: resolved.tasks }
  if (options.declareBelief !== false) {
    const out = setVictoryEffort(merged, {
      beliefCommitted: true,
      beliefCommittedAt: new Date().toISOString(),
    })
    merged = out.schedule
  }
  const readiness = scoreVictoryReadiness(merged, { todayIso })
  return {
    schedule: merged,
    seeded: true,
    reason: 'seeded',
    draft,
    readiness,
    preservedManagedCount: preservedManaged.length,
  }
}

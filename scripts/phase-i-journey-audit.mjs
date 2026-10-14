/**
 * Isolated Phase I journey checks (no browser). Uses in-memory storage.
 * Exit 0 only if all assertions pass.
 */
import { createEmptySchedule, buildTasksFromHtmlPlan } from '../src/lib/schedule/model.js'
import { DEFAULT_AVAILABILITY, SCHEDULE_KEY, LEGACY_HTML_KEY, LEGACY_TIMETABLE_KEY } from '../src/lib/schedule/constants.js'
import { saveSchedule, loadOrMigrateSchedule } from '../src/lib/schedule/migrate.js'
import { resetScheduleCache } from '../src/lib/schedule/store.js'
import { detectConflicts, rescheduleUnfinished } from '../src/lib/schedule/engine.js'
import { progressSnapshot } from '../src/lib/schedule/progress.js'
import {
  createEmptyPlannerRequest,
  defaultAvailabilityPreset,
  generatePlanPreview,
  applyPlanPreview,
  cancelPlanPreview,
} from '../src/lib/smartPlanner/index.js'
import { processAssistantTurn } from '../src/lib/assistant/dialogue.js'
import { createEmptyAssistantContext } from '../src/lib/assistant/context.js'
import { createDateProvider } from '../src/lib/assistant/dateProvider.js'
import {
  dailyPlan,
  htmlPlannerLinkInventory,
  importantLinks,
  courses,
} from '../src/data/htmlPlannerData.js'
import { buildHtmlResourceAccounting } from '../src/lib/planner/resourceAccounting.js'
import { listResourceCatalog, subjectIdsFromText } from '../src/lib/smartPlanner/subjects.js'

function mem() {
  const map = new Map()
  return {
    get length() { return map.size },
    key(i) { return [...map.keys()][i] ?? null },
    getItem(k) { return map.has(k) ? map.get(k) : null },
    setItem(k, v) { map.set(k, String(v)) },
    removeItem(k) { map.delete(k) },
    clear() { map.clear() },
  }
}

function scheduleBase() {
  const s = createEmptySchedule()
  s.tasks = buildTasksFromHtmlPlan()
  s.availability = DEFAULT_AVAILABILITY.map(w => ({ ...w }))
  s.sessions = [{
    id: 'fixed-audit',
    date: '2026-10-20',
    startTime: '20:00',
    endTime: '22:00',
    zone: 'คืน',
    title: 'Fixed commitment',
    status: 'planned',
    origin: 'timetable-seed',
    taskIds: [],
  }]
  const done = s.tasks.find(t => t.id === 'html_2026-10-12_0')
  if (done) {
    done.status = 'done'
    done.completedAt = '2026-10-12T00:00:00.000Z'
  }
  return s
}

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const dates = createDateProvider({ todayIso: '2026-10-14' })

// H — planner inventory
check('H.days', dailyPlan.length === 34, String(dailyPlan.length))
check('H.tasks', buildTasksFromHtmlPlan().length === 139, String(buildTasksFromHtmlPlan().length))
check('H.inventory', htmlPlannerLinkInventory.length === 89, String(htmlPlannerLinkInventory.length))
check('H.importantLinks', importantLinks.length === 5)
check('H.courses', courses.length === 6)
const accounting = buildHtmlResourceAccounting()
check('H.accounting-rows', accounting.summary.inventoryRows === 89)

// A — resources search
const eng = listResourceCatalog().filter(r => r.url && /อังกฤษ|english|grammar|drive|กฎหมาย/i.test(r.title))
check('A.resource-search', eng.length > 0, `${eng.length} hits`)
check('A.resource-has-http', eng.every(r => /^https?:\/\//i.test(r.url)))

// B — planner preview cancel
let schedule = scheduleBase()
const beforeB = structuredClone(schedule)
const req = createEmptyPlannerRequest({
  examId: 'exam-part-a-2569',
  examDate: '2026-11-14',
  startDate: '2026-10-14',
  endDate: '2026-11-14',
  subjects: ['english'],
  availability: defaultAvailabilityPreset(),
  sessionMinutes: 60,
  breakMinutes: 10,
  priority: 'high',
  includeExistingUnfinished: false,
  targetSessionCount: 3,
})
const previewB = generatePlanPreview(schedule, req, { todayIso: '2026-10-14' })
check('B.preview-ok', previewB.ok, previewB.error || '')
const cancelled = cancelPlanPreview(schedule)
check('B.cancel-noop', cancelled.changed === false)
check('B.unchanged', JSON.stringify(schedule) === JSON.stringify(beforeB))

// C — apply persist
const storage = mem()
resetScheduleCache()
const previewC = generatePlanPreview(schedule, req, { todayIso: '2026-10-14' })
const applied = applyPlanPreview(schedule, previewC.preview)
check('C.apply-ok', applied.ok, applied.error || '')
check('C.fixed-preserved', applied.schedule.sessions.some(s => s.id === 'fixed-audit'))
check('C.smart-added', applied.schedule.sessions.some(s => s.origin === 'smart-planner'))
check('C.completed-preserved', applied.schedule.tasks.find(t => t.id === 'html_2026-10-12_0')?.status === 'done')
saveSchedule(applied.schedule, storage)
const reloaded = loadOrMigrateSchedule(storage)
check('C.persisted-key', storage.getItem(SCHEDULE_KEY) != null)
check('C.legacy-dual-write', storage.getItem(LEGACY_HTML_KEY) != null && storage.getItem(LEGACY_TIMETABLE_KEY) != null)
check('C.reload-tasks', reloaded.schedule.tasks.length >= 139)

// D — assistant read-only
schedule = applied.schedule
let ctx = createEmptyAssistantContext()
let turn = processAssistantTurn(schedule, ctx, 'แผนวันนี้', { dateProvider: dates })
check('D.today-readonly', turn.scheduleChanged === false)
ctx = turn.context
turn = processAssistantTurn(schedule, ctx, 'วันสอบ', { dateProvider: dates })
check('D.exams-readonly', turn.scheduleChanged === false)
check('D.exams-mentions-ก', /ภาค ก|14/.test(turn.replies.join(' ')))

// E — assistant create then cancel
const beforeE = structuredClone(schedule)
turn = processAssistantTurn(
  schedule,
  createEmptyAssistantContext(),
  'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที สอบภาค ก',
  { dateProvider: dates }
)
check('E.pending', turn.pendingChange?.type === 'apply_plan_preview', turn.classification.intent)
turn = processAssistantTurn(schedule, turn.context, 'ยกเลิก', { dateProvider: dates })
check('E.cancel', turn.scheduleChanged === false && turn.context.pendingChange == null)
check('E.unchanged', JSON.stringify(schedule) === JSON.stringify(beforeE))

// F — confirm + consistency across progress projection
turn = processAssistantTurn(
  schedule,
  createEmptyAssistantContext(),
  'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที สอบภาค ก',
  { dateProvider: dates }
)
turn = processAssistantTurn(schedule, turn.context, 'ยืนยัน', { dateProvider: dates })
check('F.confirmed', turn.scheduleChanged === true)
schedule = turn.nextSchedule
const snap = progressSnapshot(schedule)
check('F.progress-consistent', snap.consistent === true)
check('F.html-tasks', snap.taskTotal === 139)
const overlaps = detectConflicts(schedule.sessions).filter(c => c.reason === 'overlap')
check('F.no-overlap', overlaps.length === 0, String(overlaps.length))

// G — reschedule unfinished without duplicates
schedule.tasks = schedule.tasks.map(t => {
  if (t.id === 'html_2026-10-12_1') {
    return { ...t, status: 'pending', plannedDate: '2026-10-10', completedAt: undefined, rescheduleHistory: [] }
  }
  return t
})
const beforeIds = new Set(schedule.sessions.map(s => s.id))
const resched = rescheduleUnfinished(schedule, {
  todayIso: '2026-10-14',
  hardStopDate: '2026-11-14',
})
const ids = resched.schedule.sessions.map(s => s.id)
check('G.no-dup-ids', new Set(ids).size === ids.length)
check('G.moved-or-skip', resched.report.moved.length + resched.report.skipped.length > 0)
const gOverlaps = detectConflicts(resched.schedule.sessions).filter(c => c.reason === 'overlap')
check('G.no-overlap', gOverlaps.length === 0)
check('G.kept-existing', [...beforeIds].every(id => ids.includes(id)))

const failed = results.filter(r => !r.ok)
console.log('\nSUMMARY', { passed: results.length - failed.length, failed: failed.length, total: results.length })
if (failed.length) {
  console.error(failed)
  process.exit(1)
}

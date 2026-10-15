import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, Copy, ExternalLink, Filter, CalendarRange } from 'lucide-react'
import { PageHeader, EmptyState, FilterChips, StatusBanner } from '../components/ui'
import {
  enrichCuratedResources,
  filterCuratedResources,
  summarizeCuratedUrlStatuses,
  getCopyUrl,
} from '../lib/curated/catalog.js'
import { URL_STATUS, URL_STATUS_LABELS_TH, canOpenExternally } from '../lib/curated/urlStatus.js'
import { generateUnifiedStudyDraft, mergeUnifiedDraftIntoSchedule } from '../lib/curated/unifiedPlan.js'
import {
  generatePartB29Draft,
  mergePartB29DraftIntoSchedule,
  buildPartB29CutPolicy,
} from '../lib/curated/partB29Plan.js'
import {
  generateLiveScheduleTasks,
  sortCatalogByPriority,
  subjectLabelTh,
} from '../lib/curated/liveSchedulePlan.js'
import { listLiveTutorEvents } from '../data/liveTutorSchedule.js'
import { auditPlanCoverage } from '../lib/curated/planCoverage.js'
import { buildCatalogReviewReport } from '../lib/curated/catalogReview.js'
import {
  PRIORITY_MODE_LABELS_TH,
  PRIORITY_TIER_LABELS_TH,
  PRIORITY_TIERS,
  normalizePriorityMode,
  rankCuratedCatalog,
} from '../lib/curated/priorityScoring.js'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialQuizzes } from '../data/quizData'
import { analyzeQuizPerformance } from '../lib/study/weakness.js'
import { HUB_EXAM_PART_LABELS, HUB_SUBJECT_LABELS } from '../lib/study/hub.js'
import { bangkokTodayIso } from '../data/htmlPlannerData.js'

const KIND_LABELS = {
  all: 'ทุกประเภท',
  lesson: 'บทเรียน',
  'quiz-practice': 'ข้อสอบ/ตะลุย',
  'answer-key': 'เฉลย',
  document: 'เอกสาร',
  live: 'ไลฟ์',
}

const TIER_BADGE = {
  [PRIORITY_TIERS.MUST]: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  [PRIORITY_TIERS.IF_TIME]: 'border-sky-300 bg-sky-50 text-sky-900',
  [PRIORITY_TIERS.DEFER]: 'border-slate-300 bg-slate-50 text-slate-700',
}

export default function Library() {
  const { schedule, setSchedule } = useScheduleStore()
  const [quizzes] = useLocalStorage('study_quizzes', initialQuizzes)
  const [quizResults] = useLocalStorage('quiz_results', {})
  const catalog = useMemo(() => enrichCuratedResources(), [])
  const [examPart, setExamPart] = useState('all')
  const [subjectId, setSubjectId] = useState('all')
  const [kind, setKind] = useState('all')
  const [urlStatus, setUrlStatus] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [mode, setMode] = useState('score-max')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState('')
  const [planMsg, setPlanMsg] = useState('')

  const weaknessAnalysis = useMemo(
    () => analyzeQuizPerformance(quizResults, quizzes),
    [quizResults, quizzes],
  )

  const ranked = useMemo(
    () => rankCuratedCatalog(catalog, {
      mode: normalizePriorityMode(mode),
      weaknessBySubject: new Map(
        (weaknessAnalysis.observedWeaknesses || []).map(w => [w.subjectId, w]),
      ),
    }),
    [catalog, mode, weaknessAnalysis],
  )

  const scoreById = useMemo(() => new Map(ranked.map(e => [e.row.id, e.score])), [ranked])

  const filtered = useMemo(() => {
    const base = filterCuratedResources(catalog, { examPart, subjectId, kind, urlStatus, query })
    const tiered = tierFilter === 'all'
      ? base
      : base.filter(item => scoreById.get(item.id)?.tier === tierFilter)
    // Always list by priority (must → if-time → defer) / weakness when mode = weakness-focus.
    return sortCatalogByPriority(tiered, ranked)
  }, [catalog, examPart, subjectId, kind, urlStatus, query, tierFilter, scoreById, ranked])

  const todayIso = bangkokTodayIso()

  const liveUpcoming = useMemo(
    () => listLiveTutorEvents(todayIso, { includePast: false }),
    [todayIso],
  )

  const liveTasksPreview = useMemo(
    () => generateLiveScheduleTasks({
      todayIso,
      existingTaskIds: (schedule.tasks || []).map(t => t.id),
    }),
    [schedule.tasks, todayIso],
  )

  const summary = useMemo(() => summarizeCuratedUrlStatuses(catalog), [catalog])
  const seriesList = useMemo(
    () => [...new Set(catalog.map(i => i.series))].sort((a, b) => a.localeCompare(b, 'th')),
    [catalog],
  )

  const subjectOptions = useMemo(() => {
    const ids = [...new Set(catalog.map(i => i.subjectId))]
    return [
      { id: 'all', label: 'ทุกวิชา' },
      ...ids.map(id => ({ id, label: HUB_SUBJECT_LABELS[id] || id })),
    ]
  }, [catalog])

  const onCopy = async (item) => {
    const text = getCopyUrl(item)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(item.id)
      setTimeout(() => setCopied(''), 1500)
    } catch {
      setCopied('fail')
    }
  }

  const applyDraft = () => {
    const existingTasks = schedule.tasks || []
    const existingTaskIds = existingTasks.map(t => t.id)
    const draft = generateUnifiedStudyDraft({
      existingTaskIds,
      existingTasks,
      mode: normalizePriorityMode(mode),
      weaknessAnalysis,
    })
    const beforeIds = new Set(existingTaskIds.map(String))
    const next = mergeUnifiedDraftIntoSchedule(schedule, draft)
    setSchedule(() => next)
    const added = (next.lastCuratedMerge && Number.isFinite(next.lastCuratedMerge.added))
      ? next.lastCuratedMerge.added
      : (next.tasks || []).filter(t => !beforeIds.has(String(t.id))).length
    const skipped = next.lastCuratedMerge?.skippedExisting ?? 0
    setPlanMsg(
      `ผสานแบบเพิ่มเท่านั้น (${PRIORITY_MODE_LABELS_TH[normalizePriorityMode(mode)]}): เพิ่มใหม่ ${added} · ข้ามที่มีอยู่แล้ว ${skipped}`
      + ` · ร่างเสนอ ${draft.proposedTasks.length} · must ${draft.tierCounts.scheduledMust} · if-time ${draft.tierCounts.scheduledIfTime}`
      + ` · พักไว้ ${draft.tierCounts.defer}`
      + (draft.dailyMinutesIsDefault ? ` · งบประมาณ ≈ ${draft.dailyMinutes} นาที/วัน` : ''),
    )
  }

  const applyPartB29 = () => {
    const existingTasks = schedule.tasks || []
    const existingTaskIds = existingTasks.map(t => t.id)
    const draft = generatePartB29Draft({
      existingTaskIds,
      existingTasks,
      mode: normalizePriorityMode(mode),
      weaknessAnalysis,
    })
    const beforeIds = new Set(existingTaskIds.map(String))
    const next = mergePartB29DraftIntoSchedule(schedule, draft)
    setSchedule(() => next)
    const added = (next.lastCuratedMerge && Number.isFinite(next.lastCuratedMerge.added))
      ? next.lastCuratedMerge.added
      : (next.tasks || []).filter(t => !beforeIds.has(String(t.id))).length
    const skipped = next.lastCuratedMerge?.skippedExisting ?? 0
    setPlanMsg(
      `ผสานแผน 29 วันบังคับภาค ข: เพิ่มใหม่ ${added} · ข้ามที่มีอยู่แล้ว ${skipped}`
      + ` · เสนอ ${draft.proposedTasks.length} งาน · วันที่ ${draft.dayCount}`
      + ` · ภาค ข must ในแพ็ก ${draft.partBMustScheduled}/${draft.partBMustInPack}`
      + (draft.partBCoverageOk ? ' · ครอบคลุมครบ' : ` · ค้าง ${draft.partBMustLeft}`)
      + ` · ไลฟ์/บล็อก ${draft.liveSchedule?.taskCount ?? 0}`
      + ` · ตัดจากแพ็ก ${draft.cutList.length} ตอน (ยังอยู่ในคลัง)`,
    )
  }

  const preview = useMemo(
    () => generateUnifiedStudyDraft({
      existingTaskIds: (schedule.tasks || []).map(t => t.id),
      existingTasks: schedule.tasks || [],
      mode: normalizePriorityMode(mode),
      weaknessAnalysis,
    }),
    [schedule.tasks, mode, weaknessAnalysis],
  )

  const partB29Preview = useMemo(
    () => generatePartB29Draft({
      existingTaskIds: (schedule.tasks || []).map(t => t.id),
      existingTasks: schedule.tasks || [],
      mode: normalizePriorityMode(mode),
      weaknessAnalysis,
    }),
    [schedule.tasks, mode, weaknessAnalysis],
  )

  const cutPolicy = useMemo(() => buildPartB29CutPolicy(), [])

  const coverage = useMemo(
    () => auditPlanCoverage(catalog, {
      existingTaskIds: (schedule.tasks || []).map(t => t.id),
      existingTasks: schedule.tasks || [],
      mode: normalizePriorityMode(mode),
      weaknessAnalysis,
    }),
    [catalog, schedule.tasks, mode, weaknessAnalysis],
  )

  const review = useMemo(() => buildCatalogReviewReport(), [])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="คลังหลักสูตรรวม"
        description={catalog.length
          ? `${catalog.length} รายการ · เลดี้เก๋เก๋ + อ.นนท์ + คณิต/ไทย/ข้าราชการที่ดี · อังกฤษภาค ก ≠ วิชาเอก`
          : 'คลังว่าง — รอชุดติวเตอร์ถัดไป'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/resources" className="btn-secondary text-xs">คลังเรียน (เดิม)</Link>
            <Link to="/today" className="btn-secondary text-xs">วันนี้</Link>
          </div>
        )}
      />

      <StatusBanner tone="info" title="สถานะคลัง · เลดี้เก๋เก๋ + อ.นนท์">
        {summary.total === 0 ? (
          <>
            คลังว่าง — รอแพ็กติวเตอร์ถัดไป
          </>
        ) : (
          <>
            อังกฤษ + การศึกษา/กฎหมาย + คณิต/ไทย/ข้าราชการที่ดี · ทั้งหมด {summary.total}
            · unchecked {summary.unchecked} · URL ไม่ครบ {summary.needs_full_url}
            · ข้าราชการที่ดี ≠ กฎหมายภาค ข · ไม่รวม อปท / กทม / O-NET / ใบประกอบ
            · ห้ามถือว่า unchecked = เปิดได้จริง
          </>
        )}
      </StatusBanner>

      <StatusBanner tone="info" title={`ขอบเขตสอบทางการ · ตรวจเมื่อ ${review.officialScope?.checkedAt || '—'}`}>
        <p>
          วิชาการศึกษาและกฎหมายอยู่ภาค ข ตาม ก.ค.ศ. ว14/2566 + ประกาศเขตปี 2569
          · ทักษะอังกฤษภาค ก ≠ วิชาเอกอังกฤษภาค ข
          · mismatch คลังกับหลักฐาน: {review.officialScope?.mismatches?.length ?? 0}
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
          {(review.officialScope?.sources || []).slice(0, 3).map(s => (
            <li key={s.id}>
              <span className="font-medium">{s.titleTh}</span>
              {' · '}{s.agencyTh} · {s.dated}
              {' · '}
              <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">แหล่งอ้างอิง</a>
            </li>
          ))}
        </ul>
        {(review.officialScope?.limitationsTh || []).length ? (
          <p className="mt-2 text-xs opacity-90">{review.officialScope.limitationsTh[0]}</p>
        ) : null}
      </StatusBanner>

      <section className="card space-y-3" data-testid="live-tutor-schedule">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <CalendarRange className="h-5 w-5 text-primary-700" /> ตารางไลฟ์สด (จากโปสเตอร์)
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          เรียงตามน้ำหนักคะแนน: เอก ข → การศึกษา → กฎหมาย ข → อังกฤษ ก / ข้าราชการที่ดี → หมาหอน
          · ใกล้ถึง {liveUpcoming.length} รายการต้นทาง
          · จะปักหมุด {liveTasksPreview.proposedTasks.length} งานเมื่อผสานแผน 29 วัน
        </p>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
          {liveUpcoming.length === 0 ? (
            <li className="text-slate-500">ไม่มีไลฟ์ที่เหลือจากวันนี้เป็นต้นไป</li>
          ) : liveUpcoming.map(ev => (
            <li
              key={ev.id}
              className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-800"
            >
              <p className="font-medium text-slate-900 dark:text-white">
                {ev.date}{ev.dateEnd && ev.dateEnd !== ev.date ? `–${ev.dateEnd}` : ''}
                {ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''} น.` : ''}
                {' · '}{ev.titleTh}
              </p>
              <p className="mt-0.5 text-slate-500">
                ลำดับ {ev.priorityRank}
                {' · '}{ev.examPart === 'admin' ? 'ธุรการ' : `ภาค ${ev.examPart}`}
                {' · '}{subjectLabelTh(ev.subjectId)}
                {' · '}{ev.kind === 'live' ? 'ไลฟ์' : ev.kind === 'content-block' ? 'บล็อกเนื้อหา' : 'โลจิสติกส์'}
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-300">{ev.reasonTh}</p>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-500">
          {liveTasksPreview.notesTh.map(n => <li key={n}>{n}</li>)}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <CalendarRange className="h-5 w-5 text-primary-700" /> แผนคุ้มคะแนน (ร่าง)
        </h2>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            ความเข้มข้น (เรียงรายการคลังตามโหมดนี้)
          </p>
          <FilterChips
            ariaLabel="โหมดจัดลำดับความสำคัญ"
            value={mode}
            onChange={setMode}
            options={Object.entries(PRIORITY_MODE_LABELS_TH).map(([id, label]) => ({ id, label }))}
          />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          สอบภาค ก {preview.examPartA} · ภาค ข {preview.examPartB} · โหมด {preview.modeLabelTh}
          · เสนอ {preview.proposedTasks.length} งาน
          · must ที่งบไม่พอ {preview.unscheduled.mustScoreLeft}
          · พักไว้ {preview.unscheduled.deferred}
        </p>
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">ความครอบคลุมกลุ่มต้องเก็บคะแนน (ค่าประมาณ)</p>
          <p className="mt-1">
            must {coverage.totals.must} · if-time {coverage.totals.ifTime} · defer {coverage.totals.defer}
            · จัดแล้ว {coverage.totals.scheduled}
            · must ที่ยังไม่จัด {coverage.totals.unscheduledMust}
            · นาที must ≈ {coverage.minutes.neededMustEst}
            · งบวันเรียน ≈ {coverage.minutes.availableStudy}
            · ขาด must ≈ {coverage.minutes.shortfallEst}
          </p>
          <p className="mt-1">{coverage.minutes.unitNoteTh}</p>
          {coverage.atRiskSubjects.length ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-4">
              {coverage.atRiskSubjects.slice(0, 4).map(s => (
                <li key={`${s.examPart}-${s.subjectId}`}>
                  must ค้าง: {s.labelTh} (ภาค {s.examPart}) · {s.count} ตอน · ≈ {s.minutesEst} นาที
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            {coverage.optionsTh.slice(0, 4).map(o => <li key={o}>{o}</li>)}
          </ul>
        </div>
        {preview.deferredSample?.length ? (
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-700 dark:text-slate-200">ตัวอย่างหัวข้อที่พักไว้ (ยังอยู่ในคลัง)</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {preview.deferredSample.slice(0, 5).map(d => (
                <li key={d.id}>{d.title} · {d.reasonTh}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          {preview.notesTh.map(n => <li key={n}>{n}</li>)}
          {preview.limitationsTh.map(n => <li key={n}>{n}</li>)}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm" onClick={applyDraft}>
            ผสานร่างเข้าตาราง (เพิ่มเท่านั้น · ไม่ทับงานเดิม)
          </button>
          <Link to="/overview" className="btn-secondary text-sm">ดูแผนภาพรวม</Link>
        </div>
        {planMsg ? (
          <p
            className="text-sm text-emerald-700 dark:text-emerald-300"
            data-testid="curated-merge-status"
            aria-live="polite"
          >
            {planMsg}
          </p>
        ) : null}
      </section>

      <section className="card space-y-3" data-testid="part-b-29-plan">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <CalendarRange className="h-5 w-5 text-primary-700" /> แผน 29 วันบังคับภาค ข
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          บังคับครอบคลุมการศึกษา + กฎหมาย + วิชาเอกอังกฤษก่อน · แล้วค่อยเติมภาค ก ที่ตัดแล้ว
          · {partB29Preview.dayCount} วัน · งบ ≈ {partB29Preview.dailyMinutes} นาที/วัน
          · แพ็ก ข {partB29Preview.packSummary.partBItems} ตอน ≈ {partB29Preview.packSummary.partBMinutes} นาที
          · เติม ก {partB29Preview.packSummary.partAItems} ตอน
          · must ข ในแพ็ก {partB29Preview.partBMustScheduled}/{partB29Preview.partBMustInPack}
          {partB29Preview.partBCoverageOk ? ' · ครบ' : ` · ค้าง ${partB29Preview.partBMustLeft}`}
          · ไลฟ์/บล็อก {partB29Preview.liveSchedule?.taskCount ?? 0}
        </p>

        <div className="rounded-lg border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-950 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
          <p className="font-semibold">สิ่งที่ตัดออกจากแพ็กนี้ (บอกก่อนผสาน)</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {cutPolicy.honestyTh.map(line => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <ul className="mt-2 space-y-2">
            {cutPolicy.cutGroupsTh.map(g => (
              <li key={g.id} className="rounded-md border border-rose-200/60 bg-white/50 p-2 dark:border-rose-900/50 dark:bg-rose-950/20">
                <p className="font-medium">{g.titleTh}</p>
                <p className="mt-0.5 opacity-90">{g.reasonTh}</p>
              </li>
            ))}
          </ul>
          {partB29Preview.cutSample?.length ? (
            <div className="mt-2">
              <p className="font-semibold">ตัวอย่างที่ตัด ({partB29Preview.cutList.length} ตอน)</p>
              <ul className="mt-1 max-h-28 list-disc space-y-0.5 overflow-y-auto pl-4">
                {partB29Preview.cutSample.slice(0, 8).map(c => (
                  <li key={c.id}>{c.title} · ≈ {c.minutes} นาที · {c.reasonTh}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          {partB29Preview.notesTh.map(n => <li key={n}>{n}</li>)}
          {partB29Preview.limitationsTh.map(n => <li key={n}>{n}</li>)}
        </ul>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={applyPartB29}
            data-testid="apply-part-b-29"
          >
            ผสานแผน 29 วันภาค ข (เพิ่มเท่านั้น)
          </button>
          <Link to="/today" className="btn-secondary text-sm">เปิดวันนี้</Link>
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">รายการที่ต้องส่ง URL เต็ม</h2>
        <p className="text-xs text-slate-500">
          {review.needsFullUrlSlots.length} รายการ · ไม่เดาจาก stub · ไม่เสนอเป็นลิงก์พร้อมใช้งาน
          · math stubs ที่ต้องได้ลิงก์เต็ม {review.mathStubsNeedingFullUrl?.length || 0}
          · unchecked ที่ยังไม่ตรวจ {review.uncheckedSlots.length}
        </p>
        {review.crossPartEnglishShareSuspicions?.length ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            ข้อสงสัย URL ร่วม skills/major: {review.crossPartEnglishShareSuspicions.length} กลุ่ม
            — ยังไม่ยืนยันว่าเป็นแหล่งเดียวกัน อย่ารวมอัตโนมัติ
          </p>
        ) : null}
        <ul className="max-h-40 space-y-2 overflow-y-auto text-xs">
          {review.needsFullUrlSlots.map(slot => (
            <li key={slot.id} className="rounded-lg border border-slate-200/80 p-2 dark:border-slate-800">
              <p className="font-medium text-slate-800 dark:text-slate-100">{slot.id} · {slot.title}</p>
              <p className="text-slate-500">ภาค {slot.examPart} · {slot.subjectId}</p>
              <p className="truncate text-slate-400" title={slot.stubUrl}>stub: {slot.stubUrl}</p>
              <p className="mt-1 text-amber-800 dark:text-amber-200">ขาด: {slot.missingTh || 'URL เต็ม'}</p>
              <p className="mt-1 text-slate-500">fullUrlFromUser: (ว่าง — รอคุณส่ง)</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <BookOpenCheck className="h-5 w-5 text-primary-700" /> รายการหลักสูตร (เรียงตามความสำคัญ)
          </h2>
          <p className="text-xs text-slate-500">
            แสดง {filtered.length} / {catalog.length}
            {' · '}{PRIORITY_MODE_LABELS_TH[normalizePriorityMode(mode)]}
            {seriesList.length ? ` · ${seriesList.length} ชุดวิชา` : ''}
          </p>
        </div>

        <input
          className="input text-sm"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อตอน / ชุดวิชา..."
        />

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ระดับความสำคัญ</p>
          <FilterChips
            ariaLabel="กรองระดับความสำคัญ"
            value={tierFilter}
            onChange={setTierFilter}
            options={[
              { id: 'all', label: 'ทุกระดับ' },
              ...Object.entries(PRIORITY_TIER_LABELS_TH).map(([id, label]) => ({ id, label })),
            ]}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ภาคสอบ</p>
          <FilterChips
            ariaLabel="กรองภาคสอบคลังหลักสูตร"
            value={examPart}
            onChange={setExamPart}
            options={['all', 'ก', 'ข'].map(id => ({
              id,
              label: id === 'all' ? 'ทุกภาค' : (HUB_EXAM_PART_LABELS[id] || id),
            }))}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">วิชา</p>
          <FilterChips ariaLabel="กรองวิชา" value={subjectId} onChange={setSubjectId} options={subjectOptions} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ประเภท</p>
          <FilterChips
            ariaLabel="กรองประเภท"
            value={kind}
            onChange={setKind}
            options={Object.entries(KIND_LABELS).map(([id, label]) => ({ id, label }))}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">สถานะ URL</p>
          <FilterChips
            ariaLabel="กรองสถานะ URL"
            value={urlStatus}
            onChange={setUrlStatus}
            options={[
              { id: 'all', label: 'ทุกสถานะ' },
              ...Object.keys(URL_STATUS_LABELS_TH).map(id => ({
                id,
                label: `${URL_STATUS_LABELS_TH[id]}${id === URL_STATUS.NEEDS_FULL_URL ? ` (${summary.needs_full_url})` : ''}`,
              })),
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="ไม่พบรายการตามตัวกรอง"
            description="ลองเลือกทุกระดับ/ทุกภาค — รายการที่พักไว้ยังอยู่ในคลัง"
          />
        ) : (
          <ul className="space-y-3">
            {filtered.map((item, index) => {
              const score = scoreById.get(item.id)
              return (
                <li key={item.id} className="rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        <span className="mr-2 text-xs font-normal text-slate-400">#{index + 1}</span>
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.series}
                        {item.episode != null ? ` · ตอน ${item.episode}` : ''}
                        {' · '}{KIND_LABELS[item.kind] || item.kind}
                        {' · '}{item.examPartLabelTh}
                        {' · '}{item.subjectLabelTh}
                      </p>
                      <p className="flex flex-wrap gap-1.5 text-xs">
                        {score ? (
                          <span className={`badge border ${TIER_BADGE[score.tier] || TIER_BADGE.defer}`}>
                            {score.tierLabelTh}
                          </span>
                        ) : null}
                        <span className={`badge border ${
                          item.urlStatus === 'needs_full_url'
                            ? 'border-amber-300 bg-amber-50 text-amber-900'
                            : item.urlStatus === 'verified_accessible' || item.urlStatus === 'openable'
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                        >
                          {item.statusLabelTh}
                        </span>
                        {score ? (
                          <span className="badge border border-slate-200 bg-white text-slate-600">
                            {score.dataConfidenceLabelTh}
                          </span>
                        ) : null}
                        {item.estimatedMinutes
                          ? <span className="text-slate-400">≈ {item.estimatedMinutes} นาที (ประมาณ)</span>
                          : null}
                      </p>
                      {score ? (
                        <p className="text-xs text-slate-600 dark:text-slate-300">{score.reasonTh}</p>
                      ) : null}
                      {item.urlStatus === 'needs_full_url' ? (
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          URL ไม่ครบ — คัดลอก stub ได้ · ไม่แสดงเป็นลิงก์พร้อมใช้งาน
                        </p>
                      ) : null}
                      {item.urlStatus === 'unchecked' ? (
                        <p className="text-xs text-slate-500">
                          รูปแบบครบแต่ยังไม่ตรวจสิทธิ์ — ไม่ใช่ verified_accessible
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-secondary text-xs" onClick={() => onCopy(item)}>
                        <Copy className="h-3.5 w-3.5" />
                        {copied === item.id ? 'คัดลอกแล้ว' : 'Copy URL'}
                      </button>
                      {item.canOpen && canOpenExternally(item.urlStatus) && item.safeUrl ? (
                        <a
                          className="btn-secondary text-xs"
                          href={item.safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> เปิดคลิปติว
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

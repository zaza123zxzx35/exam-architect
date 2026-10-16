import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckCheck,
  Clock3,
  RotateCcw,
  CalendarClock,
  Radio,
  BookOpen,
  AlertTriangle,
  Coffee,
} from 'lucide-react'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { bangkokTodayIso } from '../data/htmlPlannerData'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'
import { getPrimaryExam } from '../data/examCalendar'
import { CURATED_CATALOG_VERSION } from '../data/curatedCatalog.js'
import {
  buildClearManagedPreview,
  commitClearManagedTasks,
  commitForceVictoryPlan,
} from '../lib/curated/seedPartB29Plan.js'
import { buildDailyAgenda, ensureTodaySourceTasks } from '../lib/curated/dailyAgenda.js'
import {
  buildDayTimeline,
  COACH_PREFS_META_KEY,
  normalizeCoachPrefs,
} from '../lib/curated/dayTimeline.js'
import { analyzeContentOverlap } from '../lib/curated/contentOverlap.js'
import TaskOpenButtons from '../components/TaskOpenButtons.jsx'
import VictoryPlanCard from '../components/VictoryPlanCard.jsx'
import ForceRegenConfirmDialog from '../components/ForceRegenConfirmDialog.jsx'
import ClearManagedConfirmDialog from '../components/ClearManagedConfirmDialog.jsx'
import { buildForceRegenPreview } from '../lib/curated/victoryPlan.js'

function statusLabelTh(status) {
  if (status === 'done') return 'เสร็จแล้ว'
  if (status === 'in_progress') return 'กำลังเรียน'
  return 'ยังไม่ได้เริ่ม'
}

export default function Today() {
  const countdown = useExamCountdown()
  const { schedule, setSchedule, runReschedule } = useScheduleStore()
  const [rescheduleMsg, setRescheduleMsg] = useState('')
  const [forceDialogOpen, setForceDialogOpen] = useState(false)
  const [forcePreview, setForcePreview] = useState(null)
  const [forceBusy, setForceBusy] = useState(false)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearPreview, setClearPreview] = useState(null)
  const [clearBusy, setClearBusy] = useState(false)
  const todayIso = bangkokTodayIso()

  useEffect(() => {
    setSchedule((prev) => {
      const hasToday = (prev.tasks || []).some((t) => t && t.plannedDate === todayIso)
      if (hasToday) return prev
      const out = ensureTodaySourceTasks(prev, todayIso)
      return out.added > 0 ? out.schedule : prev
    })
  }, [todayIso, setSchedule])

  const prefs = useMemo(
    () => normalizeCoachPrefs(schedule?.meta?.[COACH_PREFS_META_KEY]),
    [schedule?.meta],
  )

  const agenda = useMemo(
    () => buildDailyAgenda({ schedule, todayIso }),
    [schedule, todayIso],
  )

  const todayTaskObjects = useMemo(() => {
    const fromSchedule = (schedule.tasks || []).filter((t) => t && t.plannedDate === todayIso)
    if (fromSchedule.length) return fromSchedule
    return agenda.items.map((i) => i.task).filter(Boolean)
  }, [schedule.tasks, todayIso, agenda.items])

  const timeline = useMemo(
    () => buildDayTimeline({ tasks: todayTaskObjects, prefs, todayIso }),
    [todayTaskObjects, prefs, todayIso],
  )

  const doneResourceIds = useMemo(() => {
    return (schedule.tasks || [])
      .filter((t) => t.status === 'done' && t.resourceId)
      .map((t) => String(t.resourceId))
  }, [schedule.tasks])

  const overlap = useMemo(
    () => analyzeContentOverlap(undefined, { doneResourceIds }),
    [doneResourceIds],
  )

  const total = timeline.summary.total
  const doneCount = timeline.summary.done
  const remainingCount = timeline.summary.remaining
  const pct = total ? Math.round((doneCount / total) * 100) : 0
  const overdueCount = (schedule.tasks || []).filter(
    (t) => (t.status === 'pending' || t.status === 'deferred') && t.plannedDate && t.plannedDate < todayIso,
  ).length

  const withTodayPinned = (prev) => {
    const hasToday = (prev.tasks || []).some((t) => t && t.plannedDate === todayIso)
    if (hasToday) return prev
    return ensureTodaySourceTasks(prev, todayIso).schedule
  }

  const toggleCurated = (taskId) => {
    setSchedule((prev) => {
      const base = withTodayPinned(prev)
      return {
        ...base,
        tasks: (base.tasks || []).map((t) => {
          if (String(t.id) !== String(taskId)) return t
          return { ...t, status: t.status === 'done' ? 'pending' : 'done' }
        }),
      }
    })
  }

  const markAll = (done) => {
    const ids = new Set(todayTaskObjects.map((t) => String(t.id)))
    setSchedule((prev) => {
      const base = withTodayPinned(prev)
      return {
        ...base,
        tasks: (base.tasks || []).map((t) => (
          ids.has(String(t.id)) ? { ...t, status: done ? 'done' : 'pending' } : t
        )),
      }
    })
  }

  const cycleStatus = (taskId) => {
    setSchedule((prev) => {
      const base = withTodayPinned(prev)
      return {
        ...base,
        tasks: (base.tasks || []).map((t) => {
          if (String(t.id) !== String(taskId)) return t
          const s = String(t.status || 'pending')
          if (s === 'pending' || s === 'deferred') return { ...t, status: 'in_progress' }
          if (s === 'in_progress' || s === 'doing') return { ...t, status: 'done' }
          return { ...t, status: 'pending' }
        }),
      }
    })
  }

  const handleReschedule = () => {
    const report = runReschedule({ todayIso })
    if (!report) {
      setRescheduleMsg('ไม่สามารถเลื่อนงานได้')
      return
    }
    setRescheduleMsg(
      `เลื่อนแล้ว ${report.moved.length} งาน`
      + (report.skipped.length ? ` · ข้าม ${report.skipped.length}` : ''),
    )
  }

  const openClearManagedPreview = () => {
    try {
      setClearPreview(buildClearManagedPreview(schedule))
      setClearDialogOpen(true)
    } catch (err) {
      setRescheduleMsg(`เปิดหน้าต่างยืนยันไม่ได้: ${err?.message || 'unknown error'}`)
    }
  }

  const cancelClearManagedPreview = () => {
    if (clearBusy) return
    setClearDialogOpen(false)
    setClearPreview(null)
  }

  const confirmClearManaged = () => {
    if (clearBusy) return
    setClearBusy(true)
    try {
      let applied = null
      setSchedule((prev) => {
        applied = commitClearManagedTasks(prev)
        return applied.schedule
      })
      setRescheduleMsg(
        applied?.removedCount > 0
          ? `ล้างงาน curated/ไลฟ์แล้ว ${applied.removedCount} รายการ`
          : 'ไม่มีงาน curated/ไลฟ์ให้ลบ',
      )
    } finally {
      setClearBusy(false)
      setClearDialogOpen(false)
      setClearPreview(null)
    }
  }

  const openForceRegenPreview = () => {
    try {
      setForcePreview(buildForceRegenPreview(schedule))
      setForceDialogOpen(true)
    } catch (err) {
      setRescheduleMsg(`เปิดหน้าต่างยืนยันไม่ได้: ${err?.message || 'unknown error'}`)
    }
  }

  const cancelForceRegenPreview = () => {
    if (forceBusy) return
    setForceDialogOpen(false)
    setForcePreview(null)
  }

  const confirmForceRegen = () => {
    if (forceBusy) return
    setForceBusy(true)
    try {
      let applied = null
      setSchedule((prev) => {
        applied = commitForceVictoryPlan(prev, { todayIso, declareBelief: true })
        return applied.schedule
      })
      setRescheduleMsg(
        applied?.readiness?.isPerfect
          ? `แผนพาบรรจุ ${applied.readiness.score}/100 พร้อมแล้ว`
          : `สร้างแผนแล้ว ${applied?.readiness?.score ?? '—'}/100`,
      )
    } finally {
      setForceBusy(false)
      setForceDialogOpen(false)
      setForcePreview(null)
    }
  }

  const liveAttend = timeline.conflicts.decisions.filter((d) => d.type === 'resolved')
  const liveUncertain = timeline.conflicts.decisions.filter((d) => d.type === 'uncertain')

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card !p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-br from-primary-900 to-primary-700 px-5 py-5 text-white dark:border-slate-800">
          <p className="text-xs font-semibold text-primary-100">ผู้ช่วยวางแผนสอบ · สพฐ. 2569</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <CalendarDays className="h-6 w-6" /> วันนี้ต้องเรียนอะไร?
          </h2>
          <p className="mt-1 text-sm text-primary-100/90">{formatThaiPlanDate(todayIso)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[10px] text-primary-100">เริ่ม</div>
              <div className="font-bold">{timeline.summary.startTime || '—'}</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[10px] text-primary-100">ลำดับแรก</div>
              <div className="line-clamp-2 text-xs font-semibold">{timeline.summary.firstTaskTitle || '—'}</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[10px] text-primary-100">เสร็จ / เหลือ</div>
              <div className="font-bold">{doneCount} / {remainingCount}</div>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2">
              <div className="text-[10px] text-primary-100">เรียนจบประมาณ</div>
              <div className="font-bold">{timeline.summary.endTime || '—'}</div>
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-[11px] text-slate-500">{pct}% · ไลฟ์เข้าสดตามคำแนะนำด้านล่าง</p>
          </div>
        )}

        {(agenda.sourceLives.length > 0 || (agenda.sourceFocus || []).length > 0) && (
          <div className="border-b border-rose-100 bg-rose-50/70 px-5 py-3 dark:border-rose-950 dark:bg-rose-950/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-950 dark:text-rose-100">
              <Radio className="h-4 w-4" /> จากตารางต้นทางวันนี้
            </h3>
            {agenda.sourceLives.length === 0 ? (
              <p className="mt-1 text-xs text-rose-900/80">วันนี้ไม่มีไลฟ์สดในโปสเตอร์ต้นทาง</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs text-rose-900 dark:text-rose-100">
                {agenda.sourceLives.map((ev) => (
                  <li key={ev.id}>
                    <strong>ไลฟ์</strong>
                    {' · '}{ev.startTime ? `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''} น.` : 'เวลาต้องตรวจเพิ่ม'}
                    {' · '}{ev.titleTh}
                  </li>
                ))}
              </ul>
            )}
            {(agenda.sourceFocus || []).map((ev) => (
              <p key={ev.id} className="mt-1 flex gap-2 text-xs text-rose-900/90 dark:text-rose-100/90">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {ev.kind === 'logistics' ? 'ธุรการ' : 'โฟกัสอ่าน'}
                  {ev.startTime ? ` · ${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''} น.` : ' · ไม่มีเวลาไลฟ์ในโปสเตอร์'}
                  {' · '}{ev.titleTh}
                </span>
              </p>
            ))}
          </div>
        )}

        {(liveAttend.length > 0 || liveUncertain.length > 0) && (
          <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-3 dark:border-amber-950 dark:bg-amber-950/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-950 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" /> ไลฟ์/ช่วงเวลาชนกัน — คำแนะนำ
            </h3>
            <ul className="mt-2 space-y-3 text-xs text-amber-950 dark:text-amber-50">
              {liveAttend.map((d) => (
                <li key={`${d.attendLive.id}-${d.watchLater.id}`} className="rounded-lg border border-amber-200/80 bg-white/60 p-2 dark:border-amber-900 dark:bg-slate-900/40">
                  <p><strong>เข้าเรียนสด:</strong> {d.attendLive.startTime}–{d.attendLive.endTime} · {d.attendLive.title}</p>
                  <p className="mt-1"><strong>ดูย้อนหลัง:</strong> {d.watchLater.startTime}–{d.watchLater.endTime} · {d.watchLater.title}</p>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">เหตุผล: {d.reasonTh}</p>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">{d.watchLaterHintTh}</p>
                </li>
              ))}
              {liveUncertain.map((d) => (
                <li key={`u-${d.a.id}-${d.b.id}`} className="rounded-lg border border-rose-200 bg-rose-50/50 p-2 dark:border-rose-900 dark:bg-rose-950/30">
                  <p className="font-semibold">ยังตัดสินใจไม่ได้ · {d.overlapTh}</p>
                  <p className="mt-1">{d.a.title} ↔ {d.b.title}</p>
                  <p className="mt-1">{d.reasonTh}</p>
                  <p className="mt-1 font-medium">{d.askUserTh}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 py-3 sm:px-5">
          {total === 0 ? (
            <div className="space-y-3 py-8 text-center text-sm text-slate-500">
              <p>ตรวจตารางต้นทางและแผนแล้ว — ยังไม่มีงานวันนี้</p>
              <p className="text-xs">ลองสร้าง/รีเฟรชแผน 100 หรือเปิดคลังหลักสูตร</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-primary text-xs" onClick={openForceRegenPreview}>สร้างแผน 100</button>
                <Link to="/library" className="btn-secondary text-xs">คลังหลักสูตร</Link>
                <Link to="/audit" className="btn-secondary text-xs">ตรวจรายการซ้ำ</Link>
              </div>
            </div>
          ) : (
            <ol className="space-y-2">
              {pct === 100 ? (
                <li className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center text-sm font-bold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  เสร็จทั้งหมดแล้ว — รายการด้านล่างยังแก้สถานะได้
                </li>
              ) : null}
              {timeline.blocks.map((block, idx) => {
                if (block.isLunch || block.isBreak) {
                  return (
                    <li key={`brk-${block.startTime}-${idx}`} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">
                      <Coffee className="h-4 w-4 shrink-0" />
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{block.startTime}–{block.endTime}</span>
                      <span>{block.title}</span>
                    </li>
                  )
                }
                const task = block.task
                const done = task?.status === 'done'
                const status = done ? 'done' : (task?.status === 'in_progress' || task?.status === 'doing' ? 'in_progress' : 'not_started')
                return (
                  <li key={block.taskId || `${block.startTime}-${idx}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-900 dark:bg-primary-900/50 dark:text-primary-100">
                          {idx + 1}
                        </span>
                        {task ? (
                          <button
                            type="button"
                            className={`h-5 w-5 rounded border ${done ? 'border-emerald-500 bg-emerald-500' : status === 'in_progress' ? 'border-amber-500 bg-amber-400' : 'border-slate-300'}`}
                            aria-label={statusLabelTh(status)}
                            onClick={() => cycleStatus(task.id)}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          <span className="mr-1 font-mono text-primary-800 dark:text-primary-200">{block.startTime}–{block.endTime}</span>
                          {block.kind === 'live' ? (
                            <span className="mr-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">ไลฟ์</span>
                          ) : null}
                          {block.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {block.priorityLabelTh}
                          {' · '}≈ {block.durationMinutes} นาที
                          {' · '}{block.roleTh}
                          {task ? ` · ${statusLabelTh(status)}` : ''}
                        </p>
                      </div>
                      {task ? (
                        <div className="flex flex-col items-end gap-1">
                          <TaskOpenButtons task={task} />
                          <button type="button" className="text-[10px] text-slate-500 underline" onClick={() => toggleCurated(task.id)}>
                            {done ? 'ยกเลิกเสร็จ' : 'เรียนแล้ว'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        {timeline.deferred.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">เลื่อนออกจากวันนี้ (งบเวลาเต็ม)</h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
              {timeline.deferred.map((d) => (
                <li key={d.task.id}>
                  {d.priorityLabelTh} · {d.task.title}
                  {d.durationMinutes ? ` · ≈ ${d.durationMinutes} นาที` : ''}
                  {' — '}{d.reasonTh}
                </li>
              ))}
            </ul>
            {overdueCount > 0 || timeline.deferred.length > 0 ? (
              <button type="button" className="btn-secondary mt-2 text-xs" onClick={handleReschedule}>
                <CalendarClock className="h-3.5 w-3.5" /> เลื่อนงานค้างอัตโนมัติ
              </button>
            ) : null}
          </div>
        )}

        {timeline.unknownDuration.length > 0 && (
          <div className="border-t border-amber-100 px-5 py-3 text-xs text-amber-900 dark:border-amber-950 dark:text-amber-100">
            <p className="font-semibold">ความยาวคลิปยังไม่ชัดในข้อมูล ({timeline.unknownDuration.length})</p>
            <ul className="mt-1 list-disc pl-4">
              {timeline.unknownDuration.slice(0, 5).map((u) => (
                <li key={u.task.id}>{u.task.title} — {u.reasonTh}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800">
          {timeline.assumptionsTh.map((n) => <p key={n}>· {n}</p>)}
          <p className="mt-1">
            คลัง: URL ซ้ำ รอยืนยัน {overlap.summary.sharedUrlPendingGroups ?? overlap.summary.chooseOneGroups} กลุ่ม
            · เสริมกัน (รอยืนยัน) {overlap.summary.complementaryGroups}
            · must ที่ไม่แชร์ URL {overlap.summary.mustUnique}
            · ไม่แนะนำข้ามบทจาก URL ซ้ำอย่างเดียว
            {' · '}<Link to="/audit" className="underline">เปิดตรวจรายการซ้ำ</Link>
          </p>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button type="button" className="btn-primary text-sm" onClick={() => markAll(true)}>
              <CheckCheck className="h-4 w-4" /> ทำครบทั้งหมด
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => markAll(false)}>
              <RotateCcw className="h-4 w-4" /> รีเซ็ตวันนี้
            </button>
            <Link to="/overview" className="btn-secondary text-sm">แผนภาพรวม</Link>
            <Link to="/audit" className="btn-secondary text-sm">ตรวจซ้ำ</Link>
          </div>
        )}
      </section>

      <details className="card text-sm">
        <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">
          เครื่องมือจัดการแผน (ขั้นสูง)
        </summary>
        <div className="mt-3 space-y-3">
          <VictoryPlanCard />
          <p className="text-xs text-slate-500">คลัง {CURATED_CATALOG_VERSION}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-xs" onClick={openForceRegenPreview} disabled={forceBusy}>
              สร้าง / รีเฟรชแผน 100
            </button>
            <button type="button" className="btn-secondary text-xs" onClick={openClearManagedPreview} disabled={clearBusy}>
              ล้างงาน curated/ไลฟ์
            </button>
            <Link to="/library" className="btn-secondary text-xs">คลังหลักสูตร</Link>
            <Link to="/dashboard" className="btn-secondary text-xs">ภาพรวมสถิติ</Link>
          </div>
          <div className="card flex flex-wrap items-center gap-4 !p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Clock3 className="h-4 w-4 text-primary-700" /> ถึง{getPrimaryExam().title}
            </div>
            <div className="font-mono text-lg font-semibold text-rose-600 dark:text-rose-300">
              {countdown.isPast ? 0 : countdown.days} วัน
            </div>
          </div>
          {rescheduleMsg ? <p className="text-xs text-emerald-800 dark:text-emerald-200" role="status">{rescheduleMsg}</p> : null}
        </div>
      </details>

      <ForceRegenConfirmDialog
        open={forceDialogOpen}
        preview={forcePreview}
        busy={forceBusy}
        onCancel={cancelForceRegenPreview}
        onConfirm={confirmForceRegen}
      />
      <ClearManagedConfirmDialog
        open={clearDialogOpen}
        preview={clearPreview}
        busy={clearBusy}
        onCancel={cancelClearManagedPreview}
        onConfirm={confirmClearManaged}
      />
    </div>
  )
}

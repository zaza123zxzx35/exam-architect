import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCheck, Clock3, RotateCcw, CalendarClock, ListOrdered, Radio } from 'lucide-react'
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
import { buildDailyAgenda } from '../lib/curated/dailyAgenda.js'
import TaskOpenButtons from '../components/TaskOpenButtons.jsx'
import VictoryPlanCard from '../components/VictoryPlanCard.jsx'
import ForceRegenConfirmDialog from '../components/ForceRegenConfirmDialog.jsx'
import ClearManagedConfirmDialog from '../components/ClearManagedConfirmDialog.jsx'
import {
  buildForceRegenPreview,
} from '../lib/curated/victoryPlan.js'

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

  const agenda = useMemo(
    () => buildDailyAgenda({ schedule, todayIso }),
    [schedule, todayIso],
  )
  const todayTasks = agenda.items
  const doneCount = agenda.counts.done
  const total = agenda.counts.total
  const pct = total ? Math.round((doneCount / total) * 100) : 0
  const overdueCount = (schedule.tasks || []).filter(
    t => (t.status === 'pending' || t.status === 'deferred') && t.plannedDate && t.plannedDate < todayIso,
  ).length

  const toggleCurated = (taskId) => {
    setSchedule((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => {
        if (String(t.id) !== String(taskId)) return t
        return { ...t, status: t.status === 'done' ? 'pending' : 'done' }
      }),
    }))
  }

  const markAll = (done) => {
    const ids = new Set(todayTasks.map(t => String(t.id)))
    setSchedule((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => (
        ids.has(String(t.id)) ? { ...t, status: done ? 'done' : 'pending' } : t
      )),
    }))
  }

  const cycleStatus = (taskId) => {
    setSchedule((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).map((t) => {
        if (String(t.id) !== String(taskId)) return t
        const s = String(t.status || 'pending')
        if (s === 'pending' || s === 'deferred') return { ...t, status: 'in_progress' }
        if (s === 'in_progress' || s === 'doing') return { ...t, status: 'done' }
        return { ...t, status: 'pending' }
      }),
    }))
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
    // Preview only — schedule must stay unchanged until confirm.
    try {
      setClearPreview(buildClearManagedPreview(schedule))
      setClearDialogOpen(true)
      setRescheduleMsg('เปิดหน้าต่างยืนยันแล้ว — กดยืนยันเพื่อล้าง curated/ไลฟ์')
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
      /** @type {null | ReturnType<typeof commitClearManagedTasks>} */
      let applied = null
      setSchedule((prev) => {
        applied = commitClearManagedTasks(prev)
        return applied.schedule
      })
      setRescheduleMsg(
        applied?.removedCount > 0
          ? `ล้างงาน curated/ไลฟ์แล้ว ${applied.removedCount} รายการ · คงงานอื่น ${applied.keptCount}`
          : 'ไม่มีงาน curated/ไลฟ์ให้ลบ',
      )
    } finally {
      setClearBusy(false)
      setClearDialogOpen(false)
      setClearPreview(null)
    }
  }

  const openForceRegenPreview = () => {
    // Preview only — schedule must stay unchanged until confirm.
    try {
      setForcePreview(buildForceRegenPreview(schedule))
      setForceDialogOpen(true)
      setRescheduleMsg('เปิดหน้าต่างยืนยันแล้ว — กดยืนยันเพื่อจัดแผน 100/100')
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
      /** @type {null | ReturnType<typeof commitForceVictoryPlan>} */
      let applied = null
      setSchedule((prev) => {
        applied = commitForceVictoryPlan(prev, {
          todayIso,
          declareBelief: true,
        })
        return applied.schedule
      })
      const keepNote = applied?.preservedManagedCount > 0
        ? ` · คงงาน done/userEdited ${applied.preservedManagedCount}`
        : ''
      setRescheduleMsg(
        applied?.readiness?.isPerfect
          ? `แผนพาบรรจุ ${applied.readiness.score}/100 พร้อมแล้ว — เชื่อแล้วพยายามทุกวัน${keepNote}`
          : `สร้างแผนแล้ว ${applied?.readiness?.score ?? '—'}/100${keepNote}`,
      )
    } finally {
      setForceBusy(false)
      setForceDialogOpen(false)
      setForcePreview(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <VictoryPlanCard />

      <section className="card border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
          คลัง {CURATED_CATALOG_VERSION} · ภาค ข ก่อน + ไลฟ์เลดี้ + VIP + ทบทวนทดแทน Drive
        </p>
        <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-100/90">
          งานด้านล่างมีปุ่ม <strong>เปิดคลิปติว</strong> หรือ <strong>คัดลอก URL</strong>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary text-xs"
            onClick={openForceRegenPreview}
            disabled={forceBusy}
          >
            สร้าง / รีเฟรชแผน 100
          </button>
          <Link to="/overview" className="btn-secondary text-xs">แผนภาพรวม</Link>
          <Link to="/library" className="btn-secondary text-xs">คลังหลักสูตร</Link>
          <button
            type="button"
            className="btn-secondary text-xs"
            onClick={openClearManagedPreview}
            disabled={clearBusy}
          >
            ล้างงาน curated/ไลฟ์ในเครื่องนี้
          </button>
        </div>
      </section>

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

      <section className="card flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Clock3 className="h-4 w-4 text-primary-700" /> นับถอยหลังถึง{getPrimaryExam().title}
        </div>
        <div className="flex gap-2">
          {[
            { label: 'วัน', value: countdown.isPast ? 0 : countdown.days },
            { label: 'ชม.', value: countdown.isPast ? 0 : countdown.hours },
            { label: 'นาที', value: countdown.isPast ? 0 : countdown.minutes },
          ].map(unit => (
            <div key={unit.label} className="min-w-[3.5rem] rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
              <div className="font-mono text-xl font-semibold text-rose-600 dark:text-rose-300">{unit.value}</div>
              <div className="text-[10px] text-slate-500">{unit.label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{getPrimaryExam().labelLong}</div>
      </section>

      <section className="card !p-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <CalendarDays className="h-5 w-5 text-primary-700" /> วันนี้ต้องติวอะไร?
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatThaiPlanDate(todayIso)} · ไลฟ์จริงแยกจากงานอ่านแนะนำ · ไม่สร้างเวลานัดเอง
            </p>
          </div>
          {total > 0 && (
            <div className="text-right text-xs text-slate-500">
              {doneCount}/{total} งาน · {pct}%
              <div className="mt-0.5 text-[10px] text-slate-400">
                ไลฟ์ {agenda.counts.lives} · อ่านเอง {agenda.counts.selfStudy}
              </div>
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {agenda.sourceLives.length > 0 && (
          <div className="border-b border-rose-100 bg-rose-50/70 px-5 py-3 dark:border-rose-950 dark:bg-rose-950/20">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-950 dark:text-rose-100">
              <Radio className="h-4 w-4" /> ไลฟ์สดต้นทางวันนี้ ({agenda.sourceLives.length})
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs text-rose-900/90 dark:text-rose-100/90">
              {agenda.sourceLives.map((ev) => (
                <li key={ev.id}>
                  <span className="font-semibold">
                    {ev.startTime ? `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''} น.` : 'เวลาตามโปสเตอร์'}
                  </span>
                  {' · '}{ev.titleTh}
                  <span className="text-rose-800/70 dark:text-rose-200/70"> · {ev.sourceTh}</span>
                </li>
              ))}
            </ul>
            {agenda.counts.lives === 0 ? (
              <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
                มีไลฟ์ต้นทางแต่ยังไม่ผสานเข้าแผน — กด「สร้าง / รีเฟรชแผน 100」
              </p>
            ) : null}
          </div>
        )}

        {agenda.sections.prep.length > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">เตรียมก่อนไลฟ์</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
              {agenda.sections.prep.map((p) => (
                <li key={p.liveId}>{p.prepTh}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 py-2 sm:px-5">
          {total === 0 ? (
            <div className="space-y-3 py-10 text-center text-sm text-slate-500">
              <p>ยังไม่มีงานวันนี้ในแผนที่ผสานแล้ว</p>
              <p className="text-xs">กด「สร้าง / รีเฟรชแผน 100」หรือเปิดคลังหลักสูตร</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/library" className="inline-flex font-semibold text-primary-800 hover:underline dark:text-primary-200">
                  เปิดคลังหลักสูตร
                </Link>
                <Link to="/audit" className="inline-flex font-semibold text-primary-800 hover:underline dark:text-primary-200">
                  ตรวจรายการซ้ำ
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {pct === 100 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                  <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">เสร็จทั้งหมดแล้ว!</div>
                  <p className="mt-0.5 text-xs text-slate-500">รายการด้านล่างยังกดเปลี่ยนสถานะได้ · หรือเปิดแผนภาพรวมดูวันถัดไป</p>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <ListOrdered className="h-3.5 w-3.5" /> ลำดับแนะนำ 1 → {total}
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {todayTasks.map((item) => {
                  const done = item.status === 'done'
                  const task = item.task
                  return (
                    <li key={item.id} className="flex flex-wrap items-start gap-3 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-900 dark:bg-primary-900/50 dark:text-primary-100">
                          {item.order}
                        </span>
                        <button
                          type="button"
                          className={`h-5 w-5 shrink-0 rounded border ${done ? 'border-emerald-500 bg-emerald-500' : item.status === 'in_progress' ? 'border-amber-500 bg-amber-400' : 'border-slate-300'}`}
                          aria-label={`สถานะ: ${statusLabelTh(item.status)} — กดเพื่อสลับ`}
                          title={statusLabelTh(item.status)}
                          onClick={() => cycleStatus(item.id)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {item.isRealLive ? (
                            <span className="mr-1.5 inline-flex rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-200">ไลฟ์จริง</span>
                          ) : (
                            <span className="mr-1.5 inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">อ่านเอง</span>
                          )}
                          {item.clockLabelTh ? (
                            <span className={`mr-1.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${item.clockPhase === 'live_now' ? 'bg-rose-600 text-white' : item.clockPhase === 'soon' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                              {item.clockLabelTh}
                            </span>
                          ) : null}
                          {item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ''} · ` : ''}
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {[item.partLabelTh, item.subjectLabelTh, item.seriesTh]
                            .filter(Boolean)
                            .join(' · ')}
                          {item.estimatedMinutes ? ` · ≈ ${item.estimatedMinutes} นาที` : ''}
                          {' · '}{statusLabelTh(item.status)}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                          เหตุผลลำดับ: {item.orderReasonTh}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <TaskOpenButtons task={task} />
                        <button
                          type="button"
                          className="text-[10px] text-slate-500 underline"
                          onClick={() => toggleCurated(item.id)}
                        >
                          {done ? 'ยกเลิกเสร็จ' : 'ทำเครื่องหมายเสร็จ'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {agenda.sections.postReview.length > 0 && total > 0 && (
          <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">ทบทวนหลังเรียน</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
              {agenda.sections.postReview.map((r) => (
                <li key={r.afterId}>
                  <span className="font-medium">{r.titleTh}</span> — {r.actionTh}
                </li>
              ))}
            </ul>
          </div>
        )}

        {agenda.notesTh?.length ? (
          <ul className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800">
            {agenda.notesTh.map((n) => <li key={n}>· {n}</li>)}
          </ul>
        ) : null}

        {total > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button type="button" className="btn-primary text-sm" onClick={() => markAll(true)}>
              <CheckCheck className="h-4 w-4" /> ทำครบทั้งหมด
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => markAll(false)}>
              <RotateCcw className="h-4 w-4" /> รีเซ็ตวันนี้
            </button>
            {overdueCount > 0 && (
              <button type="button" className="btn-secondary text-sm" onClick={handleReschedule}>
                <CalendarClock className="h-4 w-4" /> เลื่อนงานค้าง ({overdueCount})
              </button>
            )}
            <Link to="/overview" className="btn-secondary text-sm">ดูภาพรวมแผน</Link>
            <Link to="/audit" className="btn-secondary text-sm">ตรวจรายการซ้ำ</Link>
            <Link to="/review" className="btn-secondary text-sm">ทบทวนข้อผิด</Link>
          </div>
        )}
      </section>

      {rescheduleMsg ? (
        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200" role="status">
          {rescheduleMsg}
        </p>
      ) : null}
    </div>
  )
}

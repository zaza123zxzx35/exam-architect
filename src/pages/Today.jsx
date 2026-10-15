import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCheck, Clock3, RotateCcw, CalendarClock, ExternalLink } from 'lucide-react'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { bangkokTodayIso } from '../data/htmlPlannerData'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'
import { getPrimaryExam } from '../data/examCalendar'
import { HUB_EXAM_PART_LABELS, HUB_SUBJECT_LABELS } from '../lib/study/hub.js'
import { CURATED_CATALOG_VERSION } from '../data/curatedCatalog.js'
import { canOpenExternally } from '../lib/curated/urlStatus.js'

function subjectLabel(id) {
  return HUB_SUBJECT_LABELS[id] || id || 'ยังไม่จัดวิชา'
}

export default function Today() {
  const countdown = useExamCountdown()
  const { schedule, setSchedule, runReschedule } = useScheduleStore()
  const [rescheduleMsg, setRescheduleMsg] = useState('')
  const todayIso = bangkokTodayIso()

  const todayTasks = useMemo(() => {
    return (schedule.tasks || [])
      .filter(t => t && t.plannedDate === todayIso)
      .sort((a, b) => {
        const ta = String(a.startTime || '')
        const tb = String(b.startTime || '')
        if (ta !== tb) return ta.localeCompare(tb)
        return String(a.title || '').localeCompare(String(b.title || ''), 'th')
      })
  }, [schedule.tasks, todayIso])

  const doneCount = todayTasks.filter(t => t.status === 'done').length
  const total = todayTasks.length
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

  const clearCuratedPlan = () => {
    setSchedule((prev) => ({
      ...prev,
      tasks: (prev.tasks || []).filter((t) => {
        const id = String(t.id || '')
        const origin = String(t.origin || '')
        if (id.startsWith('curated_') || id.startsWith('live_')) return false
        if (origin === 'curated-unified-plan' || origin === 'curated-part-b-29' || origin === 'live-tutor-schedule') {
          return false
        }
        return true
      }),
      updatedAt: new Date().toISOString(),
    }))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
          โหมดเริ่มใหม่ (คลังว่าง · {CURATED_CATALOG_VERSION})
        </p>
        <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/90">
          กำลังรอชุดแรก: <strong>วิชาเอกอังกฤษ ข + อังกฤษ ก · ครูเลดี้เก๋เก๋</strong>
          — เมื่อใส่คลังแล้ว วันนี้จะบอกชัดว่าติวคลิปไหน ของใคร แล้วค่อยทำข้อสอบอันไหน
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link to="/library" className="btn-secondary text-xs">ไปคลังหลักสูตร</Link>
          <button type="button" className="btn-secondary text-xs" onClick={clearCuratedPlan}>
            ล้างงาน curated/ไลฟ์เก่าในเครื่องนี้
          </button>
        </div>
      </section>

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
              <CalendarDays className="h-5 w-5 text-primary-700" /> วันนี้ติวอะไร?
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {formatThaiPlanDate(todayIso)} · จากตารางที่ผสานแล้วเท่านั้น (ไม่ปนแผน HTML เก่า)
            </p>
          </div>
          {total > 0 && (
            <div className="text-right text-xs text-slate-500">
              {doneCount}/{total} งาน · {pct}%
            </div>
          )}
        </div>

        {total > 0 && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        <div className="px-4 py-2 sm:px-5">
          {total === 0 ? (
            <div className="space-y-3 py-10 text-center text-sm text-slate-500">
              <p>ยังไม่มีงานวันนี้ — คลังถูกเคลียร์เพื่อเริ่มใหม่</p>
              <p className="text-xs">
                ขั้นตอนถัดไป: ล็อกอิน Facebook ในเบราว์เซอร์เอเจนต์ หรือคัดลอกรายการจากโพสต์ครูเลดี้เก๋เก๋มาใส่แชท
              </p>
              <Link to="/library" className="inline-flex font-semibold text-primary-800 hover:underline dark:text-primary-200">
                เปิดคลังหลักสูตร
              </Link>
            </div>
          ) : pct === 100 ? (
            <div className="py-8 text-center">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">เสร็จทั้งหมดแล้ว!</div>
              <p className="mt-1 text-sm text-slate-500">พักได้ หรือเปิดแผนภาพรวมดูวันถัดไป</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {todayTasks.map((task) => {
                const done = task.status === 'done'
                const partLabel = HUB_EXAM_PART_LABELS[task.examPart] || task.examPart || ''
                const openUrl = task.resourceUrl && canOpenExternally(task.urlStatus)
                  ? task.resourceUrl
                  : null
                return (
                  <li key={task.id} className="flex flex-wrap items-start gap-3 py-3">
                    <button
                      type="button"
                      className={`mt-0.5 h-5 w-5 shrink-0 rounded border ${done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}
                      aria-label={done ? 'ทำเครื่องหมายยังไม่เสร็จ' : 'ทำเครื่องหมายเสร็จ'}
                      onClick={() => toggleCurated(task.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {task.startTime ? `${task.startTime}${task.endTime ? `–${task.endTime}` : ''} · ` : ''}
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {[partLabel, subjectLabel(task.subjectId), task.tutorTh || task.seriesTh]
                          .filter(Boolean)
                          .join(' · ')}
                        {task.estimatedMinutes ? ` · ≈ ${task.estimatedMinutes} นาที` : ''}
                      </p>
                      {task.reasonTh ? (
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{task.reasonTh}</p>
                      ) : null}
                    </div>
                    {openUrl ? (
                      <a
                        className="btn-secondary text-xs"
                        href={openUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> เปิดคลิป
                      </a>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

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
            {rescheduleMsg && (
              <p className="w-full text-xs text-slate-500">{rescheduleMsg}</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

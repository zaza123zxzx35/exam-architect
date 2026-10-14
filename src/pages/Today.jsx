import { Link } from 'react-router-dom'
import { CalendarDays, CheckCheck, Clock3, RotateCcw } from 'lucide-react'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { useHtmlPlannerState } from '../hooks/useHtmlPlannerState'
import {
  bangkokTodayIso,
  dailyPlan,
  getDayIndexForDate,
  getPlanDateByIndex,
  motivators,
} from '../data/htmlPlannerData'
import { dayCompletion } from '../lib/planner/htmlPlannerState'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'
import TaskList from '../components/planner/TaskList'
import { getPrimaryExam } from '../data/examCalendar'

export default function Today() {
  const countdown = useExamCountdown()
  const { state, toggleTask, markAll, setNote } = useHtmlPlannerState()
  const todayIso = bangkokTodayIso()
  const dayIndex = getDayIndexForDate(todayIso)
  const inRange = dayIndex >= 0 && dayIndex < dailyPlan.length
  const tasks = inRange ? dailyPlan[dayIndex] : []
  const dateIso = inRange ? getPlanDateByIndex(dayIndex) : todayIso
  const completion = dayCompletion(state, dateIso, tasks)
  const motivator = motivators[((dayIndex % motivators.length) + motivators.length) % motivators.length]
  const storedNote = state.notes[dateIso] || ''

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card border-primary-100 bg-gradient-to-br from-primary-50 to-white dark:border-primary-900/40 dark:from-primary-950/40 dark:to-slate-900">
        <div className="text-sm font-semibold text-primary-800 dark:text-primary-200">{motivator.m}</div>
        <div className="mt-1 text-xs text-primary-700/80 dark:text-primary-300/80">{motivator.t}</div>
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
              {inRange
                ? `วันที่ ${dayIndex + 1}/${dailyPlan.length} · ${formatThaiPlanDate(dateIso)}`
                : `นอกช่วงแผน 34 วัน (${formatThaiPlanDate(todayIso)})`}
            </p>
          </div>
          {inRange && (
            <div className="text-right text-xs text-slate-500">
              {completion.done}/{completion.total} งาน · {completion.pct}%
            </div>
          )}
        </div>

        {inRange && (
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="progress-bar"><div className="progress-fill" style={{ width: `${completion.pct}%` }} /></div>
          </div>
        )}

        <div className="px-4 py-2 sm:px-5">
          {!inRange ? (
            <div className="py-10 text-center text-sm text-slate-500">
              หมดช่วงแผนรายวันแล้ว — ไปโฟกัสทำข้อสอบและทบทวนจุดอ่อนได้ที่{' '}
              <Link to="/plan" className="font-semibold text-primary-800 hover:underline dark:text-primary-200">แผนการอ่าน</Link>
              {' '}หรือ{' '}
              <Link to="/history" className="font-semibold text-primary-800 hover:underline dark:text-primary-200">ย้อนดูวัน</Link>
            </div>
          ) : completion.complete ? (
            <div className="py-8 text-center">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">เสร็จทั้งหมดแล้ว!</div>
              <p className="mt-1 text-sm text-slate-500">เก่งมาก พักผ่อนหรือทบทวนเพิ่มเติมได้</p>
            </div>
          ) : (
            <TaskList dateIso={dateIso} tasks={tasks} state={state} onToggle={toggleTask} />
          )}
        </div>

        {inRange && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button type="button" className="btn-primary text-sm" onClick={() => markAll(dateIso, tasks.length, true)}>
              <CheckCheck className="h-4 w-4" /> ทำครบทั้งหมด
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => markAll(dateIso, tasks.length, false)}>
              <RotateCcw className="h-4 w-4" /> รีเซ็ตวันนี้
            </button>
            <Link to="/overview" className="btn-secondary text-sm">ดูภาพรวมแผน</Link>
          </div>
        )}
      </section>

      {inRange && (
        <section className="card">
          <label className="label" htmlFor="daily-note">บันทึกของวันนี้</label>
          <textarea
            key={dateIso}
            id="daily-note"
            className="input min-h-[96px]"
            placeholder="จด Weak Point หรือสิ่งที่เรียนรู้วันนี้..."
            defaultValue={storedNote}
            onBlur={e => setNote(dateIso, e.target.value)}
          />
          <p className="mt-2 text-[11px] text-slate-500">บันทึกเมื่อออกจากช่องข้อความ · ใช้คีย์เดียวกับแผนติว HTML เดิม</p>
        </section>
      )}
    </div>
  )
}

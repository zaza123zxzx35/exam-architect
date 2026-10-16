import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useHtmlPlannerState } from '../hooks/useHtmlPlannerState'
import {
  bangkokTodayIso,
  dailyPlan,
  getDayIndexForDate,
  getPlanDateByIndex,
  phases,
} from '../data/htmlPlannerData'
import { dayCompletion } from '../lib/planner/htmlPlannerState'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'
import TaskList from '../components/planner/TaskList'

export default function History() {
  const { state, toggleTask } = useHtmlPlannerState()
  const [params, setParams] = useSearchParams()
  const todayIdx = getDayIndexForDate(bangkokTodayIso())
  const defaultIdx = todayIdx >= 0 && todayIdx < dailyPlan.length ? todayIdx : 0

  const dayIndex = useMemo(() => {
    const raw = params.get('day')
    if (raw == null || raw === '') return defaultIdx
    const n = Number(raw)
    if (!Number.isFinite(n)) return defaultIdx
    return Math.max(0, Math.min(dailyPlan.length - 1, Math.floor(n)))
  }, [params, defaultIdx])

  const dateIso = getPlanDateByIndex(dayIndex)
  const tasks = dailyPlan[dayIndex] || []
  const completion = dayCompletion(state, dateIso, tasks)

  const go = (next) => {
    const clamped = Math.max(0, Math.min(dailyPlan.length - 1, next))
    setParams({ day: String(clamped) })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card border-amber-200 bg-amber-50/80 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <p className="font-semibold text-amber-950 dark:text-amber-100">
          ประวัติแผน HTML เดิม (34 วัน)
        </p>
        <p className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/90">
          หน้านี้ยังใช้แผน HTML เก่า — ไม่ใช่แผนพาบรรจุ 100 / งาน curated ที่หน้าวันนี้และภาพรวม
          · ติ๊กงานที่นี่จะอัปเดตเฉพาะแถว HTML ไม่ทับตารางหลัก
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link to="/today" className="btn-secondary text-xs">ไปหน้าวันนี้</Link>
          <Link to="/overview" className="btn-secondary text-xs">แผนภาพรวม</Link>
        </div>
      </section>

      <section className="card space-y-3">
        <label className="label" htmlFor="hist-day">เลือกวันที่ต้องการดูหรือแก้ไข (แผน HTML)</label>
        <select
          id="hist-day"
          className="input"
          value={dayIndex}
          onChange={e => go(Number(e.target.value))}
        >
          {dailyPlan.map((_, index) => (
            <option key={index} value={index}>
              วัน {index + 1} — {formatThaiPlanDate(getPlanDateByIndex(index))}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary text-sm" disabled={dayIndex <= 0} onClick={() => go(dayIndex - 1)}>
            <ChevronLeft className="h-4 w-4" /> วันก่อน
          </button>
          <button type="button" className="btn-secondary text-sm" disabled={dayIndex >= dailyPlan.length - 1} onClick={() => go(dayIndex + 1)}>
            วันถัดไป <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="card !p-0 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            วันที่ {dayIndex + 1}/{dailyPlan.length}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{formatThaiPlanDate(dateIso)} · {completion.done}/{completion.total} งาน ({completion.pct}%)</p>
          <div className="progress-bar mt-3"><div className="progress-fill" style={{ width: `${completion.pct}%` }} /></div>
        </div>
        <div className="px-4 py-2 sm:px-5">
          <TaskList dateIso={dateIso} tasks={tasks} state={state} onToggle={toggleTask} />
        </div>
      </section>

      <section className="card">
        <h3 className="font-bold text-slate-900 dark:text-white">แผน 5 Phase (จาก HTML เดิม)</h3>
        <ul className="mt-3 space-y-3">
          {phases.map((item, index) => (
            <li key={item.name} className="border-b border-slate-100 pb-3 text-sm last:border-0 dark:border-slate-800">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{index + 1}. {item.name}</div>
              <div className="mt-0.5 font-mono text-xs text-primary-800 dark:text-primary-200">{item.range}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

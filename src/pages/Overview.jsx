import { Link } from 'react-router-dom'
import { Flame, Map as MapIcon } from 'lucide-react'
import { useHtmlPlannerState } from '../hooks/useHtmlPlannerState'
import {
  bangkokTodayIso,
  dailyPlan,
  getDayIndexForDate,
  getPlanDateByIndex,
} from '../data/htmlPlannerData'
import { dayCompletion } from '../lib/planner/htmlPlannerState'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'

export default function Overview() {
  const { state } = useHtmlPlannerState()
  const todayIdx = getDayIndexForDate(bangkokTodayIso())

  const dayStats = dailyPlan.map((tasks, index) => {
    const dateIso = getPlanDateByIndex(index)
    const stats = dayCompletion(state, dateIso, tasks)
    return { index, dateIso, ...stats }
  })

  const completedDays = dayStats.filter(day => day.complete).length

  let streak = 0
  for (let i = Math.min(todayIdx, dailyPlan.length - 1); i >= 0; i -= 1) {
    if (dayStats[i]?.complete) streak += 1
    else break
  }

  const pct = Math.round((completedDays / dailyPlan.length) * 100)
  const upcoming = dayStats
    .filter(day => day.index >= Math.max(0, todayIdx) && !day.complete)
    .slice(0, 5)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-4 text-center">
          <div className="font-mono text-2xl font-semibold text-primary-700 dark:text-primary-300">{completedDays}</div>
          <div className="mt-1 text-[11px] text-slate-500">วันเสร็จ</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="flex items-center justify-center gap-1 font-mono text-2xl font-semibold text-rose-600 dark:text-rose-300">
            <Flame className="h-5 w-5" /> {streak}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Streak</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="font-mono text-2xl font-semibold text-amber-600 dark:text-amber-300">{pct}%</div>
          <div className="mt-1 text-[11px] text-slate-500">ความคืบหน้า</div>
        </div>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <MapIcon className="h-5 w-5 text-primary-700" /> แผนที่ {dailyPlan.length} วัน
        </div>
        <p className="mb-3 text-xs text-slate-500">
          <span className="text-emerald-700">■ ครบ</span>{' '}
          <span className="text-amber-600">■ บางส่วน</span>{' '}
          <span className="text-slate-400">■ ยัง</span> — คลิกเพื่อเปิดในหน้าย้อนดูวัน
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dayStats.map(day => {
            let color = 'bg-slate-200 dark:bg-slate-700'
            if (day.complete) color = 'bg-emerald-500'
            else if (day.done > 0) color = 'bg-amber-400'
            return (
              <Link
                key={day.dateIso}
                to={`/history?day=${day.index}`}
                title={`วัน ${day.index + 1}: ${day.done}/${day.total}`}
                className={`h-3 w-3 rounded-sm transition hover:scale-125 ${color}`}
                aria-label={`วัน ${day.index + 1} ${day.done} จาก ${day.total}`}
              />
            )
          })}
        </div>
        <div className="progress-bar mt-4"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-right text-xs text-slate-500">{completedDays} / {dailyPlan.length} วัน</p>
      </section>

      <section className="card">
        <h3 className="font-bold text-slate-900 dark:text-white">งานที่ยังไม่เสร็จ (วันถัดไป)</h3>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">ไม่มีงานค้าง — เก่งมาก!</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map(day => (
              <li key={day.dateIso} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <div className="font-semibold text-primary-900 dark:text-primary-100">
                    วัน {day.index + 1} ({formatThaiPlanDate(day.dateIso).split(' ').slice(1, 3).join(' ')})
                  </div>
                  <div className="text-xs text-slate-500">{day.done}/{day.total} เสร็จ</div>
                </div>
                <Link to={`/history?day=${day.index}`} className="text-xs font-semibold text-primary-800 hover:underline dark:text-primary-200">
                  เปิดวัน
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Map as MapIcon } from 'lucide-react'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { bangkokTodayIso } from '../data/htmlPlannerData'
import { formatThaiPlanDate } from '../lib/planner/formatThaiDate'
import { CURATED_CATALOG_VERSION } from '../data/curatedCatalog.js'
import { HUB_EXAM_PART_LABELS, HUB_SUBJECT_LABELS } from '../lib/study/hub.js'

export default function Overview() {
  const { schedule } = useScheduleStore()
  const todayIso = bangkokTodayIso()

  const curatedTasks = useMemo(
    () => (schedule.tasks || []).filter((t) => {
      if (!t?.plannedDate) return false
      const id = String(t.id || '')
      const origin = String(t.origin || '')
      return id.startsWith('curated_')
        || id.startsWith('live_')
        || origin === 'curated-unified-plan'
        || origin === 'curated-part-b-29'
        || origin === 'live-tutor-schedule'
    }),
    [schedule.tasks],
  )

  const byDate = useMemo(() => {
    /** @type {Map<string, typeof curatedTasks>} */
    const map = new Map()
    for (const t of curatedTasks) {
      const d = String(t.plannedDate)
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(t)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateIso, tasks]) => {
        const done = tasks.filter(t => t.status === 'done').length
        return {
          dateIso,
          tasks,
          done,
          total: tasks.length,
          complete: tasks.length > 0 && done === tasks.length,
        }
      })
  }, [curatedTasks])

  const completedDays = byDate.filter(d => d.complete).length
  const pct = byDate.length ? Math.round((completedDays / byDate.length) * 100) : 0

  let streak = 0
  for (let i = byDate.length - 1; i >= 0; i -= 1) {
    const day = byDate[i]
    if (day.dateIso > todayIso) continue
    if (day.complete) streak += 1
    else if (day.dateIso <= todayIso) break
  }

  const upcoming = byDate
    .filter(d => d.dateIso >= todayIso && !d.complete)
    .slice(0, 8)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card border-emerald-200 bg-emerald-50/80 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="font-semibold text-emerald-950 dark:text-emerald-100">แผนภาพรวม — 29 วันบังคับภาค ข</p>
        <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-100/90">
          คลัง {CURATED_CATALOG_VERSION} · ผสานไลฟ์เลดี้เก๋เก๋ + บล็อก VIP ต.ค.
          · ไม่ใช้แผน HTML 34 วันแบบปนหลายสำนัก
        </p>
        <Link to="/library" className="mt-2 inline-flex text-xs font-semibold text-primary-800 underline dark:text-primary-200">
          ไปคลังหลักสูตร
        </Link>
      </section>

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
          <MapIcon className="h-5 w-5 text-primary-700" /> แผนที่ {byDate.length || 0} วัน (จากตารางที่ผสาน)
        </div>
        {byDate.length === 0 ? (
          <p className="text-sm text-slate-500">
            ยังไม่มีวันในแผน — เมื่อใส่คลังครูเลดี้เก๋เก๋และผสานแผนแล้ว จะเห็นจุดสีตามวันที่นี่
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              <span className="text-emerald-700">■ ครบ</span>{' '}
              <span className="text-amber-600">■ บางส่วน</span>{' '}
              <span className="text-slate-400">■ ยัง</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {byDate.map(day => {
                let color = 'bg-slate-200 dark:bg-slate-700'
                if (day.complete) color = 'bg-emerald-500'
                else if (day.done > 0) color = 'bg-amber-400'
                return (
                  <Link
                    key={day.dateIso}
                    to="/today"
                    title={`${day.dateIso}: ${day.done}/${day.total}`}
                    className={`h-3 w-3 rounded-sm transition hover:scale-125 ${color}`}
                    aria-label={`${day.dateIso} ${day.done} จาก ${day.total}`}
                  />
                )
              })}
            </div>
            <div className="progress-bar mt-4"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-right text-xs text-slate-500">{completedDays} / {byDate.length} วัน</p>
          </>
        )}
      </section>

      <section className="card">
        <h3 className="font-bold text-slate-900 dark:text-white">งานที่ยังไม่เสร็จ (วันถัดไป)</h3>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            {byDate.length === 0 ? 'รอผสานแผนชุดแรก' : 'ไม่มีงานค้าง — เก่งมาก!'}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {upcoming.map(day => {
              const sample = day.tasks.slice(0, 2)
              return (
                <li key={day.dateIso} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-primary-900 dark:text-primary-100">
                      {formatThaiPlanDate(day.dateIso)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {day.done}/{day.total} เสร็จ
                      {sample.length ? ` · เช่น ${sample.map(t => t.title).join(' / ')}` : ''}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {[...new Set(day.tasks.map(t => [
                        HUB_EXAM_PART_LABELS[t.examPart] || t.examPart,
                        HUB_SUBJECT_LABELS[t.subjectId] || t.subjectId,
                      ].filter(Boolean).join(' ')))].slice(0, 3).join(' · ')}
                    </div>
                  </div>
                  <Link to="/today" className="shrink-0 text-xs font-semibold text-primary-800 hover:underline dark:text-primary-200">
                    เปิดวันนี้
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

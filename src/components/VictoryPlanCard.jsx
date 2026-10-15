import { Link } from 'react-router-dom'
import { Flame, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { bangkokTodayIso } from '../data/htmlPlannerData'
import {
  CURATED_PLAN_SEED_META_KEY,
  ensureCuratedPartB29Seed,
} from '../lib/curated/seedPartB29Plan.js'
import {
  scoreVictoryReadiness,
  setVictoryEffort,
  VICTORY_META_KEY,
  VICTORY_PLAN_VERSION,
  VICTORY_SEED_META_KEY,
} from '../lib/curated/victoryPlan.js'

/**
 * แผนพาบรรจุ 100 — readiness meter + regenerate with belief.
 */
export default function VictoryPlanCard({ compact = false }) {
  const { schedule, setSchedule } = useScheduleStore()
  const [msg, setMsg] = useState('')
  const todayIso = bangkokTodayIso()

  const readiness = useMemo(
    () => scoreVictoryReadiness(schedule, { todayIso }),
    [schedule, todayIso],
  )

  const applyVictory100 = () => {
    setSchedule((prev) => {
      const clearedMeta = { ...(prev.meta || {}) }
      delete clearedMeta[CURATED_PLAN_SEED_META_KEY]
      delete clearedMeta[VICTORY_SEED_META_KEY]
      delete clearedMeta.curatedPlanSeedVersion
      delete clearedMeta.curatedPlanSeedTodayIso
      delete clearedMeta.curatedPlanSeedTaskCount
      delete clearedMeta.curatedPlanSeedPartBOk
      delete clearedMeta.curatedPlanVictoryScore
      const base = {
        ...prev,
        tasks: (prev.tasks || []).filter((t) => {
          const id = String(t.id || '')
          const origin = String(t.origin || '')
          if (id.startsWith('curated_') || id.startsWith('live_') || id.startsWith('victory_')) return false
          if (
            origin === 'curated-unified-plan'
            || origin === 'curated-part-b-29'
            || origin === 'live-tutor-schedule'
            || origin === 'victory-plan-100'
          ) return false
          return true
        }),
        meta: clearedMeta,
      }
      const { schedule: next, readiness: scored } = ensureCuratedPartB29Seed(base, {
        todayIso,
        force: true,
        declareBelief: true,
      })
      setMsg(
        scored?.isPerfect
          ? `พร้อมรบ ${scored.score}/100 — สิ่งที่เป็นไปไม่ได้ จะเป็นไปได้ เพราะความเชื่อและพยายาม`
          : `อัปเดตแผนแล้ว ${scored?.score ?? '—'}/100 · ดูคันโยกที่ยังค้าง`,
      )
      return next
    })
  }

  const declareBeliefOnly = () => {
    setSchedule((prev) => {
      const { schedule: next, readiness: scored } = setVictoryEffort(prev, {
        beliefCommitted: true,
        beliefCommittedAt: new Date().toISOString(),
      })
      setMsg(`ยืนยันความเชื่อแล้ว · คะแนนแผน ${scored.score}/100`)
      return next
    })
  }

  return (
    <section className="card border-rose-200 bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 dark:border-rose-900 dark:from-rose-950/40 dark:via-amber-950/20 dark:to-emerald-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-rose-950 dark:text-rose-100">
            <Target className="h-4 w-4" /> แผนพาบรรจุ 100
            <span className="font-mono text-xs font-normal text-rose-800/80 dark:text-rose-200/80">
              {VICTORY_PLAN_VERSION}
            </span>
          </p>
          <p className="mt-1 text-xs text-rose-900/90 dark:text-rose-100/80">
            {readiness.creedTh}
          </p>
        </div>
        <div className="text-right">
          <div className={`font-mono text-3xl font-bold ${readiness.isPerfect ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
            {readiness.score}
            <span className="text-lg text-slate-500">/100</span>
          </div>
          <div className="text-[10px] text-slate-500">ความพร้อมแผนรบ</div>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-900/50">
        <div
          className={`h-full rounded-full transition-all ${readiness.isPerfect ? 'bg-emerald-500' : 'bg-rose-500'}`}
          style={{ width: `${Math.min(100, readiness.score)}%` }}
        />
      </div>

      {!compact && (
        <ul className="mt-3 space-y-1.5">
          {readiness.levers.map((lever) => (
            <li
              key={lever.id}
              className="flex items-start justify-between gap-2 text-xs text-slate-800 dark:text-slate-200"
            >
              <span>
                <span className={lever.done ? 'text-emerald-600' : 'text-amber-600'}>
                  {lever.done ? '✓' : '○'}
                </span>{' '}
                {lever.titleTh}
                <span className="mt-0.5 block text-[10px] text-slate-500 dark:text-slate-400">
                  {lever.beliefTh} · {lever.detailTh}
                </span>
              </span>
              <span className="shrink-0 font-mono text-slate-500">{lever.earned}/{lever.weight}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn-primary text-xs" onClick={applyVictory100}>
          <Sparkles className="mr-1 inline h-3.5 w-3.5" />
          จัดแผน 100/100
        </button>
        {!readiness.levers.find((l) => l.id === 'belief_streak')?.done && (
          <button type="button" className="btn-secondary text-xs" onClick={declareBeliefOnly}>
            <Flame className="mr-1 inline h-3.5 w-3.5" />
            ยืนยันความเชื่อ
          </button>
        )}
        <Link to="/today" className="btn-secondary text-xs">งานวันนี้</Link>
        <Link to="/library" className="btn-secondary text-xs">คลัง</Link>
      </div>

      {msg && (
        <p className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">{msg}</p>
      )}
      {schedule?.meta?.[VICTORY_META_KEY]?.effort?.beliefCommitted && (
        <p className="mt-2 text-[10px] text-slate-500">
          ความเชื่อถูกบันทึกแล้ว — เหลือแค่พยายามทำให้ครบทุกวัน
        </p>
      )}
    </section>
  )
}

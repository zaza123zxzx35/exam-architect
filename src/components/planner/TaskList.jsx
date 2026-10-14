import { CheckCircle2, Circle, ExternalLink } from 'lucide-react'
import { isTaskDone } from '../../lib/planner/htmlPlannerState.js'
import { safeResourceUrl } from '../../lib/planner/safeLink.js'

const priClass = {
  high: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
  med: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900',
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900',
}

const priLabel = { high: 'สำคัญ', med: 'ปานกลาง', low: 'น้อย' }

export default function TaskList({ dateIso, tasks, state, onToggle }) {
  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        ไม่มีงานในวันนี้
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {tasks.map((task, index) => {
        const done = isTaskDone(state, dateIso, index)
        const pri = task.pri || 'low'
        const safeLink = safeResourceUrl(task.link)
        return (
          <li key={`${dateIso}-${index}`}>
            <div
              className={`flex items-start gap-3 px-1 py-3 sm:px-2 ${done ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}
            >
              <button
                type="button"
                onClick={() => onToggle(dateIso, index)}
                className="mt-0.5 shrink-0 text-primary-700 dark:text-primary-300"
                aria-pressed={done}
                aria-label={done ? 'ยกเลิกทำแล้ว' : 'ทำเครื่องหมายทำแล้ว'}
              >
                {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-relaxed ${done ? 'text-slate-500 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                  {task.text}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`badge border ${priClass[pri] || priClass.low}`}>{priLabel[pri] || pri}</span>
                  {safeLink ? (
                    <a
                      href={safeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                      onClick={event => event.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" /> เปิดลิงก์
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">ไม่มีลิงก์แนบ</span>
                  )}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

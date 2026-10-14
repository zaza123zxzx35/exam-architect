import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Trash2, Sparkles } from 'lucide-react'
import { useScheduleStore } from '../hooks/useScheduleStore'
import {
  clearAssistantContext,
  createDateProvider,
  loadAssistantContext,
  processAssistantTurn,
  saveAssistantContext,
} from '../lib/assistant'

export default function Assistant() {
  const { schedule, setSchedule } = useScheduleStore()
  const [context, setContext] = useState(() => loadAssistantContext(
    typeof window !== 'undefined' ? window.sessionStorage : undefined
  ))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)
  const dates = createDateProvider()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [context.messages.length])

  const persist = (next) => {
    setContext(next)
    saveAssistantContext(next, window.sessionStorage)
  }

  const send = (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      const result = processAssistantTurn(schedule, context, trimmed, { dateProvider: dates })
      if (result.scheduleChanged) {
        setSchedule(() => result.nextSchedule)
      }
      persist(result.context)
      setInput('')
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    send(input)
  }

  const onClear = () => {
    const empty = clearAssistantContext(window.sessionStorage)
    persist(empty)
  }

  const suggestions = context.language === 'en'
    ? ['help', "today's plan", 'exam dates', 'progress', 'create plan for English Mon-Fri 20:00-22:00']
    : ['ช่วยเหลือ', 'แผนวันนี้', 'วันสอบ', 'ความคืบหน้า', 'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00']

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <section className="card border-primary-100 bg-gradient-to-br from-primary-50 to-white dark:border-primary-900/40 dark:from-primary-950/40 dark:to-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Bot className="h-5 w-5 text-primary-700" /> ผู้ช่วยติว (AI Assistant)
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          สนทนาภาษาไทย/อังกฤษ เพื่อดูแผน หาทรัพยากร หรือเสนอการเปลี่ยนแปลงตาราง — ยืนยันก่อนบันทึกเสมอ
        </p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          ไม่มี LLM API — ใช้ตัวจัดประเภทคำสั่งแบบกฎ + Smart Planner/M3 (ไม่เดาวันหรือรหัสงาน)
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/planner" className="btn-secondary text-xs">
            <Sparkles className="h-3.5 w-3.5" /> Smart Planner
          </Link>
          <Link to="/today" className="btn-secondary text-xs">วันนี้</Link>
          <Link to="/timetable" className="btn-secondary text-xs">ตารางติว</Link>
        </div>
      </section>

      {context.pendingChange && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" role="status">
          มีตัวอย่างรอยืนยัน: {context.pendingChange.summary || context.pendingChange.type}
          {' '}— พิมพ์ <strong>ยืนยัน</strong> หรือ <strong>ยกเลิก</strong>
        </div>
      )}

      <section className="card flex min-h-[420px] flex-col !p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">บทสนทนา</div>
          <button type="button" className="btn-secondary text-xs" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" /> ล้างประวัติ
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {context.messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              เริ่มด้วยคำสั่งเช่น “แผนวันนี้” หรือ “สร้างแผนติวอังกฤษ”
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {context.messages.map((m, index) => (
            <div
              key={`${m.at || index}-${m.role}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-700 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <input
            className="input flex-1"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="พิมพ์ภาษาไทยหรืออังกฤษ..."
            disabled={busy}
            aria-label="ข้อความถึงผู้ช่วย"
          />
          <button type="submit" className="btn-primary" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" /> ส่ง
          </button>
        </form>
      </section>
    </div>
  )
}

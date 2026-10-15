import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, Trash2, Sparkles, Library, MessageSquare } from 'lucide-react'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialQuizzes } from '../data/quizData'
import {
  clearAssistantContext,
  createDateProvider,
  loadAssistantContext,
  saveAssistantContext,
} from '../lib/assistant'
import { processAssistantTurnWithAi } from '../lib/assistant/openaiBridge.js'
import { analyzeQuizPerformance } from '../lib/study/weakness.js'
import { PageHeader, EmptyState, StatusBanner } from '../components/ui'

export default function Assistant() {
  const { schedule, setSchedule } = useScheduleStore()
  const [quizzes] = useLocalStorage('study_quizzes', initialQuizzes)
  const [quizResults] = useLocalStorage('quiz_results', {})
  const [context, setContext] = useState(() => loadAssistantContext(
    typeof window !== 'undefined' ? window.sessionStorage : undefined
  ))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [sendError, setSendError] = useState('')
  const [lastSource, setLastSource] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const dates = createDateProvider()

  const weaknessAnalysis = useMemo(
    () => analyzeQuizPerformance(quizResults, quizzes),
    [quizResults, quizzes],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [context.messages.length])

  const persist = (next) => {
    setContext(next)
    saveAssistantContext(next, window.sessionStorage)
  }

  const send = async (text) => {
    const trimmed = String(text || '').trim()
    if (!trimmed || busy) return
    setBusy(true)
    setSendError('')
    try {
      const result = await processAssistantTurnWithAi(schedule, context, trimmed, {
        dateProvider: dates,
        quizResults,
        quizzes,
        weaknessAnalysis,
        priorityMode: 'balanced',
      })
      if (result.scheduleChanged) {
        setSchedule(() => result.nextSchedule)
      }
      persist(result.context)
      setLastSource(result.source || null)
      setInput('')
      if (inputRef.current) inputRef.current.value = ''
      if (result.fallbackNote && result.source === 'fallback') {
        // Non-blocking notice — reply already came from rules
        setSendError('')
      }
    } catch (err) {
      setSendError(err?.message ? String(err.message) : 'ส่งข้อความไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const fromDom = form instanceof HTMLFormElement
      ? String(new FormData(form).get('message') || '')
      : ''
    const fromRef = inputRef.current ? String(inputRef.current.value || '') : ''
    void send(fromDom || fromRef || input)
  }

  const onClear = () => {
    const empty = clearAssistantContext(window.sessionStorage)
    persist(empty)
    setLastSource(null)
  }

  const suggestions = context.language === 'en'
    ? ['help', "today's plan", 'exam dates', 'show weaknesses', 'find English major videos', 'create plan for English Mon-Fri 20:00-22:00']
    : ['ช่วยเหลือ', 'แผนวันนี้', 'วันสอบ', 'ดูจุดอ่อน', 'หาวิดีโอ วิชาเอกอังกฤษ', 'หาลิงก์ ภาค ก ภาษาอังกฤษ', 'อยากติวอังกฤษ จันทร์-ศุกร์ 20.00-22.00']

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader
        title="ผู้ช่วยติว"
        description="สนทนาภาษาไทย/อังกฤษ — ลอง OpenAI ผ่านเซิร์ฟเวอร์ก่อน แล้ว fallback เป็นกฎหากคีย์/API ไม่พร้อม · ยืนยันก่อนบันทึกตารางเสมอ"
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/library" className="btn-secondary text-xs">
              <Library className="h-3.5 w-3.5" /> คลังหลักสูตร
            </Link>
            <Link to="/resources" className="btn-secondary text-xs">
              <Library className="h-3.5 w-3.5" /> คลังเรียน
            </Link>
            <Link to="/planner" className="btn-secondary text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Smart Planner
            </Link>
            <Link to="/today" className="btn-secondary text-xs">วันนี้</Link>
          </div>
        )}
      />

      <StatusBanner tone="info" title="OpenAI ผ่านเซิร์ฟเวอร์เท่านั้น">
        คีย์อ่านจาก <code className="text-xs">OPENAI_API_KEY</code> ฝั่ง server (`/api/assistant`) — ไม่ใส่ใน Vite client
        · ไม่มีคีย์/timeout/โควต้า → ใช้ผู้ช่วยแบบกฎอัตโนมัติ
        · education/law = ภาค ข · english-skills-a ≠ english-major
        {lastSource ? ` · แหล่งล่าสุด: ${lastSource}` : ''}
      </StatusBanner>

      {context.pendingChange ? (
        <StatusBanner tone="warning" title="มีตัวอย่างรอยืนยัน">
          {context.pendingChange.summary || context.pendingChange.type}
          {' '}— พิมพ์ <strong>ยืนยัน</strong> หรือ <strong>ยกเลิก</strong>
          {context.pendingChange.source === 'openai' ? ' (ข้อเสนอจาก AI — ยังไม่บันทึก)' : ''}
        </StatusBanner>
      ) : null}

      <section className="card flex min-h-[420px] flex-col !p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Bot className="h-4 w-4 text-primary-700" /> บทสนทนา
            {busy ? <span className="text-xs font-normal text-slate-400">กำลังคิด…</span> : null}
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={onClear}>
            <Trash2 className="h-3.5 w-3.5" /> ล้างประวัติ
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {context.messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="เริ่มคุยกับผู้ช่วยติว"
              description="ลองถามแผนวันนี้ หาทรัพยากรตามภาค/วิชา หรือขอตัวอย่างแผนติว — ระบบยืนยันก่อนบันทึกตาราง"
              action={(
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                      onClick={() => { void send(s) }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            />
          ) : null}
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

        {sendError ? (
          <p className="px-4 pb-2 text-xs text-rose-700 dark:text-rose-300" role="alert">{sendError}</p>
        ) : null}

        <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
          <input
            ref={inputRef}
            name="message"
            className="input flex-1"
            value={input}
            onChange={e => setInput(e.target.value)}
            onInput={e => setInput(e.currentTarget.value)}
            placeholder="พิมพ์ภาษาไทยหรืออังกฤษ..."
            disabled={busy}
            aria-label="ข้อความถึงผู้ช่วย"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            <Send className="h-4 w-4" /> ส่ง
          </button>
        </form>
      </section>
    </div>
  )
}

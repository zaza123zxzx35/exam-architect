import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Wand2,
  Eye,
  Check,
  X,
  AlertTriangle,
  HelpCircle,
  CalendarClock,
} from 'lucide-react'
import { getExams } from '../data/examCalendar'
import { bangkokTodayIso } from '../data/htmlPlannerData'
import { useScheduleStore } from '../hooks/useScheduleStore'
import {
  applyPlanPreview,
  buildRequestFromForm,
  cancelPlanPreview,
  createEmptyPlannerRequest,
  defaultAvailabilityPreset,
  generatePlanPreview,
  interpretNaturalLanguage,
  listResourceCatalog,
  listSubjectOptions,
} from '../lib/smartPlanner'

const WEEKDAY_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

function emptyForm(todayIso) {
  const primary = getExams()[0]
  return createEmptyPlannerRequest({
    examId: primary?.id || null,
    examDate: primary ? String(primary.startsAt).slice(0, 10) : null,
    startDate: todayIso,
    endDate: primary ? String(primary.startsAt).slice(0, 10) : null,
    availability: defaultAvailabilityPreset(),
    subjects: ['english', 'general'],
    sessionMinutes: 60,
    breakMinutes: 10,
    priority: 'high',
    dailyLimitMinutes: 180,
    includeExistingUnfinished: true,
  })
}

export default function SmartPlanner() {
  const { schedule, setSchedule } = useScheduleStore()
  const todayIso = bangkokTodayIso()
  const exams = useMemo(() => getExams(), [])
  const subjects = useMemo(() => listSubjectOptions(), [])
  const resources = useMemo(() => listResourceCatalog().filter(r => r.url).slice(0, 40), [])

  const [form, setForm] = useState(() => emptyForm(todayIso))
  const [nlText, setNlText] = useState('')
  const [interpretNotes, setInterpretNotes] = useState([])
  const [questions, setQuestions] = useState([])
  const [errors, setErrors] = useState([])
  const [preview, setPreview] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')

  const updateForm = (patch) => {
    setForm(prev => ({ ...prev, ...patch }))
    setPreview(null)
    setStatusMsg('')
  }

  const toggleSubject = (id) => {
    setForm(prev => {
      const set = new Set(prev.subjects)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, subjects: [...set] }
    })
    setPreview(null)
  }

  const toggleResource = (id) => {
    setForm(prev => {
      const set = new Set(prev.resourceIds)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, resourceIds: [...set] }
    })
    setPreview(null)
  }

  const handleInterpret = () => {
    const result = interpretNaturalLanguage(nlText, {
      todayIso,
      defaults: form,
    })
    setInterpretNotes(result.interpretationNotes || [])
    setQuestions(result.clarifyingQuestions || [])
    setErrors(result.errors || [])
    if (result.value) {
      setForm(prev => ({
        ...prev,
        ...result.value,
        // Keep form availability if NL didn't detect any
        availability: result.value.availability?.length
          ? result.value.availability
          : prev.availability,
        subjects: result.value.subjects?.length ? result.value.subjects : prev.subjects,
      }))
    }
    setPreview(null)
    setStatusMsg(result.ok
      ? 'แปลข้อความแล้ว — ตรวจฟอร์มแล้วกดสร้างตัวอย่างแผน'
      : 'ข้อมูลยังไม่ครบ — ตอบคำถามด้านล่างหรือเติมฟอร์ม')
  }

  const handlePreview = () => {
    const validated = buildRequestFromForm(form, { todayIso })
    setQuestions(validated.clarifyingQuestions || [])
    setErrors(validated.errors || [])
    if (!validated.ok) {
      setPreview(null)
      setStatusMsg('ยังสร้างตัวอย่างไม่ได้ — ตรวจข้อความด้านล่าง')
      return
    }
    const result = generatePlanPreview(schedule, validated.value, { todayIso })
    setQuestions(result.validation?.clarifyingQuestions || [])
    setErrors(result.validation?.errors || result.error ? [result.error].filter(Boolean) : [])
    if (!result.ok) {
      setPreview(null)
      setStatusMsg(result.error === 'missing-availability'
        ? 'ยังไม่มีช่วงเวลาว่าง'
        : 'สร้างตัวอย่างไม่ได้')
      return
    }
    setPreview(result.preview)
    setStatusMsg(`ตัวอย่างพร้อมแล้ว: เสนอ ${result.preview.stats.proposedSessionCount} ช่วง · ค้างจัด ${result.preview.stats.unscheduledCount} งาน`)
  }

  const handleCancel = () => {
    cancelPlanPreview(schedule)
    setPreview(null)
    setStatusMsg('ยกเลิกตัวอย่างแล้ว — ตารางเดิมไม่เปลี่ยน')
  }

  const handleApply = () => {
    if (!preview) return
    const confirmed = window.confirm(
      `ยืนยันบันทึกแผน?\nจะเพิ่ม ${preview.proposedSessions.length} ช่วงติว และ ${preview.proposedTasks.length} งานใหม่\nตารางเดิมจะไม่ถูกลบหรือทำเครื่องหมายเสร็จ`
    )
    if (!confirmed) return
    const result = applyPlanPreview(schedule, preview)
    if (!result.ok) {
      setStatusMsg(`บันทึกไม่สำเร็จ: ${result.error || 'conflict'}`)
      setErrors([result.error || 'apply-failed'])
      return
    }
    setSchedule(() => result.schedule)
    setPreview(null)
    setStatusMsg(`บันทึกแล้ว: +${result.applied.sessions.length} ช่วง · +${result.applied.tasks.length} งาน`)
  }

  const existingDoneGuard = schedule.tasks.filter(t => t.status === 'done').length

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card border-primary-100 bg-gradient-to-br from-primary-50 to-white dark:border-primary-900/40 dark:from-primary-950/40 dark:to-slate-900">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-primary-700" /> Smart Planner
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          แปลงคำขอติวเป็นแผนที่ตรวจได้ แล้วจัดลงตารางด้วยเอนจิน M3 (ไม่ทับตารางเดิมจนกว่าจะกดบันทึก)
        </p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          ไม่มี LLM ในโปรเจกต์นี้ — ใช้ตัวแปลข้อความแบบกฎ + ฟอร์ม (M5 อาจต่อ AI ภายหลัง)
        </p>
      </section>

      <section className="card space-y-3">
        <label className="label" htmlFor="nl-request">คำขอแบบภาษาธรรมชาติ (ไม่บังคับ)</label>
        <textarea
          id="nl-request"
          className="input min-h-[96px]"
          placeholder="เช่น อยากติวอังกฤษกับกฎหมาย จันทร์-ศุกร์ 20.00-22.00 ช่วงละ 60 นาที ก่อนสอบภาค ก"
          value={nlText}
          onChange={e => setNlText(e.target.value)}
        />
        <button type="button" className="btn-secondary text-sm" onClick={handleInterpret}>
          <Wand2 className="h-4 w-4" /> แปลความต้องการลงฟอร์ม
        </button>
        {interpretNotes.length > 0 && (
          <p className="text-xs text-slate-500">บันทึกการแปล: {interpretNotes.join(', ')}</p>
        )}
      </section>

      <section className="card space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white">รายละเอียดแผน</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="exam-id">วันสอบ</label>
            <select
              id="exam-id"
              className="input"
              value={form.examId || ''}
              onChange={e => {
                const exam = exams.find(x => x.id === e.target.value)
                updateForm({
                  examId: exam?.id || null,
                  examDate: exam ? String(exam.startsAt).slice(0, 10) : form.examDate,
                  endDate: exam ? String(exam.startsAt).slice(0, 10) : form.endDate,
                })
              }}
            >
              <option value="">— เลือก —</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} · {exam.labelShort}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="exam-date">หรือระบุวันที่ (YYYY-MM-DD)</label>
            <input
              id="exam-date"
              type="date"
              className="input"
              value={form.examDate || ''}
              onChange={e => updateForm({ examDate: e.target.value || null, endDate: e.target.value || form.endDate })}
            />
          </div>
        </div>

        <div>
          <div className="label">วิชาเป้าหมาย</div>
          <div className="mt-1 flex flex-wrap gap-2">
            {subjects.map(s => {
              const on = form.subjects.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubject(s.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${on
                    ? 'border-primary-300 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-100'
                    : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="topics">หัวข้อเพิ่มเติม (คั่นด้วยจุลภาค)</label>
          <input
            id="topics"
            className="input"
            value={(form.topics || []).join(', ')}
            onChange={e => updateForm({
              topics: e.target.value.split(/[,，]/).map(t => t.trim()).filter(Boolean),
            })}
            placeholder="เช่น Grammar, Reading, พ.ร.บ.การศึกษา"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="session-min">นาที/ช่วง</label>
            <input
              id="session-min"
              type="number"
              min={15}
              max={180}
              className="input"
              value={form.sessionMinutes}
              onChange={e => updateForm({ sessionMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="break-min">พัก (นาที)</label>
            <input
              id="break-min"
              type="number"
              min={0}
              max={60}
              className="input"
              value={form.breakMinutes}
              onChange={e => updateForm({ breakMinutes: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="daily-limit">ลิมิต/วัน (นาที)</label>
            <input
              id="daily-limit"
              type="number"
              min={30}
              max={720}
              className="input"
              value={form.dailyLimitMinutes ?? ''}
              onChange={e => updateForm({
                dailyLimitMinutes: e.target.value === '' ? null : Number(e.target.value),
              })}
              placeholder="ไม่จำกัด"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="priority">ความสำคัญ</label>
            <select
              id="priority"
              className="input"
              value={form.priority}
              onChange={e => updateForm({ priority: e.target.value })}
            >
              <option value="high">สูง</option>
              <option value="med">ปานกลาง</option>
              <option value="low">ต่ำ</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={form.includeExistingUnfinished}
                onChange={e => updateForm({ includeExistingUnfinished: e.target.checked })}
              />
              รวมงานค้างจากแผนเดิมที่ตรงวิชา
            </label>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="label !mb-0">วันและช่วงเวลาว่าง</div>
            <button
              type="button"
              className="text-xs font-semibold text-primary-800 hover:underline dark:text-primary-200"
              onClick={() => updateForm({ availability: defaultAvailabilityPreset() })}
            >
              ใช้ค่าเริ่มต้นตาราง
            </button>
          </div>
          {!form.availability.length ? (
            <p className="text-sm text-rose-700 dark:text-rose-300">ยังไม่มีช่วงว่าง — จำเป็นก่อนสร้างแผน</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-auto text-xs text-slate-600 dark:text-slate-300">
              {form.availability.map((w, i) => (
                <li key={`${w.weekday}-${w.startTime}-${i}`} className="flex justify-between rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
                  <span>{WEEKDAY_LABELS[w.weekday]} {w.startTime}–{w.endTime}</span>
                  <button
                    type="button"
                    className="text-rose-600"
                    onClick={() => updateForm({
                      availability: form.availability.filter((_, idx) => idx !== i),
                    })}
                  >
                    ลบ
                  </button>
                </li>
              ))}
            </ul>
          )}
          <AvailabilityAdder onAdd={(window) => updateForm({ availability: [...form.availability, window] })} />
        </div>

        <div>
          <div className="label">ทรัพยากรจากคลังที่มีอยู่ (ไม่สร้าง URL ใหม่)</div>
          <div className="mt-1 max-h-36 space-y-1 overflow-auto">
            {resources.map(r => (
              <label key={r.id} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.resourceIds.includes(r.id)}
                  onChange={() => toggleResource(r.id)}
                />
                <span>{r.title}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm" onClick={handlePreview}>
            <Eye className="h-4 w-4" /> สร้างตัวอย่างแผน
          </button>
          <Link to="/timetable" className="btn-secondary text-sm">
            <CalendarClock className="h-4 w-4" /> ดูตารางปัจจุบัน
          </Link>
        </div>
      </section>

      {(questions.length > 0 || errors.length > 0) && (
        <section className="card border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30">
          <h3 className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-100">
            <HelpCircle className="h-4 w-4" /> ต้องเติมข้อมูล / ข้อผิดพลาด
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-100">
            {questions.map(q => <li key={q}>{q}</li>)}
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        </section>
      )}

      {statusMsg && (
        <p className="text-sm text-slate-600 dark:text-slate-300" role="status">{statusMsg}</p>
      )}

      {preview && (
        <section className="card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">ตัวอย่างแผนก่อนบันทึก</h3>
              <p className="mt-1 text-xs text-slate-500">
                ตารางเดิม {preview.stats.existingSessionCount} ช่วงจะถูกเก็บไว้ · งานที่ทำแล้ว {existingDoneGuard} รายการไม่ถูกแก้
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary text-sm" onClick={handleApply}>
                <Check className="h-4 w-4" /> บันทึกแผน
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={handleCancel}>
                <X className="h-4 w-4" /> ยกเลิก
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="ช่วงใหม่" value={preview.stats.proposedSessionCount} />
            <Stat label="งานใหม่" value={preview.stats.proposedTaskCount} />
            <Stat label="งานค้างที่ดึงมา" value={preview.stats.reusedTaskCount} />
            <Stat label="จัดลงไม่ได้" value={preview.stats.unscheduledCount} />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">ช่วงที่เสนอ</h4>
            {preview.proposedSessions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">ยังไม่มีช่วงที่จัดลงได้</p>
            ) : (
              <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
                {preview.proposedSessions.map(s => (
                  <li key={s.id} className="py-2 text-sm">
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {s.date} · {s.startTime}–{s.endTime} · {s.zone}
                    </div>
                    <div className="text-xs text-slate-500">{s.title}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {preview.unscheduled.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1 text-sm font-semibold text-rose-800 dark:text-rose-200">
                <AlertTriangle className="h-4 w-4" /> งานที่จัดลงไม่ได้ / ทรัพยากรไม่ครบ
              </h4>
              <ul className="mt-2 space-y-1 text-xs text-rose-800 dark:text-rose-200">
                {preview.unscheduled.slice(0, 20).map((u, i) => (
                  <li key={`${u.taskId}-${i}`}>• {u.message} ({u.taskId})</li>
                ))}
              </ul>
            </div>
          )}

          {preview.resourceMatches.incomplete?.length > 0 && (
            <p className="text-xs text-slate-500">
              มีวิชาที่พบชื่อคอร์สแต่ไม่มี URL ในคลัง — ไม่ได้สร้างลิงก์ใหม่
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center dark:bg-slate-800">
      <div className="font-mono text-lg font-semibold text-primary-800 dark:text-primary-200">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  )
}

function AvailabilityAdder({ onAdd }) {
  const [weekday, setWeekday] = useState(1)
  const [startTime, setStartTime] = useState('20:00')
  const [endTime, setEndTime] = useState('22:00')
  return (
    <div className="mt-2 grid grid-cols-12 gap-2">
      <select className="input col-span-3 text-xs" value={weekday} onChange={e => setWeekday(Number(e.target.value))}>
        {WEEKDAY_LABELS.map((label, i) => (
          <option key={label} value={i}>{label}</option>
        ))}
      </select>
      <input className="input col-span-3 text-xs" value={startTime} onChange={e => setStartTime(e.target.value)} />
      <input className="input col-span-3 text-xs" value={endTime} onChange={e => setEndTime(e.target.value)} />
      <button
        type="button"
        className="btn-secondary col-span-3 text-xs"
        onClick={() => onAdd({ weekday, startTime, endTime })}
      >
        เพิ่มช่วง
      </button>
    </div>
  )
}

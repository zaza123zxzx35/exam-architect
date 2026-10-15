import { useMemo, useState } from 'react'
import {
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Award,
  Save
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { initialStudyPlan, initialMockExams } from '../data/planData'
import { bangkokTodayIso } from '../data/htmlPlannerData'

const colorCls = {
  blue: {
    bg: 'bg-blue-50 border-blue-200',
    accent: 'bg-blue-600',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700'
  },
  red: {
    bg: 'bg-red-50 border-red-200',
    accent: 'bg-red-600',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-700'
  },
  green: {
    bg: 'bg-green-50 border-green-200',
    accent: 'bg-green-600',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700'
  },
  amber: {
    bg: 'bg-amber-50 border-amber-200',
    accent: 'bg-amber-500',
    text: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700'
  },
  purple: {
    bg: 'bg-purple-50 border-purple-200',
    accent: 'bg-purple-600',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700'
  }
}

export default function Plan() {
  const countdown = useExamCountdown()
  const [plan, setPlan] = useLocalStorage('study_plan', initialStudyPlan)
  const [progress, setProgress] = useLocalStorage('plan_progress', {})
  const [mockExams, setMockExams] = useLocalStorage('mock_exams', initialMockExams)
  const [newDetail, setNewDetail] = useState('')
  const [activePlanId, setActivePlanId] = useState(null)
  const [newMock, setNewMock] = useState({ name: '', part: 'ภาค ก', totalScore: 200, userScore: '' })

  const toggleTask = (planId, index) => {
    const key = `${planId}_${index}`
    setProgress(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const addDetail = (planId) => {
    if (!newDetail.trim()) return
    setPlan(prev => prev.map(p =>
      p.id === planId ? { ...p, details: [...p.details, newDetail.trim()] } : p
    ))
    setNewDetail('')
    setActivePlanId(null)
  }

  const removeDetail = (planId, index) => {
    setPlan(prev => prev.map(p =>
      p.id === planId
        ? { ...p, details: p.details.filter((_, i) => i !== index) }
        : p
    ))
    const key = `${planId}_${index}`
    const nextProgress = { ...progress }
    delete nextProgress[key]
    setProgress(nextProgress)
  }

  const addMockExam = () => {
    if (!newMock.name.trim()) return
    const exam = {
      id: `m${Date.now()}`,
      name: newMock.name.trim(),
      part: newMock.part,
      totalScore: Number(newMock.totalScore) || 100,
      userScore: newMock.userScore === '' ? null : Number(newMock.userScore),
      date: bangkokTodayIso(),
      note: ''
    }
    setMockExams(prev => [...prev, exam])
    setNewMock({ name: '', part: 'ภาค ก', totalScore: 200, userScore: '' })
  }

  const updateMockScore = (id, field, value) => {
    setMockExams(prev => prev.map(m =>
      m.id === id ? { ...m, [field]: field === 'userScore' && value === '' ? null : Number(value) } : m
    ))
  }

  const removeMock = (id) => {
    setMockExams(prev => prev.filter(m => m.id !== id))
  }

  const stats = useMemo(() => {
    const total = plan.reduce((s, p) => s + p.details.length, 0)
    const done = Object.values(progress).filter(Boolean).length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }, [plan, progress])

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <div className="card bg-gradient-to-br from-primary-50 to-white dark:to-slate-800 border-primary-100 dark:border-primary-900/50">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
              <Target className="w-6 h-6 text-primary-600" />
              แผนการอ่านรายวัน · {countdown.isPast ? 'ถึงกำหนดสอบแล้ว' : `เหลืออีก ${countdown.days} วัน`}
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              คลิกที่วงกลมเพื่อทำเครื่องหมาย "ทำแล้ว" — ระบบจะบันทึกโดยอัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-4 min-w-[260px]">
            <div className="flex-1">
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-1">ความคืบหน้าทั้งหมด</div>
              <div className="text-2xl font-bold text-gray-800 dark:text-slate-200">{stats.done}/{stats.total} งาน ({stats.pct}%)</div>
            </div>
            <div className="w-24 h-24 relative">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.915"
                  fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${stats.pct}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-slate-300">
                {stats.pct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-5">
        {plan.map(p => {
          const c = colorCls[p.color] || colorCls.blue
          const done = p.details.filter((_, i) => progress[`${p.id}_${i}`]).length
          const pct = Math.round((done / p.details.length) * 100)
          return (
            <div key={p.id} className={`card border-2 ${c.bg}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-12 h-12 rounded-xl ${c.accent} text-white flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                    #{p.priority}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-slate-200">{p.title}</h3>
                      <span className={`badge ${c.badge}`}>{p.timePerDay}</span>
                    </div>
                    <p className={`text-sm ${c.text} mt-0.5`}>{p.subtitle}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-600 dark:text-slate-400">
                      <span>เป้าหมายส่วนตัว: <strong>{p.targetScore}</strong></span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${c.text}`}>{pct}%</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">{done}/{p.details.length} งานเสร็จ</div>
                </div>
              </div>

              <div className={`h-2 rounded-full bg-white dark:bg-slate-800 mt-4 overflow-hidden`}>
                <div className={`h-full ${c.accent} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
              </div>

              {/* Checklist */}
              <ul className="mt-4 space-y-2">
                {p.details.map((d, i) => {
                  const done = progress[`${p.id}_${i}`]
                  return (
                    <li key={i} className="group flex items-start gap-3 p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 transition-colors">
                      <button
                        onClick={() => toggleTask(p.id, i)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {done ? (
                          <CheckCircle2 className={`w-5 h-5 ${c.text}`} />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 dark:group-hover:text-slate-400" />
                        )}
                      </button>
                      <div className={`flex-1 text-sm ${done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>
                        {d}
                      </div>
                      <button
                        onClick={() => removeDetail(p.id, i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-slate-500 hover:text-red-500 transition"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>

              {/* Add Detail */}
              {activePlanId === p.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={newDetail}
                    onChange={e => setNewDetail(e.target.value)}
                    placeholder="เพิ่มงานย่อย เช่น ทำโจทย์ Grammar ชุดที่ 3"
                    className="input text-sm flex-1"
                    onKeyDown={e => e.key === 'Enter' && addDetail(p.id)}
                    autoFocus
                  />
                  <button onClick={() => addDetail(p.id)} className="btn-success text-sm py-2">
                    <Save className="w-4 h-4" /> เพิ่ม
                  </button>
                  <button onClick={() => { setActivePlanId(null); setNewDetail('') }} className="btn-secondary text-sm py-2">
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActivePlanId(p.id)}
                  className={`mt-3 inline-flex items-center gap-1.5 text-sm ${c.text} hover:opacity-80 font-medium`}
                >
                  <Plus className="w-4 h-4" /> เพิ่มงานย่อยในหมวดนี้
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Mock Exams Tracker */}
      <div className="card">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            บันทึกคะแนน Mock Exam
          </h3>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            เก็บคะแนนไว้เพื่อวิเคราะห์แนวโน้มความก้าวหน้า
          </div>
        </div>

        {/* Add Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl mb-4">
          <div className="md:col-span-4">
            <label className="label">ชุดข้อสอบ</label>
            <input
              value={newMock.name}
              onChange={e => setNewMock(p => ({ ...p, name: e.target.value }))}
              className="input text-sm"
              placeholder="เช่น Mock ภาค ก ชุด 1 (ปี 2568)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">ภาค</label>
            <select
              value={newMock.part}
              onChange={e => setNewMock(p => ({ ...p, part: e.target.value, totalScore: e.target.value === 'ภาค ก' ? 200 : e.target.value === 'ภาค ค' ? 100 : 50 }))}
              className="input text-sm"
            >
              <option>ภาค ก</option>
              <option>ภาค ข</option>
              <option>ภาค ค</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">คะแนนเต็ม</label>
            <input
              type="number"
              value={newMock.totalScore}
              onChange={e => setNewMock(p => ({ ...p, totalScore: e.target.value }))}
              className="input text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">ได้คะแนน</label>
            <input
              type="number"
              value={newMock.userScore}
              onChange={e => setNewMock(p => ({ ...p, userScore: e.target.value }))}
              className="input text-sm"
              placeholder="ถ้ายังไม่สอบ เว้นไว้"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button onClick={addMockExam} className="btn-primary w-full">
              <Plus className="w-4 h-4" /> บันทึก
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                <th className="pb-3 font-medium">ภาค</th>
                <th className="pb-3 font-medium">ชุดข้อสอบ</th>
                <th className="pb-3 font-medium">วันที่</th>
                <th className="pb-3 font-medium">คะแนนเต็ม</th>
                <th className="pb-3 font-medium">ได้คะแนน</th>
                <th className="pb-3 font-medium">ร้อยละ</th>
                <th className="pb-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {mockExams.map(m => {
                const pct = typeof m.userScore === 'number' ? Math.round((m.userScore / m.totalScore) * 100) : null
                const grade = pct === null ? '' : pct >= 85 ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30' : pct >= 70 ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                return (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="py-3">
                      <span className={`badge ${m.part === 'ภาค ก' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : m.part === 'ภาค ข' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                        {m.part}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-gray-800 dark:text-slate-200">{m.name}</td>
                    <td className="py-3 text-gray-500 dark:text-slate-400">{m.date || '-'}</td>
                    <td className="py-3 text-gray-600 dark:text-slate-300">{m.totalScore}</td>
                    <td className="py-3">
                      <input
                        type="number"
                        value={m.userScore === null ? '' : m.userScore}
                        onChange={e => updateMockScore(m.id, 'userScore', e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 rounded text-sm"
                        placeholder="-"
                      />
                    </td>
                    <td className="py-3">
                      {pct === null ? (
                        <span className="text-gray-400 dark:text-slate-500">-</span>
                      ) : (
                        <span className={`badge ${grade}`}>{pct}%</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => removeMock(m.id)} className="text-gray-400 dark:text-slate-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import {
  FileQuestion,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Trophy,
  Sparkles
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialQuizzes } from '../data/quizData'

export default function Quiz() {
  const [quizzes, setQuizzes] = useLocalStorage('study_quizzes', initialQuizzes)
  const [results, setResults] = useLocalStorage('quiz_results', {})

  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [newQ, setNewQ] = useState({
    category: 'ภาค ก - ความสามารถในการคิดวิเคราะห์',
    title: '',
    description: '',
    questions: [{ q: '', options: ['', '', '', ''], answer: 0, explanation: '' }]
  })

  const categories = useMemo(() => {
    const map = {}
    quizzes.forEach(quiz => {
      if (!map[quiz.category]) map[quiz.category] = []
      map[quiz.category].push(quiz)
    })
    return map
  }, [quizzes])

  const startQuiz = (q) => {
    setActiveQuiz(q)
    setAnswers({})
    setShowResult(false)
  }

  const pick = (qId, optIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optIdx }))
  }

  const submit = () => {
    if (!activeQuiz) return
    let correct = 0
    activeQuiz.questions.forEach(q => {
      if (answers[q.id] === q.answer) correct++
    })
    const now = new Date().toISOString()
    const scoreObj = {
      score: correct,
      total: activeQuiz.questions.length,
      pct: Math.round((correct / activeQuiz.questions.length) * 100),
      title: activeQuiz.title,
      category: activeQuiz.category,
      date: now,
      at: now
    }
    setResults(prev => ({ ...prev, [`${activeQuiz.id}__${Date.now()}`]: scoreObj }))
    setShowResult(true)
  }

  const resetQuiz = () => {
    setAnswers({})
    setShowResult(false)
  }

  const exitQuiz = () => {
    setActiveQuiz(null)
    setAnswers({})
    setShowResult(false)
  }

  const addQuestion = () => {
    setNewQ(p => ({
      ...p,
      questions: [...p.questions, { q: '', options: ['', '', '', ''], answer: 0, explanation: '' }]
    }))
  }

  const updateQ = (idx, field, value) => {
    const next = [...newQ.questions]
    next[idx] = { ...next[idx], [field]: value }
    setNewQ(p => ({ ...p, questions: next }))
  }

  const updateOpt = (qIdx, optIdx, value) => {
    const next = [...newQ.questions]
    next[qIdx].options = [...next[qIdx].options]
    next[qIdx].options[optIdx] = value
    setNewQ(p => ({ ...p, questions: next }))
  }

  const saveQuiz = () => {
    if (!newQ.title.trim() || newQ.questions.some(q => !q.q.trim())) return
    const quiz = {
      id: `q${Date.now()}`,
      category: newQ.category,
      title: newQ.title.trim(),
      description: newQ.description.trim(),
      questions: newQ.questions
        .filter(q => q.q.trim())
        .map((q, i) => ({ ...q, id: i + 1 }))
    }
    setQuizzes(prev => [...prev, quiz])
    setNewQ({
      category: 'ภาค ก - ความสามารถในการคิดวิเคราะห์',
      title: '',
      description: '',
      questions: [{ q: '', options: ['', '', '', ''], answer: 0, explanation: '' }]
    })
    setAddMode(false)
  }

  // Quiz View
  if (activeQuiz) {
    const pct = showResult ? Math.round(
      (activeQuiz.questions.filter(q => answers[q.id] === q.answer).length / activeQuiz.questions.length) * 100
    ) : 0
    const answered = Object.keys(answers).length

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={exitQuiz} className="btn-secondary text-sm">
            ← กลับรายการชุดข้อสอบ
          </button>
          <div className="flex items-center gap-3">
            <span className="badge bg-primary-50 text-primary-700">
              {activeQuiz.category}
            </span>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              ตอบ {answered}/{activeQuiz.questions.length}
            </span>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{activeQuiz.title}</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{activeQuiz.description}</p>
        </div>

        <div className="space-y-4">
          {activeQuiz.questions.map((q, i) => {
            const myAns = answers[q.id]
            const isCorrect = showResult && myAns === q.answer
            const isWrong = showResult && myAns !== undefined && myAns !== q.answer
            return (
              <div key={q.id} className={`card ${showResult ? (isCorrect ? 'border-green-300 bg-green-50/50' : isWrong ? 'border-red-300 bg-red-50/50' : '') : ''}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    showResult ? (isCorrect ? 'bg-green-500 text-white' : isWrong ? 'bg-red-500 text-white' : 'bg-primary-100 text-primary-700') : 'bg-primary-100 text-primary-700'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 font-medium text-gray-800 dark:text-slate-100 leading-relaxed">{q.q}</div>
                </div>

                <div className="space-y-2 ml-11">
                  {q.options.map((opt, oi) => {
                    const selected = myAns === oi
                    const isAnswer = showResult && q.answer === oi
                    let cls = 'border-gray-200 dark:border-slate-700 hover:border-primary-300 hover:bg-primary-50'
                    if (selected && !showResult) cls = 'border-primary-500 bg-primary-50 ring-2 ring-primary-100'
                    if (isCorrect) cls = 'border-green-500 bg-green-100'
                    if (isWrong && selected) cls = 'border-red-500 bg-red-100'
                    if (showResult && isAnswer && !selected) cls = 'border-green-500 bg-green-50'

                    return (
                      <button
                        key={oi}
                        onClick={() => !showResult && pick(q.id, oi)}
                        disabled={showResult}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${cls} flex items-center gap-3`}
                      >
                        <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          selected ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-slate-200">{opt || '(ตัวเลือก)'}</span>
                        {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                        {isWrong && selected && <XCircle className="w-5 h-5 text-red-600 ml-auto" />}
                      </button>
                    )
                  })}
                </div>

                {showResult && (
                  <div className={`mt-4 ml-11 p-3 rounded-lg text-sm ${
                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}>
                    <div className="flex items-center gap-1 font-semibold mb-1">
                      <Sparkles className="w-4 h-4" />
                      คำอธิบายเฉลย
                    </div>
                    {q.explanation || '(ไม่มีคำอธิบายเพิ่มเติม)'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom Action */}
        {!showResult ? (
          <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur -mx-8 -mb-8 px-8 py-4 border-t border-gray-100 dark:border-slate-800">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-slate-300">
                ตอบแล้ว <strong>{answered}</strong> จาก {activeQuiz.questions.length} ข้อ
                <span className="text-gray-400 dark:text-slate-500 mx-2">·</span>
                {answered < activeQuiz.questions.length
                  ? <span className="text-amber-600">ค่อยๆ คิดนะ! ไม่ต้องรีบ</span>
                  : <span className="text-green-600 font-medium">ตอบครบทุกข้อแล้ว ✅ พร้อมส่งคำตอบ!</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={resetQuiz} className="btn-secondary text-sm">
                  <RotateCcw className="w-4 h-4" /> ล้างคำตอบ
                </button>
                <button
                  onClick={submit}
                  disabled={answered === 0}
                  className="btn-primary text-sm"
                >
                  ส่งคำตอบ <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`card ${pct >= 80 ? 'border-green-300 bg-green-50' : pct >= 60 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-amber-500' : 'bg-red-600'
              } text-white`}>
                <Trophy className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 dark:text-slate-300">ผลลัพธ์ชุดนี้</div>
                <div className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                  {activeQuiz.questions.filter(q => answers[q.id] === q.answer).length} / {activeQuiz.questions.length}
                  <span className="text-lg ml-2 text-gray-500 dark:text-slate-400">ถูกต้อง ({pct}%)</span>
                </div>
                <div className="text-sm mt-1">
                  {pct >= 80 ? '🎉 เก่งมาก! อาจลองชุดที่ยากขึ้นได้เลย' :
                   pct >= 60 ? '💪 โอเคเลยครับ ทบทวนจุดที่ผิดอีกที' :
                   '📚 ยังไม่ผ่านเกณฑ์นะ กลับไปอ่านเนื้อหาที่เกี่ยวข้อง แล้วกลับมาลองใหม่!'}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={resetQuiz} className="btn-secondary text-sm">
                  <RotateCcw className="w-4 h-4" /> ลองใหม่
                </button>
                <button onClick={exitQuiz} className="btn-primary text-sm">
                  ชุดอื่น
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-primary-600" />
            ฐานข้อสอบ + ทำโจทย์ทบทวน
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            เลือกหมวดแล้วเริ่มทำเลย! ระบบจะบันทึกคะแนนเพื่อวิเคราะห์แนวโน้มในภาพรวม
          </p>
        </div>
        <button onClick={() => setAddMode(!addMode)} className="btn-primary">
          <Play className="w-4 h-4" /> {addMode ? 'ยกเลิก' : 'สร้างชุดข้อสอบใหม่'}
        </button>
      </div>

      {addMode && (
        <div className="card border-2 border-primary-200 bg-primary-50/50 space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100">เพิ่มชุดข้อสอบใหม่</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="label">หมวดหมู่</label>
              <select value={newQ.category} onChange={e => setNewQ(p => ({ ...p, category: e.target.value }))} className="input text-sm">
                <option>ภาค ก - ความสามารถในการคิดวิเคราะห์</option>
                <option>ภาค ก - ทักษะภาษาอังกฤษ</option>
                <option>ภาค ก - ความรู้ข้าราชการ</option>
                <option>ภาค ข - วิชาการศึกษา</option>
                <option>ภาค ข - วิชาเอกภาษาอังกฤษ</option>
                <option>ภาค ค - สัมภาษณ์</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="label">ชื่อชุดข้อสอบ</label>
              <input value={newQ.title} onChange={e => setNewQ(p => ({ ...p, title: e.target.value }))} className="input text-sm" placeholder="เช่น Grammar Tense 12 ชนิด" />
            </div>
            <div className="md:col-span-4">
              <label className="label">คำอธิบายสั้น</label>
              <input value={newQ.description} onChange={e => setNewQ(p => ({ ...p, description: e.target.value }))} className="input text-sm" placeholder="ไม่บังคับ" />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-primary-100">
            {newQ.questions.map((q, qi) => (
              <div key={qi} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label m-0 font-semibold">ข้อที่ {qi + 1}</label>
                </div>
                <input
                  value={q.q}
                  onChange={e => updateQ(qi, 'q', e.target.value)}
                  className="input text-sm"
                  placeholder="โจทย์ข้อสอบ"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((op, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <span className={`badge ${q.answer === oi ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <input
                        value={op}
                        onChange={e => updateOpt(qi, oi, e.target.value)}
                        onDoubleClick={() => updateQ(qi, 'answer', oi)}
                        className="input text-sm flex-1"
                        placeholder={`ตัวเลือก ${String.fromCharCode(65 + oi)} (ดับเบิลคลิกเพื่อตั้งเป็นคำตอบ)`}
                      />
                    </div>
                  ))}
                </div>
                <input
                  value={q.explanation}
                  onChange={e => updateQ(qi, 'explanation', e.target.value)}
                  className="input text-sm"
                  placeholder="คำอธิบายเฉลย (ไม่บังคับ แต่แนะนำ)"
                />
              </div>
            ))}
            <button onClick={addQuestion} className="btn-secondary text-sm w-full">
              + เพิ่มข้อถัดไป
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-primary-100">
            <button onClick={() => setAddMode(false)} className="btn-secondary text-sm">ยกเลิก</button>
            <button onClick={saveQuiz} className="btn-primary text-sm">บันทึกชุดข้อสอบ</button>
          </div>
        </div>
      )}

      {Object.entries(categories).map(([cat, items]) => (
        <div key={cat} className="card">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-primary-600" />
            {cat} <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">({items.length} ชุด)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(q => {
              const r = results[q.id]
              return (
                <div key={q.id} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-colors bg-white dark:bg-slate-800 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-xs text-gray-400 dark:text-slate-500">{q.questions.length} ข้อ</div>
                    {r && (
                      <span className={`badge ${r.pct >= 80 ? 'bg-green-100 text-green-700' : r.pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        ทำแล้ว {r.pct}%
                      </span>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-800 dark:text-slate-100 mb-1">{q.title}</h4>
                  {q.description && <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{q.description}</p>}
                  <div className="mt-auto pt-3">
                    <button onClick={() => startQuiz(q)} className="btn-primary w-full text-sm py-2 justify-center">
                      <Play className="w-4 h-4" /> {r ? 'ลองทำอีกครั้ง' : 'เริ่มทำเลย'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

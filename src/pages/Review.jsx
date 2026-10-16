import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, BookOpenCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBanner from '../components/ui/StatusBanner.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialQuizzes } from '../data/quizData'
import { analyzeQuizPerformance } from '../lib/study/weakness.js'
import { HUB_SUBJECT_LABELS, HUB_EXAM_PART_LABELS } from '../lib/study/hub.js'
import { enrichCuratedResources } from '../lib/curated/catalog.js'
import { useScheduleStore } from '../hooks/useScheduleStore'

function subjectLabel(id) {
  return HUB_SUBJECT_LABELS[id] || id || 'ยังไม่จัดวิชา'
}

export default function Review() {
  const [quizResults] = useLocalStorage('quiz_results', {})
  const [quizzes] = useLocalStorage('study_quizzes', initialQuizzes)
  const { schedule } = useScheduleStore()

  const analysis = useMemo(
    () => analyzeQuizPerformance(quizResults, quizzes),
    [quizResults, quizzes],
  )

  const weakQuizzes = useMemo(
    () => (analysis.byQuiz || []).filter((q) => q.status === 'observed-weakness'),
    [analysis],
  )

  const relatedCatalog = useMemo(() => {
    const catalog = enrichCuratedResources()
    const weakSubjects = new Set((analysis.observedWeaknesses || []).map((w) => w.subjectId))
    return catalog
      .filter((r) => weakSubjects.has(r.subjectId))
      .slice(0, 24)
  }, [analysis])

  const pendingReviewTasks = useMemo(
    () => (schedule.tasks || [])
      .filter((t) => (
        (t.status === 'pending' || t.status === 'deferred' || t.status === 'in_progress')
        && (t.planPack === 'victory-drive' || t.planPack === 'victory-mock' || String(t.id || '').startsWith('victory_'))
      ))
      .slice(0, 12),
    [schedule.tasks],
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="ทบทวนข้อผิดพลาด"
        description="จากผลแบบทดสอบที่บันทึกในเครื่อง + งานทบทวนในแผน — ไม่เดาคะแนนที่ไม่มีข้อมูล"
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/quiz" className="btn-primary text-xs">ไปทำแบบทดสอบ</Link>
            <Link to="/today" className="btn-secondary text-xs">วันนี้</Link>
            <Link to="/audit" className="btn-secondary text-xs">ตรวจรายการซ้ำ</Link>
          </div>
        )}
      />

      <StatusBanner
        tone={analysis.summaryLabel === 'no-attempts' ? 'warning' : 'info'}
        title={
          analysis.summaryLabel === 'no-attempts'
            ? 'ยังไม่มีผลแบบทดสอบ'
            : `สังเกตจุดอ่อน ${analysis.observedWeaknesses.length} วิชา · ทำไปแล้ว ${analysis.attemptCount} ครั้ง`
        }
      >
        {analysis.summaryLabel === 'no-attempts'
          ? 'เมื่อทำควิซและบันทึกผล รายการทบทวนจะขึ้นที่นี่อัตโนมัติ'
          : 'เกณฑ์จุดอ่อน: คะแนนเฉลี่ยต่ำกว่า 70% (ข้อมูลเบื้องต้นถ้าทำน้อยครั้ง)'}
      </StatusBanner>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AlertCircle className="h-5 w-5 text-amber-600" /> วิชาที่ควรอ่านซ้ำ
        </h2>
        {(analysis.observedWeaknesses || []).length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีจุดอ่อนที่สังเกตได้จากผลสอบในเครื่อง</p>
        ) : (
          <ul className="space-y-2">
            {analysis.observedWeaknesses.map((w) => (
              <li key={w.subjectId} className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm font-semibold">
                  {subjectLabel(w.subjectId)}
                  {w.examPart ? ` · ${HUB_EXAM_PART_LABELS[w.examPart] || `ภาค ${w.examPart}`}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  เฉลี่ย {w.avgPct}% · {w.attempts} ครั้ง
                  {w.confidence === 'preliminary' ? ' · สัญญาณเบื้องต้น' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">แบบทดสอบที่คะแนนต่ำ</h2>
        {weakQuizzes.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีชุดที่ต่ำกว่าเกณฑ์</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {weakQuizzes.map((q) => (
              <li key={q.quizId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <div>
                  <p className="font-medium">{q.title}</p>
                  <p className="text-xs text-slate-500">
                    {subjectLabel(q.subjectId)} · เฉลี่ย {q.avgPct}% · ครั้งล่าสุด {q.lastPct}%
                  </p>
                </div>
                <Link to="/quiz" className="text-xs font-semibold text-primary-800 underline dark:text-primary-200">
                  ทำอีกครั้ง
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <BookOpenCheck className="h-5 w-5 text-primary-700" /> เนื้อหาในคลังที่ตรงจุดอ่อน
        </h2>
        {relatedCatalog.length === 0 ? (
          <p className="text-sm text-slate-500">ยังไม่มีจุดอ่อน หรือยังไม่มีรายการคลังที่จับคู่ได้</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {relatedCatalog.map((r) => (
              <li key={r.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-slate-500">
                  <code>{r.id}</code> · {subjectLabel(r.subjectId)} · {r.series}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link to="/library" className="text-xs font-semibold text-primary-800 underline dark:text-primary-200">
          เปิดคลังหลักสูตรเพื่อกรองวิชา
        </Link>
      </section>

      {pendingReviewTasks.length > 0 && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">งานทบทวนในแผนที่ยังค้าง</h2>
          <ul className="space-y-2 text-sm">
            {pendingReviewTasks.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-slate-500">{t.plannedDate} · {t.status}</p>
              </li>
            ))}
          </ul>
          <Link to="/today" className="text-xs font-semibold text-primary-800 underline dark:text-primary-200">
            กลับไปหน้าวันนี้
          </Link>
        </section>
      )}
    </div>
  )
}

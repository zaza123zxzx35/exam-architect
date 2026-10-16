import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Flame,
  GraduationCap,
  ListChecks,
  PlayCircle,
  Target
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { initialStudyPlan, initialMockExams } from '../data/planData'
import { initialNotes } from '../data/notesData'
import { initialVideos } from '../data/videoData'
import { subjectStats } from '../data/hrmsStats'
import CompetitionWidget from '../components/CompetitionWidget'
import { getKeyDates, getPrimaryExam } from '../data/examCalendar'

const fmt = value => Number(value).toLocaleString('th-TH')

function SummaryCard({ icon: Icon, label, value, detail, tone, progress }) {
  const tones = {
    teal: 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200',
    blue: 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    purple: 'bg-violet-50 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
  }
  return (
    <div className="card !p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
      <div className="progress-bar mt-4 h-2"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>
    </div>
  )
}

export default function Dashboard() {
  const countdown = useExamCountdown()
  const [planItems] = useLocalStorage('study_plan', initialStudyPlan)
  const [mockExams] = useLocalStorage('mock_exams', initialMockExams)
  const [progress] = useLocalStorage('plan_progress', {})
  const [quizResults] = useLocalStorage('quiz_results', {})
  const [notes] = useLocalStorage('study_notes', initialNotes)
  const [videos] = useLocalStorage('study_videos', initialVideos)

  const totalTasks = useMemo(() => planItems.reduce((sum, item) => sum + (item.details?.length || 0), 0), [planItems])
  const doneTasks = useMemo(() => Object.values(progress).filter(Boolean).length, [progress])
  const planPct = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0
  const completedMocks = mockExams.filter(item => typeof item.userScore === 'number' && item.totalScore > 0)
  const mockAvg = completedMocks.length
    ? Math.round(completedMocks.reduce((sum, item) => sum + item.userScore / item.totalScore * 100, 0) / completedMocks.length)
    : null
  const completedQuizzes = Object.values(quizResults).filter(result => typeof result.score === 'number' && result.total > 0)
  const quizAvg = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, result) => sum + result.score / result.total * 100, 0) / completedQuizzes.length)
    : null
  const watchedVideos = videos.filter(video => video.isWatched).length
  const currentYear = subjectStats.yearlyDemand.find(item => item.year === 2569)
  const priorities = planItems.slice(0, 3)

  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-primary-900 to-primary-700 p-6 text-white shadow-xl shadow-primary-950/10 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border-[42px] border-white/[0.045]" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-[28%] h-48 w-48 rounded-full bg-teal-300/[0.08] blur-2xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-100">
              <GraduationCap className="h-4 w-4" /> Study Desk · สอบครูผู้ช่วย สพฐ. รอบทั่วไป 2569
            </div>
            <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">เตรียมสอบอย่างมีแผน<br className="hidden sm:block" />และเห็นความคืบหน้าชัดเจน</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">รวมตารางอ่าน แบบทดสอบ โน้ต และสถิติไว้ในที่เดียว ใช้ข้อมูลต้นทางประกอบการตัดสินใจ และตรวจประกาศทางการก่อนสมัครทุกครั้ง</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-primary-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-50">กลับไปตารางวันนี้ <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/audit" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"><ListChecks className="h-4 w-4" />ตรวจรายการซ้ำ</Link>
              <Link to="/review" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"><FileCheck2 className="h-4 w-4" />ทบทวนข้อผิด</Link>
            </div>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur-sm lg:min-w-[250px]">
            <div className="flex items-center gap-2 text-sm font-medium text-primary-100"><Clock3 className="h-4 w-4" /> เวลาถึงสอบภาค ก</div>
            <div className="mt-3 flex items-baseline gap-2"><span className="text-5xl font-bold tracking-tight">{countdown.isPast ? '0' : countdown.days}</span><span className="text-lg text-primary-100">วัน</span></div>
            <div className="mt-1 text-sm text-primary-100/90">{countdown.isPast ? 'ถึงกำหนดสอบแล้ว' : `${countdown.hours} ชั่วโมง ${countdown.minutes} นาที`}</div>
            <div className="mt-4 border-t border-white/15 pt-3 text-xs text-white/75">{getPrimaryExam().labelLong}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="ความคืบหน้าการเตรียมสอบ">
        <SummaryCard icon={ListChecks} label="แผนการอ่าน" value={`${planPct}%`} detail={`${doneTasks} จาก ${totalTasks} งาน`} tone="teal" progress={planPct} />
        <SummaryCard icon={Award} label="Mock Exam เฉลี่ย" value={mockAvg === null ? '—' : `${mockAvg}%`} detail={mockAvg === null ? 'บันทึกคะแนนหลังทำข้อสอบ' : `${completedMocks.length} ครั้ง`} tone="blue" progress={mockAvg || 0} />
        <SummaryCard icon={FileCheck2} label="แบบทดสอบเฉลี่ย" value={quizAvg === null ? '—' : `${quizAvg}%`} detail={quizAvg === null ? 'เริ่มทำ Quiz เพื่อดูแนวโน้ม' : `${completedQuizzes.length} ชุด`} tone="amber" progress={quizAvg || 0} />
        <SummaryCard icon={PlayCircle} label="สื่อที่ทำเครื่องหมายว่าดูแล้ว" value={`${watchedVideos}/${videos.length}`} detail={`โน้ตของฉัน ${notes.length} หัวข้อ`} tone="purple" progress={videos.length ? watchedVideos / videos.length * 100 : 0} />
      </section>

      <section className="card overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200"><BarChart3 className="h-5 w-5" /></div>
            <div><h3 className="font-bold text-slate-900 dark:text-white">ภาพรวมกำลังครูภาษาอังกฤษ</h3><p className="text-xs text-slate-500 dark:text-slate-400">HRMS.OBEC · ตรวจเทียบ {subjectStats.checkedAt}</p></div>
          </div>
          <Link to="/info" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-800 hover:underline dark:text-primary-200">ดูรายละเอียด <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-800 sm:grid-cols-4">
          {[
            { label: 'เกณฑ์มาตรฐาน', value: fmt(subjectStats.nationalSummary.standardQuota) },
            { label: 'ครูตาม จ.18', value: fmt(subjectStats.nationalSummary.actualTeachers) },
            { label: 'ขาด/เกินจากเกณฑ์', value: fmt(subjectStats.nationalSummary.deficit) },
            { label: 'ปี 2569 · เกษียณ', value: fmt(currentYear?.retired || 0) }
          ].map(item => <div key={item.label} className="bg-white p-4 dark:bg-slate-900 sm:p-5"><div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div><div className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">{item.value}</div></div>)}
        </div>
        <div className="flex flex-col gap-2 bg-primary-50/70 px-5 py-3 text-xs leading-relaxed text-primary-950 dark:bg-primary-950/20 dark:text-primary-100 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>ยอดสะสม 10 ปีแยกกัน: เกษียณ {fmt(subjectStats.tenYearTotals.retired)} · ต้องการทดแทน {fmt(subjectStats.tenYearTotals.replacementDemand)}</span>
          <span className="font-medium text-primary-900 dark:text-primary-100">Snapshot ไม่ใช่ข้อมูล real-time</span>
        </div>
      </section>

      <CompetitionWidget />

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary-700 dark:text-primary-300" /><h3 className="font-bold text-slate-900 dark:text-white">โฟกัสถัดไป</h3></div>
            <Link to="/plan" className="text-xs font-semibold text-primary-800 hover:underline dark:text-primary-200">จัดการแผน <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-4 space-y-3">
            {priorities.map((item, index) => {
              const done = item.details.filter((_, detailIndex) => progress[`${item.id}_${detailIndex}`]).length
              const pct = item.details.length ? Math.round(done / item.details.length * 100) : 0
              return <div key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex items-start gap-3"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-800 dark:bg-primary-900/30 dark:text-primary-200">{index + 1}</div><div className="min-w-0 flex-1"><div className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</div><div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.subtitle}</div><div className="progress-bar mt-3 h-2"><div className="progress-fill" style={{ width: `${pct}%` }} /></div><div className="mt-1.5 text-right text-[11px] text-slate-500 dark:text-slate-400">{done}/{item.details.length} งาน · {pct}%</div></div></div>
              </div>
            })}
            {priorities.length === 0 && <div className="py-6 text-center text-sm text-slate-500">ยังไม่มีรายการในแผนการอ่าน</div>}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-amber-600" /><h3 className="font-bold text-slate-900 dark:text-white">กำหนดการสำคัญ</h3></div>
          <div className="mt-5 space-y-4">
            {getKeyDates().map((event, index, list) => <div key={event.id} className="relative flex gap-3">
              {index < list.length - 1 && <div className="absolute left-[11px] top-7 h-8 border-l border-dashed border-slate-300 dark:border-slate-700" />}
              <div className="relative mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-primary-100 bg-primary-600 dark:border-primary-900/60" />
              <div><div className="text-xs font-bold text-primary-800 dark:text-primary-200">{event.date}</div><div className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{event.title}</div><div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{event.note}</div></div>
            </div>)}
          </div>
          <Link to="/info" className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 transition hover:bg-primary-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-300" /> วันเวลาควรตรวจซ้ำกับประกาศทางการก่อนวางแผนเดินทาง <ArrowRight className="ml-auto h-4 w-4 shrink-0" /></Link>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100 sm:flex-row sm:items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><Flame className="h-5 w-5" /></div>
        <p className="leading-relaxed"><strong>หมายเหตุ:</strong> ความคืบหน้าและตัวเลขที่บันทึกในหน้าแผน/การแข่งขันจัดเก็บในเบราว์เซอร์ของอุปกรณ์นี้ ไม่ได้ sync กับผู้ใช้คนอื่น ส่วนกำหนดการและจำนวนอัตราให้ยึดประกาศทางการเป็นหลัก</p>
      </section>
    </div>
  )
}

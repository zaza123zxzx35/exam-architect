import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  FileQuestion,
  NotebookPen,
  PlayCircle,
  BookOpen,
  BarChart3,
  Sun,
  Moon,
  Clock3
} from 'lucide-react'
import { useThemeCtx } from '../hooks/useThemeCtx'
import { useExamCountdown } from '../hooks/useExamCountdown'
import { getPrimaryExam } from '../data/examCalendar'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'ภาพรวม' },
  { to: '/timetable', icon: CalendarDays, label: 'ตารางติว' },
  { to: '/info', icon: BarChart3, label: 'ข้อมูลและสถิติ' },
  { to: '/plan', icon: CalendarCheck, label: 'แผนการอ่าน' },
  { to: '/quiz', icon: FileQuestion, label: 'แบบทดสอบ' },
  { to: '/notes', icon: NotebookPen, label: 'โน้ต' },
  { to: '/videos', icon: PlayCircle, label: 'วิดีโอ' },
]

function formatBangkokDate(date) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

export default function Layout({ children }) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeCtx()
  const countdown = useExamCountdown()
  const [now, setNow] = useState(() => new Date())
  const activeItem = navItems.find(item => item.to === location.pathname) || navItems[0]

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const navLink = (item, compact = false) => {
    const active = location.pathname === item.to
    return (
      <Link
        key={item.to}
        to={item.to}
        aria-current={active ? 'page' : undefined}
        className={`group flex shrink-0 items-center gap-2.5 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${compact ? 'px-3 py-2 text-xs' : 'px-3 py-2.5 text-sm'} ${active
          ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-200'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
      >
        <item.icon className={`${compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} shrink-0 ${active ? 'text-primary-700 dark:text-primary-300' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500'}`} />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-slate-200/80 bg-white/90 px-4 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:flex">
        <Link to="/" className="mb-6 flex items-center gap-3 rounded-2xl px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-900/15">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold leading-tight tracking-tight">Study Desk</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">ครูผู้ช่วย · สพฐ. 2569</div>
          </div>
        </Link>

        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary-700 via-primary-700 to-primary-900 p-4 text-white shadow-lg shadow-primary-900/15">
          <div className="flex items-center gap-2 text-xs font-medium text-primary-100">
            <Clock3 className="h-3.5 w-3.5" /> นับถอยหลังถึงภาค ก
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{countdown.isPast ? '0' : countdown.days}</span>
            <span className="text-sm text-primary-100">วัน</span>
          </div>
          <div className="mt-1 text-xs text-primary-100/90">
            {countdown.isPast ? 'ถึงกำหนดสอบแล้ว' : `${countdown.hours} ชม. ${countdown.minutes} นาที`}
          </div>
          <div className="mt-3 border-t border-white/15 pt-3 text-xs text-white/80">{getPrimaryExam().labelShort}</div>
        </div>

        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">เมนูหลัก</div>
        <nav className="flex-1 space-y-1" aria-label="เมนูหลัก">
          {navItems.map(item => navLink(item))}
        </nav>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">โฟกัสการเตรียมสอบ</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">วางแผน · ฝึกทำข้อสอบ · ทบทวนจุดที่ยังไม่แม่น</div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-700 text-white lg:hidden"><BookOpen className="h-4 w-4" /></div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">{activeItem.label}</h1>
                <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">{formatBangkokDate(now)} · เวลาไทย</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-800 dark:bg-primary-900/30 dark:text-primary-200 sm:flex">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-35" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary-600" /></span>
                อีก {countdown.days} วันถึงสอบ
              </div>
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
                title={theme === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 lg:hidden dark:border-slate-800" aria-label="เมนูมือถือ">
            {navItems.map(item => navLink(item, true))}
          </nav>
        </header>

        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</div>
        <footer className="mx-auto max-w-[1500px] px-4 pb-6 text-xs text-slate-600 dark:text-slate-400 sm:px-6 lg:px-8">
          ข้อมูลกำหนดการและสถิติอาจเปลี่ยนแปลง โปรดตรวจประกาศจากหน่วยงานต้นทางก่อนดำเนินการ
        </footer>
      </main>
    </div>
  )
}

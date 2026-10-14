import { Link } from 'react-router-dom'

const KNOWN = [
  { to: '/', label: 'ภาพรวม' },
  { to: '/today', label: 'วันนี้' },
  { to: '/overview', label: 'แผนภาพรวม' },
  { to: '/history', label: 'ย้อนดูวัน' },
  { to: '/resources', label: 'คลังเรียน' },
  { to: '/timetable', label: 'ตารางติว' },
  { to: '/plan', label: 'แผนการอ่าน' },
  { to: '/videos', label: 'วิดีโอ' },
  { to: '/quiz', label: 'แบบทดสอบ' },
  { to: '/notes', label: 'โน้ต' },
  { to: '/info', label: 'ข้อมูลและสถิติ' },
]

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center" role="alert">
      <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">404</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">ไม่พบหน้านี้</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        ไม่พบเส้นทางนี้ หรือพิมพ์ URL ผิด เลือกเมนูที่มีอยู่แล้วด้านล่าง
      </p>
      <ul className="mt-8 flex flex-wrap justify-center gap-2">
        {KNOWN.map(item => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-primary-50 hover:text-primary-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/" className="mt-8 inline-flex text-sm font-semibold text-primary-800 hover:underline dark:text-primary-200">
        กลับหน้าภาพรวม
      </Link>
    </div>
  )
}

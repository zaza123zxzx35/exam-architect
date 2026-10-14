import { Link } from 'react-router-dom'
import { ArrowUpRight, BarChart3, CalendarDays, Info as InfoIcon, ShieldCheck } from 'lucide-react'
import { subjectStats } from '../data/hrmsStats'
import { safeResourceUrl } from '../lib/planner/safeLink.js'
import { PageHeader, StatusBanner } from '../components/ui'
import { districtEvidenceSummary } from '../lib/district/intelligence.js'

const fmt = value => Number(value).toLocaleString('th-TH')

function MetricCard({ label, value, detail, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-900 dark:bg-slate-800/70 dark:text-white',
    teal: 'bg-primary-50 text-primary-900 dark:bg-primary-900/25 dark:text-primary-100',
    amber: 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100',
    blue: 'bg-sky-50 text-sky-900 dark:bg-sky-900/20 dark:text-sky-100'
  }
  return (
    <div className={`rounded-2xl border border-black/5 p-4 dark:border-white/5 sm:p-5 ${tones[tone]}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs leading-relaxed opacity-70">{detail}</div>
    </div>
  )
}

export default function Info() {
  const stats = subjectStats
  const yearly = stats.yearlyDemand
  const maxDemand = Math.max(...yearly.map(item => item.replacementDemand))
  const latestExamYear = yearly.find(item => item.year === 2569)
  const safeSourceUrl = safeResourceUrl(stats.sourceUrl)
  const districtNote = districtEvidenceSummary([])

  return (
    <div className="space-y-6">
      <PageHeader
        title="ข้อมูลและสถิติ"
        description="สรุปกำลังครูจาก HRMS.OBEC (อ้างอิงได้) แยกจากบันทึกการแข่งขันรายเขตที่ผู้ใช้กรอกเองบนหน้าภาพรวม"
      />

      <StatusBanner tone="warning" title="HRMS ≠ ตำแหน่งเปิดสอบรายเขต">
        {districtNote.nationalStatsNote}
        {' '}บันทึกผู้สมัคร/อัตรารายเขตอยู่ที่หน้าภาพรวมเท่านั้น และเป็นข้อมูลในเบราว์เซอร์ของคุณ
        {' '}<Link to="/" className="font-semibold underline underline-offset-2">ไปบันทึกข่าวกรองเขต</Link>
      </StatusBanner>

      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 p-6 text-white shadow-xl shadow-primary-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-36 h-52 w-52 rounded-full border-[28px] border-white/5" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-primary-100">
            <BarChart3 className="h-3.5 w-3.5" /> ข้อมูลกำลังครู · วิชาเอกภาษาอังกฤษ
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-4xl">อ่านตัวเลขให้ตรงกับแหล่งข้อมูล</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
            สรุปข้อมูลจากตาราง HRMS.OBEC โดยแยก “เกษียณ” ออกจาก “ความต้องการทดแทน” ตามคอลัมน์ต้นทาง
            ตัวเลขนี้เป็นภาพรวมกำลังครู ไม่ใช่จำนวนตำแหน่งเปิดสอบของแต่ละเขต
          </p>
          {safeSourceUrl && (
          <a href={safeSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary-900 transition hover:bg-primary-50">
            เปิดตาราง HRMS.OBEC <ArrowUpRight className="h-4 w-4" />
          </a>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="เกณฑ์มาตรฐานวิชาเอก" value={fmt(stats.nationalSummary.standardQuota)} detail="จำนวนตามมาตรฐานกำลังครู" tone="slate" />
        <MetricCard label="ครูตาม จ.18" value={fmt(stats.nationalSummary.actualTeachers)} detail="ข้อมูลตามตาราง HRMS.OBEC" tone="blue" />
        <MetricCard label="ขาด/เกินจากเกณฑ์" value={fmt(stats.nationalSummary.deficit)} detail={`ขาด ${stats.nationalSummary.deficitPercent}% เมื่อเทียบกับเกณฑ์`} tone="amber" />
        <MetricCard label="ปี 2569 · เกษียณ" value={fmt(latestExamYear?.retired || 0)} detail={`ความต้องการทดแทนปีเดียวกัน ${fmt(latestExamYear?.replacementDemand || 0)} อัตรา`} tone="teal" />
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary-800 dark:text-primary-200">
              <CalendarDays className="h-5 w-5" />
              <h3 className="text-lg font-bold">แนวโน้ม 10 ปี · พ.ศ. 2564–2573</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">ตัวเลขแสดงตามสองคอลัมน์ที่แยกกันในตารางต้นทาง</p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-sm bg-primary-600" />เกษียณ</span>
            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />ต้องการทดแทน</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="ยอดเกษียณสะสม" value={fmt(stats.tenYearTotals.retired)} detail="รวมคอลัมน์ ‘เกษียณ’" tone="teal" />
          <MetricCard label="ความต้องการทดแทนสะสม" value={fmt(stats.tenYearTotals.replacementDemand)} detail="รวมคอลัมน์ ‘ต้องการ’" tone="amber" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-10" role="img" aria-label="กราฟเปรียบเทียบจำนวนเกษียณและความต้องการทดแทนครูภาษาอังกฤษรายปี พ.ศ. 2564 ถึง 2573">
          {yearly.map(item => (
            <div key={item.year} className="min-w-0 text-center">
              <div className="flex h-32 items-end justify-center gap-1 border-b border-slate-200 px-1 dark:border-slate-700">
                <div title={`เกษียณ ${fmt(item.retired)}`} className="w-4 rounded-t-md bg-primary-600 transition-all" style={{ height: `${Math.max(2, item.retired / maxDemand * 100)}%` }} />
                <div title={`ต้องการทดแทน ${fmt(item.replacementDemand)}`} className="w-4 rounded-t-md bg-amber-400 transition-all" style={{ height: `${Math.max(4, item.replacementDemand / maxDemand * 100)}%` }} />
              </div>
              <div className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">{String(item.year).slice(-2)}</div>
              <div className="mt-1 space-y-0.5 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                <div>{fmt(item.retired)}</div>
                <div>{fmt(item.replacementDemand)}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">หมายเหตุ: แท่งทั้งสองสีใช้สเกลเดียวกันเพื่อเทียบจำนวนจริงจากตาราง แสดงความต้องการตามมาตรฐาน ไม่ใช่การพยากรณ์ว่าจะเปิดรับสอบหรือบรรจุจำนวนเท่านี้</p>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white"><InfoIcon className="h-5 w-5 text-primary-700 dark:text-primary-300" /><h3 className="font-bold">ตัวเลขเหล่านี้บอกอะไร?</h3></div>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li><strong className="text-slate-900 dark:text-white">เกณฑ์มาตรฐาน / ครูตาม จ.18</strong> ใช้เห็นภาพจำนวนครูจริงเทียบกับจำนวนตามมาตรฐานที่ตารางแสดง</li>
            <li><strong className="text-slate-900 dark:text-white">เกษียณ</strong> คือจำนวนที่คาดว่าจะเกษียณในปีนั้นตามตาราง ส่วน <strong className="text-slate-900 dark:text-white">ต้องการทดแทน</strong> เป็นอีกคอลัมน์หนึ่ง ห้ามบวกสองค่านี้แล้วเรียกว่า “ยอดเกษียณ”</li>
            <li><strong className="text-slate-900 dark:text-white">ตำแหน่งเปิดสอบรายเขต</strong> ต้องตรวจจากประกาศรับสมัครของเขต/หน่วยงานที่รับผิดชอบ แยกจากสถิติภาพรวมระดับประเทศนี้</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-900/60 dark:bg-primary-950/30">
          <div className="flex items-center gap-2 font-bold text-primary-900 dark:text-primary-100"><ShieldCheck className="h-5 w-5" /> ที่มาและความสดของข้อมูล</div>
          <p className="mt-3 text-sm leading-relaxed text-primary-900/80 dark:text-primary-100/80">ตรวจเทียบกับหน้า HRMS.OBEC เมื่อ {stats.checkedAt} แต่หน้านี้ยังไม่มีการเชื่อม API เพื่อดึงข้อมูลอัตโนมัติ ตัวเลขจึงเป็น snapshot ณ วันที่ตรวจ ไม่ใช่ real-time</p>
          {safeSourceUrl && (
          <a href={safeSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary-800 underline decoration-primary-400 underline-offset-4 hover:text-primary-950 dark:text-primary-200 dark:hover:text-white">
            ตรวจข้อมูลล่าสุดจากต้นทาง <ArrowUpRight className="h-4 w-4" />
          </a>
          )}
        </div>
      </section>
    </div>
  )
}

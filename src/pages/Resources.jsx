import { useMemo, useState } from 'react'
import { ExternalLink, Library, Link2, AlertTriangle, Inbox } from 'lucide-react'
import { courses, importantLinks } from '../data/htmlPlannerData'
import { buildHtmlResourceAccounting } from '../lib/planner/resourceAccounting'
import { safeResourceUrl } from '../lib/planner/safeLink'
import { initialVideos } from '../data/videoData'
import { PageHeader, EmptyState, FilterChips, StatusBanner } from '../components/ui'

const RESOURCE_FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'not-in-videos', label: 'ไม่ใช่ใน Videos' },
  { id: 'duplicate', label: 'ซ้ำ' },
  { id: 'important', label: 'ลิงก์สำคัญ' },
  { id: 'uid', label: 'มี u_id' },
]

const statusTone = {
  imported: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  duplicate: 'bg-amber-50 text-amber-900 border-amber-200',
  incomplete: 'bg-sky-50 text-sky-900 border-sky-200',
  malformed: 'bg-rose-50 text-rose-800 border-rose-200',
}

export default function Resources() {
  const accounting = useMemo(() => buildHtmlResourceAccounting(initialVideos), [])
  const [filter, setFilter] = useState('all')

  const filtered = accounting.rows.filter(row => {
    if (filter === 'all') return true
    if (filter === 'not-in-videos') return row.flags.includes('not-in-video-library')
    if (filter === 'duplicate') return row.status === 'duplicate' || row.flags.includes('duplicate-in-videos')
    if (filter === 'important') return row.source === 'importantLinks'
    if (filter === 'uid') return row.flags.includes('contains-u_id')
    return true
  })

  // Unique URLs not in video library (the audit's "38" class)
  const uniqueMissing = useMemo(() => {
    const map = new Map()
    for (const row of accounting.rows) {
      if (!row.flags.includes('not-in-video-library')) continue
      if (!map.has(row.url)) map.set(row.url, row)
    }
    return [...map.values()]
  }, [accounting.rows])

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="ทรัพยากรติว"
        description="คอร์ส ลิงก์สำคัญ และบัญชี URL จากแผน HTML — ไม่ตัดทอนและไม่สร้างลิงก์ใหม่"
      />

      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Library className="h-5 w-5 text-primary-700" /> คอร์สที่ติดตาม
        </h2>
        <p className="mt-1 text-xs text-slate-500">พอร์ตจาก HTML planner `courses[]` — ไม่ตัดทอนข้อความต้นทาง</p>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {courses.map(course => (
            <li key={course.name} className="py-3">
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{course.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{course.desc}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Link2 className="h-5 w-5 text-primary-700" /> ลิงก์สำคัญ
        </h2>
        <ul className="mt-4 space-y-2">
          {importantLinks.map(link => {
            const safeHref = safeResourceUrl(link.url)
            return (
              <li key={link.url}>
                {safeHref ? (
                  <>
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:underline dark:text-sky-300"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {link.name}
                    </a>
                    <div className="mt-0.5 break-all pl-6 text-[11px] text-slate-400">{safeHref}</div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{link.name}</div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-amber-600" /> บัญชีทรัพยากรจาก HTML (ไม่ทิ้งลิงก์)
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              inventory {accounting.summary.inventoryRows} แถว · unique {accounting.summary.uniqueUrls} URL ·
              ไม่มีในคลังวิดีโอ English {accounting.summary.notInVideoLibraryUnique} URL
              (ตรงกับชุด 38 จาก Phase D เมื่อนับ unique ที่ไม่อยู่ใน videoData)
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['แถวทั้งหมด', accounting.summary.inventoryRows],
            ['ไม่ใช่ใน Videos', accounting.summary.notInVideoLibraryUnique],
            ['ซ้ำในแผน', accounting.summary.duplicatePlannerRows],
            ['มี u_id', accounting.summary.withUidFlag],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <div className="font-mono text-xl font-semibold text-slate-900 dark:text-white">{value}</div>
              <div className="text-[11px] text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <FilterChips
          className="mt-4"
          ariaLabel="กรองบัญชีทรัพยากร"
          options={RESOURCE_FILTERS}
          value={filter}
          onChange={setFilter}
        />

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Inbox}
            title="ไม่มีรายการในตัวกรองนี้"
            description="ลองเลือกตัวกรองอื่น หรือกลับไปที่ «ทั้งหมด» เพื่อดูบัญชีครบ"
          />
        ) : (
          <ul className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {filtered.map(row => {
              const safeHref = safeResourceUrl(row.url)
              return (
                <li key={row.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge border ${statusTone[row.status] || statusTone.imported}`}>{row.status}</span>
                    <span className="text-[11px] text-slate-400">{row.source}</span>
                    {row.dayIndex != null && (
                      <span className="text-[11px] text-slate-400">day {row.dayIndex + 1} · task {row.taskIndex + 1}</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">{row.title}</div>
                  {safeHref ? (
                    <a href={safeHref} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-[11px] text-sky-700 hover:underline dark:text-sky-300">
                      {safeHref}
                    </a>
                  ) : (
                    <div className="mt-1 text-[11px] text-slate-400">ลิงก์ไม่พร้อมแสดง (รูปแบบไม่รองรับ)</div>
                  )}
                  {row.flags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.flags.map(flag => (
                        <span key={flag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{flag}</span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <StatusBanner tone="warning" className="mt-6" title="บัญชีครบ — ไม่ scrub อัตโนมัติ">
          Unique URLs จากแผน HTML ที่ยังไม่อยู่ใน `videoData.js`: <strong>{uniqueMissing.length}</strong>
          — เก็บครบในรายการด้านบน ไม่ลบและไม่สร้าง URL ใหม่ ลิงก์ซ้ำในคลังวิดีโอ English ยังคงแสดงในหน้า Videos ตามเดิม
        </StatusBanner>
      </section>
    </div>
  )
}

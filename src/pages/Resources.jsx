import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  Library,
  Link2,
  AlertTriangle,
  Inbox,
  Search,
  FileQuestion,
  NotebookPen,
  PlayCircle,
  CalendarCheck,
} from 'lucide-react'
import { courses, importantLinks } from '../data/htmlPlannerData'
import { buildHtmlResourceAccounting } from '../lib/planner/resourceAccounting'
import { safeResourceUrl } from '../lib/planner/safeLink'
import { initialVideos } from '../data/videoData'
import { initialQuizzes } from '../data/quizData'
import { initialNotes } from '../data/notesData'
import { initialStudyPlan } from '../data/planData'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { PageHeader, EmptyState, FilterChips, StatusBanner } from '../components/ui'
import {
  buildStudyHubCatalog,
  countByExamPart,
  describeHubFilterStatus,
  filterStudyHubItems,
  HUB_EXAM_PART_FILTERS,
  HUB_EXAM_PART_LABELS,
  HUB_KIND_LABELS,
  HUB_KINDS,
  HUB_SUBJECT_LABELS,
} from '../lib/study/hub'

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

const kindIcon = {
  quiz: FileQuestion,
  note: NotebookPen,
  video: PlayCircle,
  plan: CalendarCheck,
  link: Link2,
}

export default function Resources() {
  const [quizzes] = useLocalStorage('study_quizzes', initialQuizzes)
  const [notes] = useLocalStorage('study_notes', initialNotes)
  const [videos] = useLocalStorage('study_videos', initialVideos)

  const [examPart, setExamPart] = useState('all')
  const [kind, setKind] = useState('all')
  const [subjectId, setSubjectId] = useState('all')
  const [query, setQuery] = useState('')
  const [inventoryFilter, setInventoryFilter] = useState('all')

  const accounting = useMemo(() => buildHtmlResourceAccounting(initialVideos), [])

  const catalog = useMemo(() => buildStudyHubCatalog({
    quizzes,
    notes,
    videos,
    planItems: initialStudyPlan,
    links: importantLinks.map((link, index) => ({
      id: `important_${index}`,
      title: link.name,
      url: link.url,
      source: 'importantLinks',
    })),
  }), [quizzes, notes, videos])

  const partCounts = useMemo(() => countByExamPart(catalog), [catalog])

  const filteredHub = useMemo(() => filterStudyHubItems(catalog, {
    examPart,
    kind,
    subjectId,
    query,
  }), [catalog, examPart, kind, subjectId, query])

  const subjectOptions = useMemo(() => {
    const ids = new Set(catalog.map(item => item.taxonomy.subjectId))
    return [
      { id: 'all', label: 'ทุกวิชา' },
      ...[...ids]
        .filter(id => id && id !== 'unknown')
        .sort()
        .map(id => ({ id, label: HUB_SUBJECT_LABELS[id] || id })),
      ...(ids.has('unknown') ? [{ id: 'unknown', label: HUB_SUBJECT_LABELS.unknown }] : []),
    ]
  }, [catalog])

  const inventoryRows = accounting.rows.filter(row => {
    if (inventoryFilter === 'all') return true
    if (inventoryFilter === 'not-in-videos') return row.flags.includes('not-in-video-library')
    if (inventoryFilter === 'duplicate') return row.status === 'duplicate' || row.flags.includes('duplicate-in-videos')
    if (inventoryFilter === 'important') return row.source === 'importantLinks'
    if (inventoryFilter === 'uid') return row.flags.includes('contains-u_id')
    return true
  })

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
        title="คลังเรียน"
        description="ศูนย์รวมแบบทดสอบ โน้ต วิดีโอ แผนอ่าน และลิงก์ — กรองตามภาค/วิชาจาก taxonomy แบบ classify-on-read"
        actions={(
          <Link to="/library" className="btn-secondary text-xs">
            <Library className="h-3.5 w-3.5" /> คลังหลักสูตรรวม (ก+ข)
          </Link>
        )}
      />

      <section className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Library className="h-5 w-5 text-primary-700" /> ศูนย์ทรัพยากรติว
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {describeHubFilterStatus({
                catalogCount: catalog.length,
                filteredCount: filteredHub.length,
                examPart,
                subjectId,
                kind,
                query,
              })}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อหรือหัวข้อ..."
            className="input pl-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ภาคสอบ</p>
          <FilterChips
            ariaLabel="กรองตามภาคสอบ"
            options={HUB_EXAM_PART_FILTERS.map(id => ({
              id,
              label: partCounts[id]
                ? `${HUB_EXAM_PART_LABELS[id]} (${partCounts[id]})`
                : HUB_EXAM_PART_LABELS[id],
            }))}
            value={examPart}
            onChange={setExamPart}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ประเภท</p>
          <FilterChips
            ariaLabel="กรองตามประเภททรัพยากร"
            options={HUB_KINDS.map(id => ({ id, label: HUB_KIND_LABELS[id] }))}
            value={kind}
            onChange={setKind}
          />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">วิชา</p>
          <FilterChips
            ariaLabel="กรองตามวิชา"
            options={subjectOptions}
            value={subjectId}
            onChange={setSubjectId}
          />
        </div>

        {filteredHub.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="ไม่พบทรัพยากรที่ตรงเงื่อนไข"
            description="ลองเลือก «ทุกภาค» หรือล้างคำค้นหา — ระบบไม่สร้างรายการใหม่ให้อัตโนมัติ"
          />
        ) : (
          <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {filteredHub.map(item => {
              const Icon = kindIcon[item.kind] || Library
              const safeHref = item.url ? safeResourceUrl(item.url) : null
              const confidence = item.taxonomy.confidence
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-slate-50 p-2 text-primary-700 dark:bg-slate-800 dark:text-primary-300">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {HUB_KIND_LABELS[item.kind]}
                        </span>
                        <span className="badge bg-primary-50 text-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
                          {HUB_EXAM_PART_LABELS[item.taxonomy.examPart] || item.taxonomy.examPart}
                        </span>
                        <span className="badge bg-white text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700">
                          {HUB_SUBJECT_LABELS[item.taxonomy.subjectId] || item.taxonomy.subjectId}
                        </span>
                        {confidence !== 'explicit' ? (
                          <span className="text-[10px] text-amber-700 dark:text-amber-300">
                            ความมั่นใจ: {confidence}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </div>
                      {item.subtitle ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          {item.subtitle}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {item.href ? (
                          <Link to={item.href} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                            เปิดหน้า{HUB_KIND_LABELS[item.kind]}
                          </Link>
                        ) : null}
                        {safeHref ? (
                          <a
                            href={safeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline dark:text-sky-300"
                          >
                            <ExternalLink className="h-3 w-3" /> เปิดลิงก์
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <StatusBanner tone="info" title="จัดหมวดจากเนื้อหาเท่านั้น">
          ตัวกรองใช้ examPart / subjectId จาก taxonomy แบบอ่านอย่างเดียว ไม่ใช้ scheduleExamId
          เป็นตัวกรองเนื้อหา และไม่แยก `english-skills-a` กับ `english-major` ปนกัน
        </StatusBanner>
      </section>

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
          value={inventoryFilter}
          onChange={setInventoryFilter}
        />

        {inventoryRows.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={Inbox}
            title="ไม่มีรายการในตัวกรองนี้"
            description="ลองเลือกตัวกรองอื่น หรือกลับไปที่ «ทั้งหมด» เพื่อดูบัญชีครบ"
          />
        ) : (
          <ul className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">
            {inventoryRows.map(row => {
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

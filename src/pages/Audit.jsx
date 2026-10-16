import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, Link2, Copy } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader.jsx'
import StatusBanner from '../components/ui/StatusBanner.jsx'
import { buildCatalogReviewReport } from '../lib/curated/catalogReview.js'
import { auditCuratedCatalog } from '../lib/curated/validateCatalog.js'
import { analyzeContentOverlap } from '../lib/curated/contentOverlap.js'
import { CURATED_CATALOG_VERSION } from '../data/curatedCatalog.js'
import { enrichCuratedResources } from '../lib/curated/catalog.js'
import { HUB_SUBJECT_LABELS } from '../lib/study/hub.js'

function subjectLabel(id) {
  return HUB_SUBJECT_LABELS[id] || id || '—'
}

export default function Audit() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('collisions')

  const review = useMemo(() => buildCatalogReviewReport(), [])
  const audit = useMemo(() => auditCuratedCatalog(), [])
  const overlap = useMemo(() => analyzeContentOverlap(), [])
  const byId = useMemo(() => {
    const map = new Map()
    for (const row of enrichCuratedResources()) map.set(row.id, row)
    return map
  }, [])

  const filterText = (parts) => {
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return parts.some((p) => String(p || '').toLowerCase().includes(needle))
  }

  const shared = (review.sharedUrlGroups || []).filter((g) => {
    const rows = g.ids.map((id) => byId.get(id)).filter(Boolean)
    return filterText([
      ...g.ids,
      ...rows.map((r) => r.title),
      ...rows.map((r) => r.series),
    ])
  })

  const collisions = (review.confirmedSameSeriesUrlCollisions || []).filter((g) => (
    filterText([...g.ids, g.series, ...(g.titles || [])])
  ))

  const crossPart = (review.crossPartEnglishShareSuspicions || []).filter((g) => filterText(g.ids))

  const titleDupes = (review.possibleDuplicateTitles || []).filter((d) => filterText([d.titleKey, ...d.ids]))

  const needsFull = (review.needsFullUrlSlots || []).filter((s) => filterText([s.id, s.title, s.series, s.stubUrl]))

  const uncheckedSample = (review.uncheckedSlots || [])
    .filter((s) => filterText([s.id, s.title, s.series]))
    .slice(0, 40)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="ตรวจรายการซ้ำและความครบถ้วน"
        description={`คลัง ${CURATED_CATALOG_VERSION} · ${audit.totalRows} รายการ · ไม่รวมอัตโนมัติ · ต้องยืนยันด้วยมือ`}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link to="/library" className="btn-secondary text-xs">คลังหลักสูตร</Link>
            <Link to="/today" className="btn-secondary text-xs">วันนี้</Link>
            <Link to="/review" className="btn-secondary text-xs">ทบทวนข้อผิด</Link>
          </div>
        )}
      />

      <StatusBanner tone={audit.ok ? 'info' : 'warning'} title={audit.ok ? 'ไม่พบ error โครงสร้าง' : 'พบ error ในคลัง'}>
        ชน URL ในชุด {review.confirmedSameSeriesUrlCollisions?.length || 0}
        · แชร์ URL {review.sharedUrlGroups?.length || 0} กลุ่ม
        · ข้อสงสัย ก/ข อังกฤษ {review.crossPartEnglishShareSuspicions?.length || 0}
        · ชื่อตอนซ้ำ {review.possibleDuplicateTitles?.length || 0}
        · URL ไม่ครบ {review.needsFullUrlSlots?.length || 0}
        · unchecked {review.summary?.unchecked ?? 0}
        · verified จริง {review.summary?.verified_accessible ?? 0}
      </StatusBanner>

      <div className="card flex flex-wrap items-center gap-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder="ค้นหา id / ชื่อตอน / ชุด…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="ค้นหารายงานซ้ำ"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="ประเภทปัญหา">
        {[
          { id: 'overlap', label: `วิเคราะห์ซ้ำ (${overlap.summary.chooseOneGroups + overlap.summary.complementaryGroups})` },
          { id: 'collisions', label: `ชน URL ในชุด (${collisions.length})` },
          { id: 'shared', label: `URL ร่วม (${shared.length})` },
          { id: 'cross', label: `สงสัย ก/ข (${crossPart.length})` },
          { id: 'titles', label: `ชื่อคล้าย (${titleDupes.length})` },
          { id: 'needs', label: `URL ไม่ครบ (${needsFull.length})` },
          { id: 'unchecked', label: 'ยังไม่ตรวจ' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${tab === t.id ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overlap' && (
        <section className="card space-y-4">
          <h2 className="text-lg font-bold">วิเคราะห์เนื้อหาซ้ำหลายสำนัก</h2>
          <p className="text-xs text-slate-500">
            must ที่ยังไม่แชร์ URL {overlap.summary.mustUnique}
            · เลือกแหล่งเดียว {overlap.summary.chooseOneGroups} กลุ่ม
            · เสริมกัน (รอยืนยัน) {overlap.summary.complementaryGroups}
            · ทบทวนทีหลัง {overlap.summary.reviewLater}
            · ไม่แน่ใจ {overlap.summary.uncertainGroups}
          </p>
          <div>
            <h3 className="text-sm font-semibold">1) เลือกเรียนแหล่งหลักได้ (หลักฐาน: URL ร่วม)</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {overlap.chooseOne.slice(0, 12).map((g) => (
                <li key={g.ids.join('-')} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  <p className="font-medium">{g.ids.join(' ↔ ')}</p>
                  <p className="text-xs text-slate-500">{g.tutors?.join(' · ')} · {g.actionTh}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">2) อาจเสริมกัน — รอยืนยัน (ชื่อคล้าย ลิงก์ต่าง)</h3>
            {overlap.complementary.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">ไม่พบกลุ่มนี้จากข้อมูลปัจจุบัน</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {overlap.complementary.slice(0, 8).map((g) => (
                  <li key={g.ids.join('-')} className="rounded-lg border border-amber-200 p-2 dark:border-amber-900">
                    <p className="font-medium">{g.ids.join(' ↔ ')}</p>
                    <p className="text-xs">{g.actionTh}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ul className="list-disc pl-4 text-xs text-slate-500">
            {overlap.policyTh.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      )}

      {tab === 'collisions' && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-rose-600" /> URL เดียวกัน · คนละตอนในชุดเดียวกัน</h2>
          <p className="text-xs text-slate-500">สัญญาณแรงที่สุดจาก audit — ยังไม่ลบ/รวมอัตโนมัติ ต้องยืนยันว่าตอนไหนลิงก์ผิด</p>
          {collisions.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบกลุ่มตามคำค้น</p>
          ) : collisions.map((g) => (
            <article key={g.ids.join('-')} className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900 dark:bg-rose-950/20">
              <p className="text-sm font-semibold">{g.series}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {g.ids.map((id, i) => (
                  <li key={id}>
                    <code className="text-xs">{id}</code>
                    {' · ep '}{g.episodes?.[i] ?? '—'}
                    {' · '}{g.titles?.[i] || '—'}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-rose-900 dark:text-rose-100">{g.actionTh}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'shared' && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Link2 className="h-5 w-5" /> URL เดียวกันหลายรายการ</h2>
          <p className="text-xs text-slate-500">ยืนยันแล้วว่าใช้ลิงก์ร่วมได้โดยตั้งใจ (เช่น ไลฟ์คืนเดียวครอบคลุม ก+ข) — ห้ามรวมอัตโนมัติถ้ายังไม่แน่ใจเนื้อหา</p>
          {shared.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบกลุ่มตามคำค้น</p>
          ) : shared.map((g) => (
            <article key={g.ids.join('-')} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500">คงแยกเป็นคนละรายการจนกว่าจะยืนยันว่าเป็นตอนเดียวกัน</p>
              <ul className="mt-2 space-y-1 text-sm">
                {g.ids.map((id) => {
                  const row = byId.get(id)
                  return (
                    <li key={id}>
                      <code className="text-xs">{id}</code>
                      {' · '}{row?.title || '—'}
                      {' · '}{subjectLabel(row?.subjectId)}
                      {' · ภาค '}{row?.examPart || '—'}
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{g.actionTh}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'cross' && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-amber-600" /> ข้อสงสัย — อังกฤษภาค ก กับวิชาเอก</h2>
          <p className="text-xs text-slate-500">ยังไม่ยืนยันว่าเป็นแหล่งเดียวกัน — ต้องตรวจเนื้อหาก่อนรวม</p>
          {crossPart.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบกลุ่มตามคำค้น</p>
          ) : crossPart.map((g) => (
            <article key={g.ids.join('-')} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              <p className="text-sm font-medium">{g.ids.join(' ↔ ')}</p>
              <p className="mt-1 text-xs">วิชา: {g.subjects.join(', ')} · ภาค: {g.examParts.join(', ')}</p>
              <p className="mt-1 text-xs text-amber-900 dark:text-amber-100">{g.actionTh}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'titles' && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">ชื่อตอนคล้าย / ซ้ำในชุด</h2>
          {titleDupes.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบชื่อตอนซ้ำที่ยืนยันได้ตอนนี้</p>
          ) : titleDupes.map((d) => (
            <article key={d.titleKey} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <p className="font-medium">{d.titleKey}</p>
              <p className="mt-1 text-xs">{d.ids.join(', ')}</p>
              <p className="mt-1 text-xs text-slate-500">{d.actionTh}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'needs' && (
        <section className="card space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Copy className="h-5 w-5" /> หัวข้อที่ยังไม่มี URL เต็ม</h2>
          <p className="text-xs text-slate-500">ต้องให้คุณวางลิงก์เต็ม — ระบบไม่เดาจาก stub</p>
          {needsFull.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบรายการตามคำค้น</p>
          ) : needsFull.map((s) => (
            <article key={s.id} className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900 dark:bg-rose-950/20">
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                <code>{s.id}</code> · {s.series} · {subjectLabel(s.subjectId)}
              </p>
              <p className="mt-1 break-all text-xs">{s.stubUrl || '(ว่าง)'}</p>
              <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">{s.missingTh}</p>
            </article>
          ))}
        </section>
      )}

      {tab === 'unchecked' && (
        <section className="card space-y-3">
          <h2 className="text-lg font-bold">URL รูปแบบครบแต่ยังไม่ตรวจสิทธิ์ (ตัวอย่าง)</h2>
          <p className="text-xs text-slate-500">ห้ามถือว่าเปิดได้จริงจนกว่าจะมีหลักฐาน verified</p>
          {uncheckedSample.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่พบตามคำค้น</p>
          ) : (
            <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
              {uncheckedSample.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  <span className="font-medium">{s.title}</span>
                  <div className="text-xs text-slate-500"><code>{s.id}</code> · {subjectLabel(s.subjectId)}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="card space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">นโยบายรายงาน</h2>
        <ul className="list-disc space-y-1 pl-4">
          {(review.policyTh || []).map((p) => <li key={p}>{p}</li>)}
        </ul>
      </section>
    </div>
  )
}

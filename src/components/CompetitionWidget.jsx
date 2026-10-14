import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, ExternalLink, Info, Plus, Save, Trash2, Users } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const todayInBangkok = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date())
const fmt = value => Number(value).toLocaleString('th-TH')

export default function CompetitionWidget() {
  const [savedRates, setRates] = useLocalStorage('competition_rates_v1', [])
  const rates = useMemo(() => (Array.isArray(savedRates) ? savedRates.filter(row => !String(row.id).startsWith('seed-')) : []), [savedRates])
  const [showForm, setShowForm] = useState(false)
  const [sortAsc, setSortAsc] = useState(true)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ district: '', subject: 'ภาษาอังกฤษ', vacancies: '', applicants: '', measuredAt: todayInBangkok(), sourceUrl: '', note: '' })

  useEffect(() => {
    if (Array.isArray(savedRates) && savedRates.length !== rates.length) setRates(rates)
  }, [rates, savedRates, setRates])

  const sortedRates = useMemo(() => [...rates].sort((a, b) => {
    const first = Number(a.vacancies) > 0 ? Number(a.applicants) / Number(a.vacancies) : Infinity
    const second = Number(b.vacancies) > 0 ? Number(b.applicants) / Number(b.vacancies) : Infinity
    return sortAsc ? first - second : second - first
  }), [rates, sortAsc])

  const resetForm = () => {
    setForm({ district: '', subject: 'ภาษาอังกฤษ', vacancies: '', applicants: '', measuredAt: todayInBangkok(), sourceUrl: '', note: '' })
    setEditId(null)
  }

  const submit = event => {
    event.preventDefault()
    if (!form.district.trim() || form.vacancies === '' || form.applicants === '' || !form.measuredAt) return
    const entry = {
      id: editId || `record-${Date.now()}`,
      district: form.district.trim(),
      subject: form.subject.trim() || 'ภาษาอังกฤษ',
      vacancies: Number(form.vacancies),
      applicants: Number(form.applicants),
      updatedAt: form.measuredAt,
      sourceUrl: form.sourceUrl.trim(),
      note: form.note.trim()
    }
    setRates(previous => editId ? previous.map(row => row.id === editId ? entry : row) : [...rates, entry])
    resetForm()
    setShowForm(false)
  }

  const edit = row => {
    setForm({
      district: row.district || '',
      subject: row.subject || 'ภาษาอังกฤษ',
      vacancies: String(row.vacancies ?? ''),
      applicants: String(row.applicants ?? ''),
      measuredAt: row.updatedAt || todayInBangkok(),
      sourceUrl: row.sourceUrl || '',
      note: row.note || ''
    })
    setEditId(row.id)
    setShowForm(true)
  }

  const remove = id => {
    if (window.confirm('ลบข้อมูลรายการนี้ออกจากเบราว์เซอร์อุปกรณ์นี้ใช่ไหม?')) setRates(previous => previous.filter(row => row.id !== id))
  }

  const completeCount = rates.filter(row => Number(row.vacancies) > 0 && Number.isFinite(Number(row.applicants))).length

  return (
    <section className="card overflow-hidden !p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200"><BarChart3 className="h-5 w-5" /></div>
          <div className="min-w-0"><h3 className="font-bold text-slate-900 dark:text-white">บันทึกตัวเลขการแข่งขัน</h3><p className="text-xs text-slate-500 dark:text-slate-400">{rates.length} เขต · {completeCount} รายการมีข้อมูลคำนวณได้</p></div>
        </div>
        <div className="flex items-center gap-2">
          {rates.length > 1 && <button type="button" onClick={() => setSortAsc(value => !value)} className="btn-secondary !px-3 !py-2 text-xs">เรียง {sortAsc ? 'น้อย → มาก' : 'มาก → น้อย'}</button>}
          <button type="button" onClick={() => { setShowForm(value => !value); resetForm() }} className="btn-primary !px-3 !py-2 text-xs"><Plus className="h-4 w-4" />{showForm ? 'ปิดฟอร์ม' : 'เพิ่มข้อมูล'}</button>
        </div>
      </div>

      <div className="flex gap-3 border-b border-sky-100 bg-sky-50/80 px-5 py-3 text-xs leading-relaxed text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100 sm:px-6">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p><strong>ไม่ใช่ข้อมูล Real-Time:</strong> หน้านี้ยังไม่ได้เชื่อม API ยอดผู้สมัครของหน่วยงาน ตัวเลขที่คุณเพิ่มจะอยู่ในเบราว์เซอร์อุปกรณ์นี้เท่านั้น และอัตราส่วนเป็นเพียงการคำนวณจากยอดที่กรอก ไม่ใช่โอกาสสอบติด</p>
      </div>

      {showForm && <form onSubmit={submit} className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/40 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div><label className="label">เขต/หน่วยงาน *</label><input required className="input" placeholder="เช่น สพป. ..." value={form.district} onChange={event => setForm({ ...form, district: event.target.value })} /></div>
        <div><label className="label">วิชาเอก</label><input className="input" value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} /></div>
        <div><label className="label">จำนวนอัตรา *</label><input required type="number" min="1" className="input" value={form.vacancies} onChange={event => setForm({ ...form, vacancies: event.target.value })} /></div>
        <div><label className="label">จำนวนผู้สมัคร *</label><input required type="number" min="0" className="input" value={form.applicants} onChange={event => setForm({ ...form, applicants: event.target.value })} /></div>
        <div><label className="label">วันที่ของข้อมูล *</label><input required type="date" className="input" value={form.measuredAt} onChange={event => setForm({ ...form, measuredAt: event.target.value })} /></div>
        <div><label className="label">ลิงก์แหล่งข้อมูล</label><input type="url" className="input" placeholder="https://..." value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">หมายเหตุ (ไม่บังคับ)</label><input className="input" placeholder="เช่น อ้างอิงประกาศของเขต" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} /></div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4"><button type="submit" className="btn-success"><Save className="h-4 w-4" />{editId ? 'บันทึกการแก้ไข' : 'บันทึกรายการ'}</button><button type="button" onClick={() => { setShowForm(false); resetForm() }} className="btn-secondary">ยกเลิก</button></div>
      </form>}

      {sortedRates.length === 0 ? <div className="px-5 py-10 text-center sm:px-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Users className="h-6 w-6" /></div>
        <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">ยังไม่มีข้อมูลที่ยืนยันแหล่งได้</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">เพิ่มจำนวนอัตราและผู้สมัครจากประกาศ/ระบบทางการ พร้อมวันที่และลิงก์อ้างอิง เพื่อคำนวณผู้สมัครต่อหนึ่งอัตรา</p>
      </div> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {sortedRates.map((row, index) => {
          const vacancies = Number(row.vacancies)
          const applicants = Number(row.applicants)
          const ratio = vacancies > 0 ? applicants / vacancies : null
          return <article key={row.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-900 dark:text-white">{row.district}</h4><span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{row.subject || 'ภาษาอังกฤษ'}</span></div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400"><span>อัตรา {fmt(vacancies)}</span><span>ผู้สมัคร {fmt(applicants)}</span><span>วันที่ข้อมูล {row.updatedAt || 'ไม่ระบุ'}</span></div>
              {row.note && <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{row.note}</p>}
              {row.sourceUrl && <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary-800 hover:underline dark:text-primary-200">เปิดแหล่งข้อมูล <ExternalLink className="h-3 w-3" /></a>}
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="rounded-xl bg-primary-50 px-4 py-2 text-right dark:bg-primary-900/25"><div className="text-[10px] font-semibold text-primary-800/70 dark:text-primary-200/70">ผู้สมัครต่ออัตรา</div><div className="text-lg font-bold text-primary-900 dark:text-primary-100">{ratio === null ? '—' : `1:${ratio.toFixed(1)}`}</div></div>
              <div className="flex gap-1"><button type="button" onClick={() => edit(row)} aria-label={`แก้ไข ${row.district}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-700 dark:text-slate-400 dark:hover:bg-slate-800"><CalendarDays className="h-4 w-4" /></button><button type="button" onClick={() => remove(row.id)} aria-label={`ลบ ${row.district}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </article>
        })}
      </div>}
    </section>
  )
}

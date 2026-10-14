import { useState } from 'react'
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Save,
  BookOpen
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialNotes } from '../data/notesData'
import { PageHeader, EmptyState, FilterChips } from '../components/ui'

const categoryColors = {
  'ภาค ก': 'bg-blue-100 text-blue-700',
  'ภาค ข': 'bg-green-100 text-green-700',
  'ภาค ค': 'bg-purple-100 text-purple-700'
}

export default function Notes() {
  const [notes, setNotes] = useLocalStorage('study_notes', initialNotes)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('ทุกหมวด')
  const [mode, setMode] = useState('list') // list, view, edit, new
  const [activeId, setActiveId] = useState(null)
  const [form, setForm] = useState({ category: 'ภาค ก', subject: '', title: '', content: '' })

  const categories = ['ทุกหมวด', 'ภาค ก', 'ภาค ข', 'ภาค ค']

  const filtered = notes.filter(n => {
    const matchCat = filterCat === 'ทุกหมวด' || n.category === filterCat
    const matchSearch = !search || `${n.title} ${n.subject} ${n.content}`.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const active = activeId ? notes.find(n => n.id === activeId) : null

  const startNew = () => {
    setMode('new')
    setActiveId(null)
    setForm({ category: 'ภาค ก', subject: '', title: '', content: '' })
  }

  const startEdit = (note) => {
    setMode('edit')
    setActiveId(note.id)
    setForm({ category: note.category, subject: note.subject, title: note.title, content: note.content })
  }

  const saveNote = () => {
    if (!form.title.trim() || !form.content.trim()) return
    if (mode === 'new') {
      const n = {
        id: `n${Date.now()}`,
        category: form.category,
        subject: form.subject || form.category,
        title: form.title.trim(),
        content: form.content,
        createdAt: new Date().toISOString()
      }
      setNotes(prev => [n, ...prev])
      setActiveId(n.id)
    } else if (mode === 'edit' && activeId) {
      setNotes(prev => prev.map(n =>
        n.id === activeId ? { ...n, ...form, title: form.title.trim() } : n
      ))
    }
    setMode('view')
  }

  const deleteNote = (id) => {
    if (!confirm('ลบโน้ตนี้ใช่ไหม?')) return
    setNotes(prev => prev.filter(n => n.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setMode('list')
    }
  }

  const back = () => {
    setMode('list')
    setActiveId(null)
  }

  // Editor / View
  if (mode === 'view' && active) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={back} className="btn-secondary text-sm">
            ← กลับรายการโน้ต
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => startEdit(active)} className="btn-secondary text-sm">
              <Edit3 className="w-4 h-4" /> แก้ไข
            </button>
            <button onClick={() => deleteNote(active.id)} className="btn-danger">
              <Trash2 className="w-3.5 h-3.5" /> ลบ
            </button>
          </div>
        </div>

        <article className="card">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${categoryColors[active.category] || 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
                  {active.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-slate-400">{active.subject}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{active.title}</h1>
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500">
              {new Date(active.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}
            </div>
          </div>
          <div className="prose prose-gray max-w-none">
            <div className="whitespace-pre-wrap leading-relaxed text-gray-700 dark:text-slate-200 text-[15px]">
              {active.content}
            </div>
          </div>
        </article>
      </div>
    )
  }

  if (mode === 'edit' || mode === 'new') {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={back} className="btn-secondary text-sm">
            ← ยกเลิก
          </button>
          <button onClick={saveNote} className="btn-primary">
            <Save className="w-4 h-4" /> บันทึกโน้ต
          </button>
        </div>

        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <label className="label">หมวด</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="input text-sm">
                <option>ภาค ก</option>
                <option>ภาค ข</option>
                <option>ภาค ค</option>
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="label">วิชา/หัวข้อใหญ่</label>
              <input
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                className="input text-sm"
                placeholder="เช่น จิตวิทยาการศึกษา"
              />
            </div>
            <div className="md:col-span-5">
              <label className="label">ชื่อโน้ต *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="input text-sm"
                placeholder="ตั้งชื่อให้ดูแล้วเข้าใจทันที"
              />
            </div>
          </div>
          <div>
            <label className="label">เนื้อหาโน้ต * (ขึ้นบรรทัดใหม่กด Enter)</label>
            <textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              rows="18"
              className="input text-sm font-mono resize-y"
              placeholder="เขียนโน้ตสรุปที่นี่... สามารถใช้ข้อความธรรมดา หรือ Markdown ธรรมดา"
            />
          </div>
        </div>
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-5">
      <PageHeader
        title="โน้ตสรุปส่วนตัว"
        description="จดสรุปเนื้อหาที่สำคัญไว้ตรงนี้ — เข้าได้ทุกที่ บันทึกไว้ในเครื่องชั่วคราว"
        actions={(
          <button onClick={startNew} className="btn-primary">
            <Plus className="w-4 h-4" /> สร้างโน้ตใหม่
          </button>
        )}
      />

      <div className="flex flex-col gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาโน้ตจากหัวข้อหรือเนื้อหา..."
            className="input pl-9 text-sm"
          />
        </div>
        <FilterChips
          ariaLabel="กรองโน้ตตามหมวด"
          options={categories.map(c => ({ id: c, label: c }))}
          value={filterCat}
          onChange={setFilterCat}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={notes.length === 0 ? 'ยังไม่มีโน้ต' : 'ไม่พบโน้ตที่ตรงเงื่อนไข'}
          description={
            notes.length === 0
              ? 'เริ่มจดสรุปเนื้อหาสำคัญไว้ที่นี่ เพื่อกลับมาทบทวนได้เร็ว'
              : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองหมวด แล้วค้นหาอีกครั้ง'
          }
          action={(
            <button onClick={startNew} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> สร้างโน้ตใหม่
            </button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => { setActiveId(n.id); setMode('view') }}
              className="card text-left p-5 hover:border-primary-300 hover:shadow group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`badge ${categoryColors[n.category] || 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300'}`}>
                    {n.category}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteNote(n.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-slate-500 hover:text-red-500 transition p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-1 line-clamp-2">{n.title}</h3>
              <div className="text-xs text-gray-500 dark:text-slate-400 mb-2">{n.subject}</div>
              <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-4 leading-relaxed whitespace-pre-wrap">
                {n.content}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                <span>{new Date(n.createdAt).toLocaleDateString('th-TH')}</span>
                <span className="text-primary-600 font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  เปิดอ่าน →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

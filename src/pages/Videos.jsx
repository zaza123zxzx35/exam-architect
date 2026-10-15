import { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Radio,
  Video as VideoIcon,
  PlayCircle
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { initialVideos } from '../data/videoData'
import { safeResourceUrl } from '../lib/planner/safeLink.js'
import { PageHeader, EmptyState, FilterChips } from '../components/ui'

const getEmbedUrl = (url) => {
  const safe = safeResourceUrl(url)
  if (!safe) return ''
  const ytMatch = safe.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?#]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  return safe
}

const isFacebookGroup = (url) => {
  if (!url) return false
  return /facebook\.com|fb\.com/i.test(url) || /groups/i.test(url)
}

const formatSchedule = (value) => {
  if (!value) return ''
  const raw = String(value).trim()
  const d = new Date(raw)
  // Seed schedules are often human-readable Thai ranges, not ISO timestamps.
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
}

export default function Videos() {
  const [videos, setVideos] = useLocalStorage('study_videos', initialVideos)
  const [activeId, setActiveId] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [filter, setFilter] = useState('ทั้งหมด')
  const [newV, setNewV] = useState({
    category: '🎥 คอร์สติว - ภาค ก',
    title: '',
    description: '',
    url: '',
    schedule: '',
    isLive: false,
    note: ''
  })

  useEffect(() => {
    setVideos(previous => {
      let changed = false
      const next = previous.map(video => {
        const legacySeed = ['anon-vip', 'lady-vip-group'].includes(video.id) && /VIP รับรองผล|คอร์สหลักวิชาเอกอังกฤษ 100%|P1 รอง! VIP|P1 สูงสุด! \(ตามคำสั่ง/.test(video.note || '')
        if (!legacySeed) return video
        changed = true
        return { ...video, isLive: false, note: 'ตรวจตารางไลฟ์และประกาศล่าสุดจากเจ้าของกลุ่มก่อนรับชม' }
      })
      return changed ? next : previous
    })
  }, [setVideos])

  const categories = ['ทั้งหมด', ...Array.from(new Set(videos.map(v => v.category)))]

  const filtered = filter === 'ทั้งหมด' ? videos : videos.filter(v => v.category === filter)
  const filteredIdsKey = filtered.map(v => v.id).join('|')

  // Keep a usable selection so open/embed controls are always available.
  useEffect(() => {
    const ids = filteredIdsKey ? filteredIdsKey.split('|') : []
    if (!ids.length) {
      setActiveId(prev => (prev === null ? prev : null))
      return
    }
    setActiveId(prev => (prev && ids.includes(prev) ? prev : ids[0]))
  }, [filteredIdsKey])

  const active = activeId ? videos.find(v => v.id === activeId) : null
  const safeActiveUrl = active ? safeResourceUrl(active.url) : null
  const embed = getEmbedUrl(active?.url || '')
  const isFb = isFacebookGroup(safeActiveUrl || active?.url || '')

  const toggleWatched = (id) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, isWatched: !v.isWatched } : v))
  }

  const updateNote = (id, value) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, note: value } : v))
  }

  const deleteVideo = (id) => {
    if (!confirm('ลบวีดีโอนี้ออกจากรายการใช่ไหม?')) return
    setVideos(prev => prev.filter(v => v.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const saveNew = () => {
    if (!newV.title.trim() || !newV.url.trim()) return
    const v = {
      id: `v${Date.now()}`,
      category: newV.category,
      title: newV.title.trim(),
      description: newV.description.trim(),
      url: newV.url.trim(),
      thumbnail: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=online%20study%20lecture%20screen&image_size=landscape_16_9',
      schedule: newV.schedule || null,
      isLive: newV.isLive,
      isWatched: false,
      note: newV.note.trim()
    }
    setVideos(prev => [...prev, v])
    setNewV({
      category: '🎥 คอร์สติว - ภาค ก',
      title: '',
      description: '',
      url: '',
      schedule: '',
      isLive: false,
      note: ''
    })
    setAddMode(false)
  }

  const watchCount = videos.filter(v => v.isWatched).length
  const liveCount = videos.filter(v => v.isLive).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="วีดีโอติว + ไลฟ์สด"
        description="วิดีโอที่รองรับจะฝังในหน้าเว็บได้ ส่วนกลุ่ม Facebook ต้องเปิดจากลิงก์และตรวจเวลาไลฟ์กับผู้เผยแพร่"
        actions={(
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="badge inline-flex items-center gap-1 bg-green-50 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> ดูแล้ว {watchCount}/{videos.length}
              </span>
              <span className="badge inline-flex items-center gap-1 bg-red-50 text-red-700">
                <Radio className="h-3.5 w-3.5 animate-pulse" /> ไลฟ์ {liveCount} รายการ
              </span>
            </div>
            <button onClick={() => setAddMode(!addMode)} className="btn-primary">
              <Plus className="w-4 h-4" /> {addMode ? 'ยกเลิก' : 'เพิ่มลิ้งค์วีดีโอ'}
            </button>
          </div>
        )}
      />

      {addMode && (
        <div className="card border-2 border-primary-200 bg-primary-50/50 space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100">เพิ่มลิ้งค์วีดีโอ / ไลฟ์สด</h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4">
              <label className="label">หมวดหมู่</label>
              <select value={newV.category} onChange={e => setNewV(p => ({ ...p, category: e.target.value }))} className="input text-sm">
                <option>📘 Facebook คอร์ส - วิชาเอกอังกฤษ</option>
                <option>📘 Facebook คอร์ส - ทั่วไป 1</option>
                <option>📘 Facebook คอร์ส - ทั่วไป 2</option>
                <option>🎥 คอร์สติว - ภาค ก</option>
                <option>🎥 คอร์สติว - ภาค ข</option>
                <option>🎥 คอร์สติว - วิชาเอกอังกฤษ</option>
                <option>🎥 ไลฟ์สด - สัมภาษณ์ภาค ค</option>
                <option>🎥 ไลฟ์สด - เด็ดข้อสอบปีเก่า</option>
                <option>Youtube อื่นๆ</option>
              </select>
            </div>
            <div className="md:col-span-8">
              <label className="label">หัวข้อวีดีโอ *</label>
              <input
                value={newV.title}
                onChange={e => setNewV(p => ({ ...p, title: e.target.value }))}
                className="input text-sm"
                placeholder="เช่น ติว Grammar Tense 12 ชนิด ครบในคลิปเดียว"
              />
            </div>
            <div className="md:col-span-7">
              <label className="label">ลิ้งค์ YouTube / URL *</label>
              <input
                value={newV.url}
                onChange={e => setNewV(p => ({ ...p, url: e.target.value }))}
                className="input text-sm"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <div className="md:col-span-3">
              <label className="label">ตารางเวลา (ถ้ามี)</label>
              <input
                type="datetime-local"
                value={newV.schedule}
                onChange={e => setNewV(p => ({ ...p, schedule: e.target.value }))}
                className="input text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={newV.isLive}
                  onChange={e => setNewV(p => ({ ...p, isLive: e.target.checked }))}
                  className="w-4 h-4"
                />
                เป็นไลฟ์สด
              </label>
            </div>
            <div className="md:col-span-12">
              <label className="label">คำอธิบาย / โน้ตส่วนตัว</label>
              <input
                value={newV.description}
                onChange={e => setNewV(p => ({ ...p, description: e.target.value }))}
                className="input text-sm"
                placeholder="อธิบายสั้นๆ หรือจดอะไรไว้ก็ได้"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-primary-100">
            <button onClick={() => setAddMode(false)} className="btn-secondary text-sm">ยกเลิก</button>
            <button onClick={saveNew} className="btn-primary text-sm">
              <Save className="w-4 h-4" /> บันทึกลิงก์
            </button>
          </div>
        </div>
      )}

      <FilterChips
        ariaLabel="กรองวิดีโอตามหมวด"
        options={categories.map(c => ({ id: c, label: c }))}
        value={filter}
        onChange={setFilter}
      />

      {/* Grid: Player + List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player */}
        <div className="lg:col-span-2 space-y-4">
          {active ? (
            <>
              {isFb ? (
                <div className="card p-0 overflow-hidden">
                  <div className="relative aspect-video w-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-8 flex items-center justify-center text-white">
                    <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)'}} />
                    <div className="relative text-center max-w-md space-y-5">
                      <div className="w-20 h-20 mx-auto rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
                        <ExternalLink className="w-10 h-10" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">กลุ่มปิด Facebook</h3>
                        <p className="text-blue-100 text-sm leading-relaxed">
                          คอร์สนี้อยู่ในกลุ่ม Facebook กลุ่มปิด
                          <br />
                          ไม่สามารถฝังเล่นภายในเว็บได้ — กดปุ่มด้านล่างเพื่อเข้าไปดูในแท็บใหม่
                        </p>
                      </div>
                      {safeActiveUrl && (
                      <a
                        href={safeActiveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                      >
                        <ExternalLink className="w-5 h-5" />
                        เข้าสู่กลุ่ม Facebook
                      </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-0 overflow-hidden">
                  <div className="relative aspect-video w-full bg-black">
                    {embed ? (
                      <iframe
                        src={embed}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={active.title}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 dark:text-slate-500">
                        {safeActiveUrl ? (
                        <a href={safeActiveUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                          <ExternalLink className="w-4 h-4" /> เปิดในแท็บใหม่
                        </a>
                        ) : (
                          <span className="text-sm">ลิงก์ไม่พร้อมแสดง</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="badge bg-primary-50 text-primary-700">{active.category}</span>
                      {active.isLive && (
                        <span className="badge bg-red-100 text-red-700 inline-flex items-center gap-1">
                          <Radio className="w-3.5 h-3.5 animate-pulse" /> ไลฟ์สด
                        </span>
                      )}
                      {active.schedule && (
                        <span className="badge bg-amber-50 text-amber-700 inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatSchedule(active.schedule)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{active.title}</h2>
                    {active.description && (
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{active.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleWatched(active.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                        active.isWatched
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {active.isWatched ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {active.isWatched ? 'ดูแล้ว' : 'มาร์กดูแล้ว'}
                    </button>
                    {safeActiveUrl && (
                    <a
                      href={safeActiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> เปิดคลิปติว
                    </a>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                  <label className="label">📝 โน้ตระหว่างดู / สิ่งที่ต้องจดจำ</label>
                  <textarea
                    value={active.note || ''}
                    onChange={e => updateNote(active.id, e.target.value)}
                    rows="4"
                    className="input text-sm resize-y"
                    placeholder="จดอะไรที่อาจารย์บอก หรือข้อสำคัญๆ ลงได้ที่นี่ — บันทึกอัตโนมัติ"
                  />
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              className="flex min-h-[400px] flex-col justify-center"
              icon={VideoIcon}
              title="เลือกวีดีโอจากรายการทางขวา"
              description="วีดีโอจะเล่นตรงนี้เลย ไม่ต้องกระโดดออกไป YouTube สามารถจดโน้ตระหว่างดู หรือกด «ดูแล้ว» เพื่อติดตามความคืบหน้าได้"
              action={(
                <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  เหลืออีก {videos.length - watchCount} วีดีโอที่ยังไม่ได้ดู
                </span>
              )}
            />
          )}
        </div>

        {/* Video List */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800">
            <div className="font-semibold text-gray-800 dark:text-slate-100">รายการวีดีโอ</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">{filtered.length} รายการ</div>
          </div>
          <ul className="max-h-[720px] divide-y divide-gray-100 overflow-y-auto dark:divide-slate-800">
            {filtered.length === 0 ? (
              <li className="p-4">
                <EmptyState
                  icon={VideoIcon}
                  title="ไม่มีวีดีโอในหมวดนี้"
                  description="ลองเลือกหมวดอื่น หรือเพิ่มลิงก์วิดีโอใหม่"
                />
              </li>
            ) : (
              filtered.map(v => {
                const isFbItem = isFacebookGroup(v.url)
                return (
                <li key={v.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveId(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setActiveId(v.id)
                      }
                    }}
                    className={`w-full cursor-pointer text-left p-3 flex items-start gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                      activeId === v.id ? 'bg-primary-50' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-28 h-16 rounded-lg bg-gray-100 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative">
                      <img
                        src={v.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      <div className={`absolute inset-0 flex items-center justify-center ${isFbItem ? 'bg-gradient-to-br from-blue-500/85 to-indigo-600/85 text-white' : 'bg-black/20 text-white'}`}>
                        {isFbItem ? <ExternalLink className="w-8 h-8" /> : <PlayCircle className="w-8 h-8 text-white" />}
                      </div>
                      {v.isWatched && (
                        <div className="absolute top-1 left-1">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <div className={`text-sm font-medium line-clamp-2 ${activeId === v.id ? 'text-primary-700' : 'text-gray-800 dark:text-slate-100'}`}>
                          {v.title}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteVideo(v.id) }}
                          aria-label={`ลบวิดีโอ ${v.title}`}
                          className="text-gray-300 dark:text-slate-600 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {isFbItem && (
                          <span className="badge bg-blue-100 text-blue-700 text-[10px] inline-flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> FB Group
                          </span>
                        )}
                        {v.isLive && (
                          <span className="badge bg-red-100 text-red-600 text-[10px] inline-flex items-center gap-0.5">
                            <Radio className="w-2.5 h-2.5" /> LIVE
                          </span>
                        )}
                        {v.schedule && (
                          <span className="badge bg-amber-50 text-amber-600 text-[10px]">
                            {formatSchedule(v.schedule)}
                          </span>
                        )}
                        {!v.isLive && !v.schedule && !isFbItem && (
                          <span className="text-[10px] text-gray-400 dark:text-slate-500">{v.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              )})
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

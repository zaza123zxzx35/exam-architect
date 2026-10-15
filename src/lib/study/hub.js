/**
 * Study Resource Hub — classify-on-read aggregation (Phase 3).
 * Filters by content taxonomy only. Never uses scheduleExamId as a content filter.
 */

import {
  classifyNote,
  classifyPlanItem,
  classifyQuiz,
  classifyVideo,
  EXAM_PARTS,
  SUBJECT_IDS,
} from './taxonomy.js'

/** @typedef {'all' | 'quiz' | 'note' | 'video' | 'plan' | 'link'} HubKind */
/** @typedef {'all' | import('./taxonomy.js').ExamPart} HubExamPartFilter */

export const HUB_KINDS = Object.freeze(['all', 'quiz', 'note', 'video', 'plan', 'link'])

export const HUB_EXAM_PART_FILTERS = Object.freeze(['all', ...EXAM_PARTS])

export const HUB_KIND_LABELS = Object.freeze({
  all: 'ทั้งหมด',
  quiz: 'แบบทดสอบ',
  note: 'โน้ต',
  video: 'วิดีโอ',
  plan: 'แผนอ่าน',
  link: 'ลิงก์',
})

export const HUB_EXAM_PART_LABELS = Object.freeze({
  all: 'ทุกภาค',
  ก: 'ภาค ก',
  ข: 'ภาค ข',
  ค: 'ภาค ค',
  admin: 'สมัคร/เอกสาร',
  mixed: 'ผสมหลายภาค',
  unknown: 'ยังไม่ชัด',
})

export const HUB_SUBJECT_LABELS = Object.freeze({
  [SUBJECT_IDS.GENERAL_REASONING]: 'คิดวิเคราะห์',
  [SUBJECT_IDS.ENGLISH_SKILLS_A]: 'อังกฤษ ภาค ก',
  [SUBJECT_IDS.GENERAL_KNOWLEDGE_A]: 'ความรู้ทั่วไป',
  [SUBJECT_IDS.EDUCATION]: 'วิชาการศึกษา',
  [SUBJECT_IDS.ENGLISH_MAJOR]: 'วิชาเอกอังกฤษ',
  [SUBJECT_IDS.INTERVIEW_C]: 'สัมภาษณ์',
  [SUBJECT_IDS.LAW]: 'กฎหมาย',
  [SUBJECT_IDS.MATH]: 'คณิต',
  [SUBJECT_IDS.ADMIN]: 'สมัคร/เอกสาร',
  [SUBJECT_IDS.UNKNOWN]: 'ยังไม่จัดวิชา',
  'civil-servant-a': 'ข้าราชการที่ดี (ภาค ก)',
})

/**
 * @typedef {object} StudyHubItem
 * @property {string} id
 * @property {Exclude<HubKind, 'all'>} kind
 * @property {string} title
 * @property {string} subtitle
 * @property {string | null} href Internal app path or null when external-only
 * @property {string | null} url External URL when present
 * @property {import('./taxonomy.js').TaxonomyClassification} taxonomy
 */

/**
 * Build a unified, read-only catalog. Classification is derived at call time.
 * @param {{
 *   quizzes?: unknown[],
 *   notes?: unknown[],
 *   videos?: unknown[],
 *   planItems?: unknown[],
 *   links?: Array<{ id?: string, title?: string, name?: string, url?: string, source?: string }>,
 * }} sources
 * @returns {StudyHubItem[]}
 */
export function buildStudyHubCatalog(sources = {}) {
  const items = []

  for (const quiz of sources.quizzes || []) {
    if (!quiz || typeof quiz !== 'object') continue
    const taxonomy = classifyQuiz(quiz)
    items.push({
      id: `quiz:${quiz.id ?? items.length}`,
      kind: 'quiz',
      title: String(quiz.title || 'แบบทดสอบไม่มีชื่อ'),
      subtitle: String(quiz.category || quiz.description || ''),
      href: '/quiz',
      url: null,
      taxonomy,
    })
  }

  for (const note of sources.notes || []) {
    if (!note || typeof note !== 'object') continue
    const taxonomy = classifyNote(note)
    items.push({
      id: `note:${note.id ?? items.length}`,
      kind: 'note',
      title: String(note.title || 'โน้ตไม่มีชื่อ'),
      subtitle: [note.category, note.subject].filter(Boolean).join(' · '),
      href: '/notes',
      url: null,
      taxonomy,
    })
  }

  for (const video of sources.videos || []) {
    if (!video || typeof video !== 'object') continue
    const taxonomy = classifyVideo(video)
    items.push({
      id: `video:${video.id ?? items.length}`,
      kind: 'video',
      title: String(video.title || 'วิดีโอไม่มีชื่อ'),
      subtitle: String(video.category || video.description || ''),
      href: '/videos',
      url: typeof video.url === 'string' ? video.url : null,
      taxonomy,
    })
  }

  for (const plan of sources.planItems || []) {
    if (!plan || typeof plan !== 'object') continue
    const taxonomy = classifyPlanItem(plan)
    items.push({
      id: `plan:${plan.id ?? items.length}`,
      kind: 'plan',
      title: String(plan.title || 'แผนไม่มีชื่อ'),
      subtitle: String(plan.subtitle || ''),
      href: '/plan',
      url: null,
      taxonomy,
    })
  }

  for (const link of sources.links || []) {
    if (!link || typeof link !== 'object') continue
    const title = String(link.title || link.name || '').trim()
    const url = typeof link.url === 'string' ? link.url : ''
    if (!title && !url) continue
    // Links lack a dedicated classifier — treat title/url as plan-like text for part signals only.
    const taxonomy = classifyPlanItem({ id: link.id, title: title || url, subtitle: link.source || '' })
    items.push({
      id: `link:${link.id ?? (url || items.length)}`,
      kind: 'link',
      title: title || url,
      subtitle: String(link.source || 'ลิงก์'),
      href: '/resources',
      url: url || null,
      taxonomy,
    })
  }

  return items
}

/**
 * Filter hub items by content taxonomy + kind + text.
 * Intentionally ignores taxonomy.scheduleExamId — that field is schedule metadata only.
 *
 * @param {StudyHubItem[]} items
 * @param {{
 *   examPart?: HubExamPartFilter,
 *   subjectId?: string | 'all',
 *   kind?: HubKind,
 *   query?: string,
 * }} [filters]
 * @returns {StudyHubItem[]}
 */
export function filterStudyHubItems(items, filters = {}) {
  const examPart = filters.examPart || 'all'
  const subjectId = filters.subjectId || 'all'
  const kind = filters.kind || 'all'
  const query = String(filters.query || '').trim().toLowerCase()

  return (items || []).filter(item => {
    if (!item || !item.taxonomy) return false
    if (kind !== 'all' && item.kind !== kind) return false
    if (examPart !== 'all' && item.taxonomy.examPart !== examPart) return false
    if (subjectId !== 'all' && item.taxonomy.subjectId !== subjectId) return false
    if (query) {
      const hay = `${item.title} ${item.subtitle} ${item.taxonomy.subjectId} ${item.taxonomy.examPart}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

/**
 * Count items per examPart for chip badges.
 * @param {StudyHubItem[]} items
 * @returns {Record<string, number>}
 */
export function countByExamPart(items) {
  const counts = Object.fromEntries(HUB_EXAM_PART_FILTERS.map(p => [p, 0]))
  counts.all = items.length
  for (const item of items) {
    const part = item?.taxonomy?.examPart
    if (part && part in counts) counts[part] += 1
  }
  return counts
}

/**
 * Human-readable hub filter status (Thai). Reflects the current selection — never a stale "default" label.
 * @param {{
 *   catalogCount: number,
 *   filteredCount: number,
 *   examPart?: HubExamPartFilter,
 *   subjectId?: string,
 *   kind?: HubKind,
 *   query?: string,
 * }} state
 * @returns {string}
 */
export function describeHubFilterStatus(state) {
  const catalogCount = Number(state?.catalogCount) || 0
  const filteredCount = Number(state?.filteredCount) || 0
  const examPart = state?.examPart || 'all'
  const subjectId = state?.subjectId || 'all'
  const kind = state?.kind || 'all'
  const query = String(state?.query || '').trim()

  const labels = [
    HUB_EXAM_PART_LABELS[examPart] || String(examPart),
    HUB_KIND_LABELS[kind] || String(kind),
    subjectId === 'all' ? 'ทุกวิชา' : (HUB_SUBJECT_LABELS[subjectId] || String(subjectId)),
  ]
  if (query) labels.push(`ค้นหา “${query}”`)

  const isDefault = examPart === 'all' && subjectId === 'all' && kind === 'all' && !query
  if (isDefault) {
    return `${catalogCount} รายการในคลัง · แสดง ${filteredCount} รายการ (ตัวกรองเริ่มต้น: ${labels.join(' · ')})`
  }
  return `${catalogCount} รายการในคลัง · แสดง ${filteredCount} รายการตามตัวกรอง (${labels.join(' · ')})`
}

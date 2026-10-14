import { courses, importantLinks, htmlPlannerLinkInventory } from '../../data/htmlPlannerData.js'

/**
 * Known study subjects for Smart Planner.
 * Resource URLs are resolved only from existing planner inventory — never invented.
 */
export const PLANNER_SUBJECTS = [
  {
    id: 'english',
    label: 'ภาษาอังกฤษ / วิชาเอก',
    keywords: ['อังกฤษ', 'english', 'วิชาเอก', 'grammar', 'reading', 'vocab', 'conversation'],
    resourceMatchers: [/อังกฤษ/i, /english/i, /grammar/i, /reading/i, /วิชาเอก/i],
  },
  {
    id: 'law',
    label: 'กฎหมาย',
    keywords: ['กฎหมาย', 'law', 'พรบ', 'พ.ร.บ', 'ระเบียบ', 'รัฐธรรมนูญ'],
    resourceMatchers: [/กฎหมาย/i, /พ\.?ร\.?บ/i, /ระเบียบ/i],
  },
  {
    id: 'math',
    label: 'คณิตศาสตร์',
    keywords: ['คณิต', 'math', 'ร้อยละ', 'ตรรกะ'],
    resourceMatchers: [/คณิต/i, /math/i],
  },
  {
    id: 'education',
    label: 'วิชาการศึกษา',
    keywords: ['การศึกษา', 'education', 'จิตวิทยา', 'หลักสูตร', 'การสอน'],
    resourceMatchers: [/การศึกษา/i, /จิตวิทยา/i, /หลักสูตร/i],
  },
  {
    id: 'general',
    label: 'ภาค ก ทั่วไป / คิดวิเคราะห์',
    keywords: ['ภาค ก', 'ภาคก', 'คิดวิเคราะห์', 'ความรู้ทั่วไป', 'หมาหอน', 'mock'],
    resourceMatchers: [/ภาค\s*ก/i, /หมาหอน/i, /คิดวิเคราะห์/i],
  },
  {
    id: 'admin',
    label: 'สมัครสอบ / เอกสาร',
    keywords: ['สมัคร', 'เอกสาร', 'ประกาศ', 'เขต', 'hrms'],
    resourceMatchers: [/สมัคร/i, /hrms/i, /ประกาศ/i, /เขต/i],
  },
]

export function listSubjectOptions() {
  return PLANNER_SUBJECTS.map(s => ({ id: s.id, label: s.label }))
}

function catalogEntries() {
  const fromImportant = importantLinks.map((link, index) => ({
    id: `important_${index}`,
    title: link.name,
    url: link.url,
    source: 'importantLinks',
  }))
  const fromInventory = htmlPlannerLinkInventory.map((row, index) => ({
    id: `inventory_${index}`,
    title: row.title,
    url: row.url,
    source: row.source,
  }))
  // Deduplicate by URL; prefer importantLinks titles.
  const byUrl = new Map()
  for (const entry of [...fromImportant, ...fromInventory]) {
    const key = String(entry.url || '').trim()
    if (!key || byUrl.has(key)) continue
    byUrl.set(key, entry)
  }
  return [...byUrl.values()]
}

export function listResourceCatalog() {
  return catalogEntries()
}

/**
 * Resolve resource references for selected subjects.
 * Only returns URLs that already exist in the planner inventory.
 */
export function resolveResourcesForSubjects(subjectIds = []) {
  const subjects = PLANNER_SUBJECTS.filter(s => subjectIds.includes(s.id))
  if (!subjects.length) return { matched: [], missing: subjectIds.slice() }

  const catalog = catalogEntries()
  const matched = []
  const seen = new Set()

  for (const subject of subjects) {
    let hit = false
    for (const entry of catalog) {
      const hay = `${entry.title} ${entry.url}`
      if (!subject.resourceMatchers.some(re => re.test(hay))) continue
      if (seen.has(entry.url)) continue
      seen.add(entry.url)
      matched.push({ ...entry, subjectId: subject.id })
      hit = true
    }
    // Course descriptions are not URLs — surface as topic hints only when no URL match.
    if (!hit) {
      const courseHit = courses.find(c => subject.resourceMatchers.some(re => re.test(`${c.name} ${c.desc}`)))
      if (courseHit) {
        matched.push({
          id: `course_hint_${subject.id}`,
          title: courseHit.name,
          url: undefined,
          source: 'courses',
          subjectId: subject.id,
          incomplete: true,
        })
      }
    }
  }

  const missing = subjects
    .filter(s => !matched.some(m => m.subjectId === s.id && m.url))
    .map(s => s.id)

  return { matched, missing }
}

export function subjectIdsFromText(text = '') {
  const lower = String(text).toLowerCase()
  const hits = []
  for (const subject of PLANNER_SUBJECTS) {
    if (subject.keywords.some(k => lower.includes(String(k).toLowerCase()))) {
      hits.push(subject.id)
    }
  }
  return hits
}

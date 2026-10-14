/**
 * Deterministic Smart Tutor resource lookup (Phase 4).
 * Uses Study Hub + taxonomy classify-on-read. No LLM. Never invents URLs.
 */

import { initialQuizzes } from '../../data/quizData.js'
import { initialNotes } from '../../data/notesData.js'
import { initialVideos } from '../../data/videoData.js'
import { initialStudyPlan } from '../../data/planData.js'
import { importantLinks } from '../../data/htmlPlannerData.js'
import {
  buildStudyHubCatalog,
  filterStudyHubItems,
  HUB_EXAM_PART_LABELS,
  HUB_KIND_LABELS,
  HUB_SUBJECT_LABELS,
} from '../study/hub.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

/**
 * Map free text → hub filters. Prefer explicit part/subject markers.
 * Bare "อังกฤษ" alone → subject unknown (do not collapse skills vs major).
 *
 * @param {string} text
 * @returns {{ examPart: string, subjectId: string, kind: string, query: string, ambiguity?: string }}
 */
export function interpretTutorResourceQuery(text = '') {
  const raw = String(text || '').trim()
  const lower = raw.toLowerCase()

  let examPart = 'all'
  let subjectId = 'all'
  let kind = 'all'
  let ambiguity

  const wantsSkillsA =
    /ภาค\s*ก\s*ภาษาอังกฤษ|ภาษาอังกฤษ\s*ภาค\s*ก|english skills|skills\s*a/i.test(raw)
  const wantsMajor =
    /วิชาเอก|english major|major english|ภาค\s*ข\s*.*อังกฤษ/i.test(raw)
  const wantsBoth = /ภาค\s*ก\s*\+\s*วิชาเอก|วิชาเอก\s*\+\s*ภาค\s*ก|ทั้งภาค\s*กและวิชาเอก/i.test(raw)

  if (wantsBoth || (wantsSkillsA && wantsMajor)) {
    examPart = 'mixed'
    subjectId = 'all'
  } else if (wantsSkillsA) {
    examPart = 'ก'
    subjectId = SUBJECT_IDS.ENGLISH_SKILLS_A
  } else if (wantsMajor) {
    examPart = 'ข'
    subjectId = SUBJECT_IDS.ENGLISH_MAJOR
  } else if (/อังกฤษ|english/i.test(raw)) {
    // Ambiguous English — keep subject open; do not pick skills or major
    subjectId = 'all'
    ambiguity = 'english-unspecified'
  }

  if (examPart === 'all') {
    if (/ภาค\s*ค|สัมภาษณ์|interview/i.test(raw)) examPart = 'ค'
    else if (/ภาค\s*ข|การศึกษา|education|จิตวิทยา/i.test(raw) && !wantsMajor) {
      examPart = 'ข'
      if (/การศึกษา|education|จิตวิทยา/i.test(raw)) subjectId = SUBJECT_IDS.EDUCATION
    } else if (/ภาค\s*ก|คิดวิเคราะห์|ความรู้ทั่วไป|reasoning/i.test(raw) && !wantsSkillsA) {
      examPart = 'ก'
      if (/คิดวิเคราะห์|reasoning|ตรรกะ/i.test(raw)) subjectId = SUBJECT_IDS.GENERAL_REASONING
      else if (/ความรู้ทั่วไป|ข้าราชการ/i.test(raw)) subjectId = SUBJECT_IDS.GENERAL_KNOWLEDGE_A
    } else if (/สมัคร|hrms|ประกาศ|เอกสาร|เขต/i.test(raw)) {
      examPart = 'admin'
      subjectId = SUBJECT_IDS.ADMIN
    }
  }

  if (/กฎหมาย|law/i.test(raw)) subjectId = SUBJECT_IDS.LAW
  if (/คณิต|math/i.test(raw)) subjectId = SUBJECT_IDS.MATH

  // Intent wrappers like "หาลิงก์" / "find resources" are not kind filters.
  if (/แบบทดสอบ|quiz|ข้อสอบ/i.test(raw)) kind = 'quiz'
  else if (/เปิดโน้ต|ดูโน้ต|โน้ตสรุป/i.test(raw)) kind = 'note'
  else if (/วิดีโอ|videos?\b|ไลฟ์|youtube/i.test(raw)) kind = 'video'
  else if (/แผนอ่าน|study plan|แผนการอ่าน/i.test(raw)) kind = 'plan'
  else if (/(เฉพาะลิงก์|external links?|url เท่านั้น)/i.test(raw)) kind = 'link'

  // Drop intent words from free-text query to avoid over-filtering titles
  const query = raw
    .replace(/หาลิงก์|find resources?|resources?|ลิงก์|สำหรับ|for|ขอ|อยากได้/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // When subject/part already chosen, avoid double-filtering with leftover keywords
  const useQuery = ambiguity === 'english-unspecified' ? '' : ''

  return {
    examPart,
    subjectId,
    kind,
    query: useQuery,
    ambiguity,
    rawQuery: query,
    languageHint: /[a-z]/i.test(lower) && !/[ก-๙]/.test(raw) ? 'en' : 'th',
  }
}

function defaultCatalog() {
  return buildStudyHubCatalog({
    quizzes: initialQuizzes,
    notes: initialNotes,
    videos: initialVideos,
    planItems: initialStudyPlan,
    links: importantLinks.map((link, index) => ({
      id: `important_${index}`,
      title: link.name,
      url: link.url,
      source: 'importantLinks',
    })),
  })
}

/**
 * @param {string} text
 * @param {{ catalog?: import('../study/hub.js').StudyHubItem[], limit?: number }} [options]
 */
export function findTutorResources(text, options = {}) {
  const interpreted = interpretTutorResourceQuery(text)
  const catalog = options.catalog || defaultCatalog()
  const limit = options.limit ?? 8

  let hits = filterStudyHubItems(catalog, {
    examPart: interpreted.examPart,
    subjectId: interpreted.subjectId,
    kind: interpreted.kind,
    query: interpreted.query,
  })

  const rank = item => (item.url ? 2 : 0) + (item.kind === 'video' || item.kind === 'quiz' ? 1 : 0)

  // Ambiguous "อังกฤษ": interleave skills-a and major without merging ids
  if (interpreted.ambiguity === 'english-unspecified') {
    const skills = filterStudyHubItems(catalog, {
      subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
      kind: interpreted.kind,
    }).sort((a, b) => rank(b) - rank(a))
    const major = filterStudyHubItems(catalog, {
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      kind: interpreted.kind,
    }).sort((a, b) => rank(b) - rank(a))
    const seen = new Set()
    hits = []
    const max = Math.max(skills.length, major.length)
    for (let i = 0; i < max && hits.length < limit; i += 1) {
      for (const item of [skills[i], major[i]]) {
        if (!item || seen.has(item.id) || hits.length >= limit) continue
        seen.add(item.id)
        hits.push(item)
      }
    }
  } else {
    hits = [...hits].sort((a, b) => rank(b) - rank(a)).slice(0, limit)
  }

  return { interpreted, hits }
}

/**
 * @param {ReturnType<typeof findTutorResources>} result
 * @param {'th' | 'en'} lang
 * @returns {string[]}
 */
export function formatTutorResourceMessages(result, lang = 'th') {
  const { interpreted, hits } = result
  if (!hits.length) {
    return [
      lang === 'en'
        ? 'No matching resources in the existing catalog (I will not invent URLs). Try /resources or name ภาค ก / วิชาเอก explicitly.'
        : 'ไม่พบทรัพยากรในคลังที่มีอยู่สำหรับคำขอนี้ (จะไม่สร้าง URL ใหม่) ลองเปิด /resources หรือระบุชัดว่า ภาค ก ภาษาอังกฤษ หรือ วิชาเอก',
    ]
  }

  const filterLabel = lang === 'en'
    ? `Filters: part=${interpreted.examPart}, subject=${interpreted.subjectId}, kind=${interpreted.kind}`
    : `ตัวกรอง: ${HUB_EXAM_PART_LABELS[interpreted.examPart] || interpreted.examPart}`
      + ` · ${HUB_SUBJECT_LABELS[interpreted.subjectId] || interpreted.subjectId}`
      + ` · ${HUB_KIND_LABELS[interpreted.kind] || interpreted.kind}`

  const ambiguityNote = interpreted.ambiguity === 'english-unspecified'
    ? (lang === 'en'
      ? 'Note: “English” alone is ambiguous — showing both english-skills-a and english-major separately.'
      : 'หมายเหตุ: คำว่า «อังกฤษ» อย่างเดียวยังไม่แยกภาค — แสดงทั้ง อังกฤษ ภาค ก และ วิชาเอกแยกกัน')
    : null

  const lines = hits.map(h => {
    const part = HUB_EXAM_PART_LABELS[h.taxonomy.examPart] || h.taxonomy.examPart
    const subject = HUB_SUBJECT_LABELS[h.taxonomy.subjectId] || h.taxonomy.subjectId
    const kind = HUB_KIND_LABELS[h.kind] || h.kind
    const where = h.url ? h.url : (h.href || '/resources')
    return `- [${kind}] ${h.title} · ${part}/${subject} → ${where}`
  })

  const header = lang === 'en' ? 'Resources found:' : 'ทรัพยากรที่พบ:'
  const messages = [`${header}\n${filterLabel}\n${lines.join('\n')}`]
  if (ambiguityNote) messages.push(ambiguityNote)
  messages.push(lang === 'en' ? 'Open /resources for full filters.' : 'เปิด /resources เพื่อใช้ตัวกรองเต็มชุด')
  return messages
}

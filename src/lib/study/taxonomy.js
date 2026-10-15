/**
 * Read-only exam study taxonomy (Phase 2B).
 * Pure classifiers: derive examPart + subjectId from caller-supplied values.
 * Never reads/writes storage, never mutates inputs, never invents exam facts.
 */

export const TAXONOMY_VERSION = '2b.2'

/** @typedef {'ก' | 'ข' | 'ค' | 'admin' | 'mixed' | 'unknown'} ExamPart */
/** @typedef {'explicit' | 'heuristic' | 'mixed' | 'unknown'} TaxonomyConfidence */

export const EXAM_PARTS = Object.freeze(['ก', 'ข', 'ค', 'admin', 'mixed', 'unknown'])

export const SUBJECT_IDS = Object.freeze({
  GENERAL_REASONING: 'general-reasoning',
  ENGLISH_SKILLS_A: 'english-skills-a',
  GENERAL_KNOWLEDGE_A: 'general-knowledge-a',
  EDUCATION: 'education',
  ENGLISH_MAJOR: 'english-major',
  INTERVIEW_C: 'interview-c',
  LAW: 'law',
  MATH: 'math',
  ADMIN: 'admin',
  UNKNOWN: 'unknown',
})

/**
 * @typedef {object} TaxonomyClassification
 * @property {string} taxonomyVersion
 * @property {ExamPart} examPart
 * @property {string} subjectId
 * @property {TaxonomyConfidence} confidence
 * @property {string[]} evidence
 * @property {string | number | null} sourceId
 * @property {string | null} scheduleExamId Schedule/exam association only — never used as content examPart.
 */

/** @returns {TaxonomyClassification} */
function result(examPart, subjectId, confidence, evidence, sourceId = null, scheduleExamId = null) {
  return {
    taxonomyVersion: TAXONOMY_VERSION,
    examPart,
    subjectId,
    confidence,
    evidence: Object.freeze([...evidence]),
    sourceId: sourceId == null ? null : sourceId,
    scheduleExamId: scheduleExamId == null || scheduleExamId === '' ? null : String(scheduleExamId),
  }
}

function unknownResult(sourceId = null, evidence = ['insufficient-evidence']) {
  return result('unknown', SUBJECT_IDS.UNKNOWN, 'unknown', evidence, sourceId)
}

function asText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function sourceIdOf(item) {
  if (!item || typeof item !== 'object') return null
  if (item.id == null) return null
  return item.id
}

/** Explicit quiz.category → classification (seed + known create-form labels). */
const QUIZ_CATEGORY_MAP = Object.freeze({
  'ภาค ก - ความสามารถในการคิดวิเคราะห์': {
    examPart: 'ก',
    subjectId: SUBJECT_IDS.GENERAL_REASONING,
  },
  'ภาค ก - ทักษะภาษาอังกฤษ': {
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
  },
  // q-g3 seed category is prefixed "ภาค ก - ความรู้ทั่วไป"; "/ สัมภาษณ์" is a secondary
  // fragment in the same label. Quiz title/content are general-knowledge (สังคม/เศรษฐกิจ/กฎหมาย),
  // not ภาค ค interview practice — map conservatively to general-knowledge-a under ก.
  'ภาค ก - ความรู้ทั่วไป / สัมภาษณ์': {
    examPart: 'ก',
    subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
  },
  'ภาค ก - ความรู้ข้าราชการ': {
    examPart: 'ก',
    subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
  },
  'ภาค ข - วิชาการศึกษา': {
    examPart: 'ข',
    subjectId: SUBJECT_IDS.EDUCATION,
  },
  'ภาค ข - จิตวิทยาการเรียนรู้': {
    examPart: 'ข',
    subjectId: SUBJECT_IDS.EDUCATION,
  },
  'ภาค ข - วิชาเอกภาษาอังกฤษ (Grammar)': {
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
  },
  'ภาค ข - วิชาเอกภาษาอังกฤษ (วิธีการสอน)': {
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
  },
  'ภาค ข - วิชาเอกภาษาอังกฤษ': {
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
  },
  'ภาค ค - สัมภาษณ์': {
    examPart: 'ค',
    subjectId: SUBJECT_IDS.INTERVIEW_C,
  },
})

/**
 * @param {unknown} quiz
 * @returns {TaxonomyClassification}
 */
export function classifyQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return unknownResult(null, ['invalid-input'])
  const id = sourceIdOf(quiz)
  const category = asText(quiz.category)
  if (!category) return unknownResult(id, ['missing-category'])

  const mapped = QUIZ_CATEGORY_MAP[category]
  if (mapped) {
    return result(mapped.examPart, mapped.subjectId, 'explicit', [`quiz.category:${category}`], id)
  }
  return unknownResult(id, [`unmapped-quiz-category:${category}`])
}

/**
 * Notes: require both coarse category (ภาค) and subject when available.
 * @param {unknown} note
 * @returns {TaxonomyClassification}
 */
export function classifyNote(note) {
  if (!note || typeof note !== 'object') return unknownResult(null, ['invalid-input'])
  const id = sourceIdOf(note)
  const category = asText(note.category)
  const subject = asText(note.subject)
  if (!category) return unknownResult(id, ['missing-category'])

  if (category === 'ภาค ก') {
    if (subject === 'ความสามารถในการคิดวิเคราะห์') {
      return result('ก', SUBJECT_IDS.GENERAL_REASONING, 'explicit', ['note.category:ภาค ก', `note.subject:${subject}`], id)
    }
    if (subject === 'ทักษะภาษาอังกฤษ') {
      return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'explicit', ['note.category:ภาค ก', `note.subject:${subject}`], id)
    }
    return result('ก', SUBJECT_IDS.UNKNOWN, 'explicit', ['note.category:ภาค ก', 'note.subject:unmapped'], id)
  }

  if (category === 'ภาค ข') {
    if (subject === 'วิชาการศึกษา' || /จิตวิทยา/.test(subject)) {
      return result('ข', SUBJECT_IDS.EDUCATION, 'explicit', ['note.category:ภาค ข', `note.subject:${subject || 'น/า'}`], id)
    }
    // Require วิชาเอก marker — bare "ภาษาอังกฤษ" under ภาค ข is insufficient (could be misc custom notes)
    if (/วิชาเอก/.test(subject)) {
      return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'explicit', ['note.category:ภาค ข', `note.subject:${subject}`], id)
    }
    return result('ข', SUBJECT_IDS.UNKNOWN, 'explicit', ['note.category:ภาค ข', 'note.subject:unmapped'], id)
  }

  if (category === 'ภาค ค') {
    if (!subject || /สัมภาษณ์|ผลงาน|ประวัติ/.test(subject)) {
      return result('ค', SUBJECT_IDS.INTERVIEW_C, 'explicit', ['note.category:ภาค ค', `note.subject:${subject || 'น/า'}`], id)
    }
    return result('ค', SUBJECT_IDS.UNKNOWN, 'explicit', ['note.category:ภาค ค', 'note.subject:unmapped'], id)
  }

  return unknownResult(id, [`unmapped-note-category:${category}`])
}

function hasMajorEnglishSignal(text) {
  return /วิชาเอก\s*ภาษาอังกฤษ|วิชาเอกอังกฤษ|ภาค\s*ข\s*วิชาเอก|ภาคข\s*วิชาเอก|\[ภาคข|P1\s*ภาคข\s*วิชาเอก/.test(text)
}

function hasSkillsAEnglishSignal(text) {
  // Require ภาค ก (or ภาคก) together with ภาษาอังกฤษ — never bare "อังกฤษ"
  return /ภาค\s*ก\s*ภาษาอังกฤษ|ภาษาอังกฤษ\s*ภาค\s*ก|ภาคก\s*ภาษาอังกฤษ|ภาษาอังกฤษภาค\s*ก|ภาค\s*ก\s*ภาษาอังกฤษ/.test(text)
    || /P1\s*รอง\s*ภาค\s*ก\s*ภาษาอังกฤษ/.test(text)
}

function hasBothEnglishParts(text) {
  const major = hasMajorEnglishSignal(text) || /วิชาเอกภาษาอังกฤษและภาค\s*ก|วิชาเอก.*และภาค\s*ก/.test(text)
  const skills = hasSkillsAEnglishSignal(text) || /และภาค\s*ก/.test(text) && /วิชาเอก/.test(text)
  const mixedPhrase = /ภาค\s*ก\s*\+\s*วิชาเอก|วิชาเอก\s*\+\s*ภาค\s*ก/.test(text)
  return mixedPhrase || (major && skills) || /วิชาเอกภาษาอังกฤษและภาค\s*ก/.test(text)
}

/**
 * @param {unknown} video
 * @returns {TaxonomyClassification}
 */
export function classifyVideo(video) {
  if (!video || typeof video !== 'object') return unknownResult(null, ['invalid-input'])
  const id = sourceIdOf(video)
  const category = asText(video.category)
  const title = asText(video.title)
  const blob = `${category} ${title}`

  if (!category && !title) return unknownResult(id, ['missing-category-and-title'])

  // Multi-part / mixed (title or category evidence)
  if (hasBothEnglishParts(blob) || /ภาค\s*ก\s*\+\s*วิชาเอก/.test(blob)) {
    return result('mixed', SUBJECT_IDS.UNKNOWN, 'mixed', ['multi-part-english-signals', `video.category:${category || 'น/า'}`], id)
  }

  // Explicit ภาค ข / วิชาเอก category band
  if (/ภาคข\s*วิชาเอก|ภาค\s*ข\s*วิชาเอก|P1\s*ภาคข\s*วิชาเอก/.test(category) || hasMajorEnglishSignal(category)) {
    return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'explicit', [`video.category:${category}`], id)
  }

  // Explicit ภาค ก ภาษาอังกฤษ category (skills) — must include ภาษาอังกฤษ in category
  if (/ภาค\s*ก\s*ภาษาอังกฤษ/.test(category)) {
    return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'explicit', [`video.category:${category}`], id)
  }

  // ภาค ก category without subject specificity (e.g. คืนหมาหอน under ภาค ก)
  if (/ภาค\s*ก\s*[—-]/.test(category) || /^[^\n]*ภาค\s*ก\s*—/.test(category)) {
    if (hasSkillsAEnglishSignal(title)) {
      // Part from category is explicit, but subjectId comes from title → heuristic overall
      return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'heuristic', [`video.category:${category}`, 'video.title:ภาค-ก-english'], id)
    }
    return result('ก', SUBJECT_IDS.UNKNOWN, 'explicit', [`video.category:${category}`, 'subject-unspecified'], id)
  }

  // หมาหอน shared category — title supplies part/subject (not the category) → heuristic
  if (/หมาหอน/.test(category)) {
    if (/ภาค\s*ก\s*\+\s*วิชาเอก|วิชาเอก\s*\+\s*ภาค\s*ก/.test(title)) {
      return result('mixed', SUBJECT_IDS.UNKNOWN, 'mixed', ['video.title:ภาค-ก+วิชาเอก'], id)
    }
    if (hasSkillsAEnglishSignal(title)) {
      return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'heuristic', ['video.category:หมาหอน', 'video.title:ภาค-ก-english'], id)
    }
    if (hasMajorEnglishSignal(title)) {
      return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'heuristic', ['video.category:หมาหอน', 'video.title:major'], id)
    }
    return unknownResult(id, ['video.category:หมาหอน', 'title-part-unspecified'])
  }

  // Admin / announcements / pinned links
  if (/ลิ้งค์รวดเร็ว|Announcements|ปักหมุด|ประกาศรายวัน/.test(blob)) {
    return result('admin', SUBJECT_IDS.ADMIN, 'explicit', ['video:admin-or-announcement'], id)
  }

  // Generic VIP group without reliable single part
  if (/กลุ่มติว/.test(category) || /กลุ่มติว/.test(title)) {
    if (hasBothEnglishParts(blob)) {
      return result('mixed', SUBJECT_IDS.UNKNOWN, 'mixed', ['video:group-multi-part'], id)
    }
    return unknownResult(id, ['video:group-insufficient-part-evidence'])
  }

  // Title-only cautious signals
  if (hasSkillsAEnglishSignal(title) && !hasMajorEnglishSignal(title)) {
    return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'heuristic', ['video.title:ภาค-ก-english'], id)
  }
  if (hasMajorEnglishSignal(title) && !hasSkillsAEnglishSignal(title)) {
    return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'heuristic', ['video.title:major'], id)
  }

  return unknownResult(id, ['video-unmapped'])
}

/**
 * Study-plan priority items (planData).
 * @param {unknown} item
 * @returns {TaxonomyClassification}
 */
export function classifyPlanItem(item) {
  if (!item || typeof item !== 'object') return unknownResult(null, ['invalid-input'])
  const id = sourceIdOf(item)
  const title = asText(item.title)
  const subtitle = asText(item.subtitle)
  const details = Array.isArray(item.details) ? item.details.map(asText).join(' ') : ''
  const blob = `${title} ${subtitle} ${details}`

  if (!blob.trim()) return unknownResult(id, ['missing-title'])

  if (/ตรวจประกาศ|สมัคร|ข้อมูลเขต|HRMS/i.test(blob) && !/ภาค\s*[กขค]/.test(title)) {
    return result('admin', SUBJECT_IDS.ADMIN, 'explicit', ['plan:admin-registration'], id)
  }

  // Explicit mixed P1: ภาค ก + วิชาเอก
  if (/ภาค\s*ก/.test(title) && /วิชาเอก/.test(title)) {
    return result('mixed', SUBJECT_IDS.UNKNOWN, 'mixed', ['plan.title:ภาค-ก+วิชาเอก'], id)
  }

  if (/ภาค\s*ค|สัมภาษณ์/.test(title)) {
    return result('ค', SUBJECT_IDS.INTERVIEW_C, 'explicit', ['plan.title:ภาค-ค'], id)
  }

  if (/ภาค\s*ข/.test(title) && /วิชาการศึกษา|การศึกษา/.test(blob)) {
    return result('ข', SUBJECT_IDS.EDUCATION, 'explicit', ['plan.title:ภาค-ข-education'], id)
  }

  if (/ภาค\s*ข/.test(title) && /วิชาเอก/.test(blob)) {
    return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'explicit', ['plan.title:ภาค-ข-major'], id)
  }

  return unknownResult(id, ['plan-unmapped'])
}

const KNOWN_SUBJECT_IDS = new Set(Object.values(SUBJECT_IDS))

/**
 * Classify a planner/schedule task-like object.
 * Prefers explicit content subjectId, then title evidence.
 * `task.examId` is schedule/exam association only (see buildTasksFromHtmlPlan dayIndex rule);
 * it is exposed as scheduleExamId and never used to derive content examPart/subjectId.
 * Law/math get subjectId only with examPart unknown unless part is already explicit.
 *
 * @param {unknown} task
 * @returns {TaxonomyClassification}
 */
export function classifyTask(task) {
  if (!task || typeof task !== 'object') return unknownResult(null, ['invalid-input'])
  const id = sourceIdOf(task)
  const explicitSubject = asText(task.subjectId)
  const title = asText(task.title) || asText(task.text)
  const scheduleExamId = asText(task.examId) || null

  if (explicitSubject && KNOWN_SUBJECT_IDS.has(explicitSubject) && explicitSubject !== SUBJECT_IDS.UNKNOWN) {
    const examPart = subjectIdToExamPart(explicitSubject)
    return result(
      examPart,
      explicitSubject,
      'explicit',
      [`task.subjectId:${explicitSubject}`],
      id,
      scheduleExamId,
    )
  }

  if (!title) {
    return result('unknown', SUBJECT_IDS.UNKNOWN, 'unknown', ['missing-title'], id, scheduleExamId)
  }

  // Mixed signals in one task title
  if (hasBothEnglishParts(title) || (/ภาค\s*ก/.test(title) && /วิชาเอก/.test(title))) {
    return result('mixed', SUBJECT_IDS.UNKNOWN, 'mixed', ['task.title:multi-part'], id, scheduleExamId)
  }

  // Ep8. alone is insufficient — require วิชาเอก (or other major signals)
  if (
    hasMajorEnglishSignal(title)
    || /วิชาเอกอังกฤษ|วิชาเอก\s*ภาค\s*ข|วิชาเอกภาคข/.test(title)
    || (/Ep8\./.test(title) && /วิชาเอก/.test(title))
  ) {
    return result('ข', SUBJECT_IDS.ENGLISH_MAJOR, 'heuristic', ['task.title:english-major'], id, scheduleExamId)
  }

  if (hasSkillsAEnglishSignal(title) || /หมาหอน.*ภาค\s*ก.*ภาษาอังกฤษ|ภาษาอังกฤษภาค\s*ก/.test(title)) {
    return result('ก', SUBJECT_IDS.ENGLISH_SKILLS_A, 'heuristic', ['task.title:english-skills-a'], id, scheduleExamId)
  }

  // Bare "อังกฤษ" without part markers → unknown (do not collapse skills vs major)
  if (/อังกฤษ|english/i.test(title) && !/ภาค\s*ก|ภาคก|วิชาเอก|ภาค\s*ข|ภาคข/.test(title)) {
    return result('unknown', SUBJECT_IDS.UNKNOWN, 'unknown', ['task.title:english-without-part'], id, scheduleExamId)
  }

  if (/วิชาการศึกษา|จิตวิทยา|หลักสูตร/.test(title)) {
    return result('ข', SUBJECT_IDS.EDUCATION, 'heuristic', ['task.title:education'], id, scheduleExamId)
  }

  if (/คิดวิเคราะห์|ตรรกะ|ลำดับตัวเลข/.test(title)) {
    return result('ก', SUBJECT_IDS.GENERAL_REASONING, 'heuristic', ['task.title:reasoning'], id, scheduleExamId)
  }

  if (/สัมภาษณ์|ภาค\s*ค/.test(title)) {
    return result('ค', SUBJECT_IDS.INTERVIEW_C, 'heuristic', ['task.title:interview'], id, scheduleExamId)
  }

  if (/สมัคร|ประกาศ|เขต|HRMS|เอกสาร/i.test(title)) {
    return result('admin', SUBJECT_IDS.ADMIN, 'heuristic', ['task.title:admin'], id, scheduleExamId)
  }

  // Conditional law/math — subject only; never invent exam part from the word alone
  if (/กฎหมาย/.test(title) && !/ภาค\s*[กขค]/.test(title)) {
    return result('unknown', SUBJECT_IDS.LAW, 'heuristic', ['task.title:law-no-exam-part'], id, scheduleExamId)
  }
  if (/คณิต/.test(title) && !/ภาค\s*[กขค]/.test(title)) {
    return result('unknown', SUBJECT_IDS.MATH, 'heuristic', ['task.title:math-no-exam-part'], id, scheduleExamId)
  }

  // Content unknown — scheduleExamId may still be present but does not classify content
  return result('unknown', SUBJECT_IDS.UNKNOWN, 'unknown', ['task-unmapped'], id, scheduleExamId)
}

/**
 * @param {string} subjectId
 * @returns {ExamPart}
 */
export function subjectIdToExamPart(subjectId) {
  switch (subjectId) {
    case SUBJECT_IDS.GENERAL_REASONING:
    case SUBJECT_IDS.ENGLISH_SKILLS_A:
    case SUBJECT_IDS.GENERAL_KNOWLEDGE_A:
      return 'ก'
    case SUBJECT_IDS.EDUCATION:
    case SUBJECT_IDS.ENGLISH_MAJOR:
    case SUBJECT_IDS.LAW:
      // Official: ก.ค.ศ. ว14/2566 — education + law under ภาค ข
      return 'ข'
    case SUBJECT_IDS.MATH:
      // Official: quantitative analysis under ภาค ก ความสามารถในการคิดวิเคราะห์
      return 'ก'
    case SUBJECT_IDS.INTERVIEW_C:
      return 'ค'
    case SUBJECT_IDS.ADMIN:
      return 'admin'
    case SUBJECT_IDS.UNKNOWN:
    default:
      return 'unknown'
  }
}

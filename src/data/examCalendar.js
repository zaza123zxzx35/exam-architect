/**
 * Single source of truth for exam datetimes and related schedule windows.
 * Phase B M0 default: align with the English Study Desk (14–15 พ.ย. 2569 09:00 +07:00).
 * Update only this module when official announcements change.
 */

export const TIMEZONE = 'Asia/Bangkok'

/** @typedef {'ก' | 'ข' | 'ค' | 'other'} ExamPart */

/**
 * @typedef {object} ExamDefinition
 * @property {string} id
 * @property {string} title
 * @property {ExamPart} part
 * @property {string} startsAt ISO-8601 with offset
 * @property {number} [totalScore]
 * @property {number} [weight]
 * @property {string} labelShort Thai short label for UI chips
 * @property {string} labelLong Thai long label for timelines
 */

/** @type {ExamDefinition[]} */
export const EXAMS = [
  {
    id: 'exam-part-a-2569',
    title: 'สอบภาค ก',
    part: 'ก',
    startsAt: '2026-11-14T09:00:00+07:00',
    totalScore: 200,
    weight: 3,
    labelShort: '14 พ.ย. 2569 · 09:00 น.',
    labelLong: '14 พฤศจิกายน 2569 · 09:00 น.',
  },
  {
    id: 'exam-part-b-2569',
    title: 'สอบภาค ข',
    part: 'ข',
    startsAt: '2026-11-15T09:00:00+07:00',
    // Align with official curriculum buckets (เอก 100 + การศึกษา 75 + กฎหมาย 25).
    totalScore: 200,
    weight: 2,
    labelShort: '15 พ.ย. 2569 · 09:00 น.',
    labelLong: '15 พฤศจิกายน 2569 · 09:00 น.',
  },
]

export const REGISTRATION_WINDOW = {
  id: 'registration-2569',
  title: 'ช่วงรับสมัคร',
  startDate: '2026-10-19',
  endDate: '2026-10-25',
  labelShort: '19–25 ต.ค. 2569',
  note: 'ตรวจประกาศและเตรียมเอกสารจากหน่วยงาน',
}

/** Primary countdown target = ภาค ก */
export function getPrimaryExam() {
  return EXAMS.find(exam => exam.part === 'ก') || EXAMS[0]
}

export function getExams() {
  return EXAMS.slice()
}

export function getExamById(id) {
  return EXAMS.find(exam => exam.id === id) || null
}

/**
 * @param {number} [nowMs]
 * @param {string} [examId]
 */
export function getCountdown(nowMs = Date.now(), examId) {
  const exam = examId ? getExamById(examId) : getPrimaryExam()
  const examAt = new Date(exam.startsAt).getTime()
  const remaining = Math.max(0, examAt - nowMs)
  const totalMinutes = Math.floor(remaining / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  return {
    exam,
    examAt,
    days,
    hours,
    minutes,
    isPast: nowMs >= examAt,
  }
}

/** Key dates for Dashboard timeline (derived, not duplicated hardcodes elsewhere). */
export function getKeyDates() {
  return [
    {
      id: REGISTRATION_WINDOW.id,
      date: REGISTRATION_WINDOW.labelShort,
      title: REGISTRATION_WINDOW.title,
      note: REGISTRATION_WINDOW.note,
    },
    ...EXAMS.map(exam => ({
      id: exam.id,
      date: exam.labelShort,
      title: exam.title,
      note: exam.part === 'ก'
        ? 'กำหนดวันสอบที่หน้าเว็บอ้างอิง'
        : 'ตรวจเวลาและสถานที่จากประกาศล่าสุด',
    })),
  ]
}

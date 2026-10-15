/**
 * Live / content-block schedules.
 * v4.1 — เลดี้เก๋เก๋ + VIP Oct + ตารางออนไลน์ 15–23 ต.ค. (ติวเตอร์ตามโปสเตอร์ · คลังยังเลดี้/อ.นนท์).
 */

import { SUBJECT_IDS } from '../lib/study/taxonomy.js'

/** @typedef {'live' | 'content-block' | 'logistics'} LiveEventKind */

/**
 * @typedef {object} LiveTutorEvent
 * @property {string} id
 * @property {LiveEventKind} kind
 * @property {string} date
 * @property {string} [dateEnd]
 * @property {string} [startTime]
 * @property {string} [endTime]
 * @property {number} estimatedMinutes
 * @property {'ก'|'ข'|'mixed'|'admin'} examPart
 * @property {string} subjectId
 * @property {string} titleTh
 * @property {string} seriesTh
 * @property {string} sourceTh
 * @property {number} priorityRank
 * @property {string} reasonTh
 * @property {string[]} tags
 */

export const LIVE_PRIORITY = Object.freeze({
  PART_B_MAJOR: 10,
  PART_B_EDUCATION: 20,
  PART_B_LAW: 30,
  PART_A_ENGLISH: 40,
  PART_A_CIVIL: 45,
  PART_A_HOWL_PAST: 50,
  PART_A_THAI: 55,
  PART_A_MATH: 60,
  LOGISTICS: 90,
})

/** @deprecated use SUBJECT_IDS.CIVIL_SERVANT_A */
export const CIVIL_SERVANT_A = SUBJECT_IDS.CIVIL_SERVANT_A

/**
 * Dates from flyer «ตารางติวพาบรรจุ สพฐ. 69» · VIP Group ครูเลดี้เก๋เก๋
 * (พุทธศักราช 2569 → ค.ศ. 2026). No invented join links.
 *
 * @type {ReadonlyArray<LiveTutorEvent>}
 */
export const LIVE_TUTOR_EVENTS = Object.freeze([
  // —— ภาค ก แหกโค้ง 21:00–22:30 ——
  {
    id: 'lady-live-a-haek-2026-09-26',
    kind: 'live',
    date: '2026-09-26',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-07',
    kind: 'live',
    date: '2026-10-07',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-21',
    kind: 'live',
    date: '2026-10-21',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-howl-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน ภาค ก ภาษาอังกฤษ (ข้อสอบจริง)',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'ไลฟ์หมาหอนเฉลยข้อสอบจริงตามโปสเตอร์ VIP',
    tags: ['หมาหอน', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-a-haek-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก ภาษาอังกฤษ',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์แหกโค้งภาค ก ตามโปสเตอร์ VIP',
    tags: ['แหกโค้ง', 'live', 'lady-kaekae'],
  },
  // —— ภาค ข วิชาเอก 22:30–00:00 (same nights) ——
  {
    id: 'lady-live-b-major-2026-09-26',
    kind: 'live',
    date: '2026-09-26',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-07',
    kind: 'live',
    date: '2026-10-07',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-21',
    kind: 'live',
    date: '2026-10-21',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-10-28',
    kind: 'live',
    date: '2026-10-28',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-11-04',
    kind: 'live',
    date: '2026-11-04',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },
  {
    id: 'lady-live-b-major-2026-11-11',
    kind: 'live',
    date: '2026-11-11',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · ตารางติวพาบรรจุ สพฐ. 69',
    sourceTh: 'flyer VIP Group ครูเลดี้เก๋เก๋',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกอังกฤษตามโปสเตอร์ VIP',
    tags: ['วิชาเอก', 'live', 'lady-kaekae'],
  },

  // —— VIP ช่วงติวเนื้อหา สพฐ.69 (โฟกัสวิชาในคลัง · ไม่สร้างลิงก์ใหม่) ——
  {
    id: 'vip-orient-2026-10-06',
    kind: 'logistics',
    date: '2026-10-06',
    estimatedMinutes: 30,
    examPart: 'admin',
    subjectId: SUBJECT_IDS.ADMIN,
    titleTh: 'ปฐมนิเทศ (Orientation)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.LOGISTICS,
    reasonTh: 'วันปฐมนิเทศตามโปสเตอร์ VIP',
    tags: ['orientation', 'logistics'],
  },
  {
    id: 'vip-civil-2026-10-07',
    kind: 'content-block',
    date: '2026-10-07',
    dateEnd: '2026-10-10',
    startTime: '20:00',
    endTime: '22:30',
    estimatedMinutes: 150,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.CIVIL_SERVANT_A,
    titleTh: 'โฟกัสข้าราชการที่ดี (พรบ.ฉบับจริง + ข้อสอบจริง)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_A_CIVIL,
    reasonTh: 'บล็อกเนื้อหาข้าราชการที่ดี 7–10 ต.ค. — ดึงคลิปในคลัง (อ.นนท์/ขงเบ้ง)',
    tags: ['content-block', 'civil-servant', 'vip'],
  },
  {
    id: 'vip-ship-2026-10-11',
    kind: 'logistics',
    date: '2026-10-11',
    dateEnd: '2026-10-12',
    estimatedMinutes: 15,
    examPart: 'admin',
    subjectId: SUBJECT_IDS.ADMIN,
    titleTh: 'ส่งหนังสือ / จัดส่งเอกสาร',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.LOGISTICS,
    reasonTh: 'วันส่งเอกสารตามโปสเตอร์ VIP',
    tags: ['logistics', 'shipping'],
  },
  {
    id: 'vip-law-2026-10-12',
    kind: 'content-block',
    date: '2026-10-12',
    startTime: '20:00',
    endTime: '22:30',
    estimatedMinutes: 150,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.LAW,
    titleTh: 'โฟกัสกฎหมายการศึกษา (พรบ.ฉบับจริง + ข้อสอบจริง)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_B_LAW,
    reasonTh: 'บล็อกกฎหมาย 12 ต.ค. — ดึงคลิปอ.นนท์ในคลัง',
    tags: ['content-block', 'law', 'vip'],
  },
  {
    id: 'vip-english-2026-10-13',
    kind: 'content-block',
    date: '2026-10-13',
    dateEnd: '2026-10-15',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'โฟกัสภาษาอังกฤษภาค ก',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'บล็อกอังกฤษ 13–15 ต.ค. — ดึงคลิปเลดี้เก๋เก๋ในคลัง',
    tags: ['content-block', 'english-a', 'vip'],
  },
  {
    id: 'vip-thai-2026-10-16',
    kind: 'content-block',
    date: '2026-10-16',
    dateEnd: '2026-10-18',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
    titleTh: 'โฟกัสภาษาไทย',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_A_THAI,
    reasonTh: 'บล็อกไทย 16–18 ต.ค. — ดึง YouTube วิเคราะห์ข้อสอบในคลัง',
    tags: ['content-block', 'thai', 'vip'],
  },
  {
    id: 'vip-edu-2026-10-19',
    kind: 'content-block',
    date: '2026-10-19',
    dateEnd: '2026-10-22',
    estimatedMinutes: 120,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.EDUCATION,
    titleTh: 'โฟกัสวิชาการศึกษา (มาตรฐานการจัดการเรียนการสอน)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_B_EDUCATION,
    reasonTh: 'บล็อกการศึกษา 19–22 ต.ค. — ดึงคลิปอ.นนท์ในคลัง',
    tags: ['content-block', 'education', 'vip'],
  },
  {
    id: 'vip-math-2026-10-23',
    kind: 'content-block',
    date: '2026-10-23',
    dateEnd: '2026-10-24',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.MATH,
    titleTh: 'โฟกัสคณิต/เหตุผล',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_A_MATH,
    reasonTh: 'บล็อกคณิต 23–24 ต.ค. — ดึง YouTube/แก็บในคลัง',
    tags: ['content-block', 'math', 'vip'],
  },
  {
    id: 'vip-math-2026-10-26',
    kind: 'content-block',
    date: '2026-10-26',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.MATH,
    titleTh: 'โฟกัสคณิต/เหตุผล (ต่อ)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_A_MATH,
    reasonTh: 'บล็อกคณิต 26 ต.ค. — ดึง YouTube/แก็บในคลัง',
    tags: ['content-block', 'math', 'vip'],
  },
  {
    id: 'vip-law-2026-10-27',
    kind: 'content-block',
    date: '2026-10-27',
    dateEnd: '2026-10-30',
    estimatedMinutes: 120,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.LAW,
    titleTh: 'โฟกัสกฎหมายการศึกษา (ทบทวน)',
    seriesTh: 'ตารางติว VIP รับรองผล สพฐ. 69',
    sourceTh: 'flyer VIP ช่วงติวเนื้อหา',
    priorityRank: LIVE_PRIORITY.PART_B_LAW,
    reasonTh: 'บล็อกกฎหมาย 27–30 ต.ค. — ดึงคลิปอ.นนท์ในคลัง',
    tags: ['content-block', 'law', 'vip'],
  },

  // —— ตารางออนไลน์ 15–23 ต.ค. (ติวเตอร์ตามโปสเตอร์ · ปุ่มเปิดลิงก์ใช้คลังเลดี้/อ.นนท์ ไม่แต่งลิงก์เข้าไลฟ์) ——
  {
    id: 'online-civil-2026-10-15',
    kind: 'content-block',
    date: '2026-10-15',
    dateEnd: '2026-10-20',
    startTime: '11:00',
    endTime: '14:00',
    estimatedMinutes: 180,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.CIVIL_SERVANT_A,
    titleTh: 'ภาค ก ข้าราชการที่ดี · ดร.วิรัตน์ (เช้า 11:00 / บ่าย 14:00)',
    seriesTh: 'ตารางติวออนไลน์ ครูผู้ช่วย 2569',
    sourceTh: 'flyer Update ตารางติวออนไลน์ 15–23 ต.ค.',
    priorityRank: LIVE_PRIORITY.PART_A_CIVIL + 1,
    reasonTh: 'ตามโปสเตอร์ · ทบทวนด้วยคลิปอ.นนท์/ขงเบ้งในคลัง (ไม่มีลิงก์เข้าห้องดร.วิรัตน์)',
    tags: ['content-block', 'civil-servant', 'online-table', 'tutor:ดร.วิรัตน์'],
  },
  {
    id: 'online-edu-2026-10-15',
    kind: 'content-block',
    date: '2026-10-15',
    dateEnd: '2026-10-18',
    startTime: '20:00',
    endTime: '22:00',
    estimatedMinutes: 120,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.EDUCATION,
    titleTh: 'ภาค ข มาตรฐานการสอน · ดร.ธนากร (ค่ำ 20:00)',
    seriesTh: 'ตารางติวออนไลน์ ครูผู้ช่วย 2569',
    sourceTh: 'flyer Update ตารางติวออนไลน์ 15–23 ต.ค.',
    priorityRank: LIVE_PRIORITY.PART_B_EDUCATION + 1,
    reasonTh: 'ตามโปสเตอร์ · ทบทวนด้วยคลิปอ.นนท์วิชาการศึกษาในคลัง',
    tags: ['content-block', 'education', 'online-table', 'tutor:ดร.ธนากร'],
  },
  {
    id: 'online-english-2026-10-19',
    kind: 'content-block',
    date: '2026-10-19',
    dateEnd: '2026-10-20',
    startTime: '20:00',
    endTime: '22:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'ภาค ก ภาษาอังกฤษ · อ.ธนารีย์รัฐ (ค่ำ 20:00)',
    seriesTh: 'ตารางติวออนไลน์ ครูผู้ช่วย 2569',
    sourceTh: 'flyer Update ตารางติวออนไลน์ 15–23 ต.ค.',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH + 1,
    reasonTh: 'ตามโปสเตอร์ · ทบทวนด้วยคลิปเลดี้เก๋เก๋ในคลัง (อังกฤษไม่ผูกอ.นนท์)',
    tags: ['content-block', 'english-a', 'online-table', 'tutor:อ.ธนารีย์รัฐ'],
  },
  {
    id: 'online-law-2026-10-21',
    kind: 'content-block',
    date: '2026-10-21',
    dateEnd: '2026-10-23',
    startTime: '11:00',
    endTime: '14:00',
    estimatedMinutes: 180,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.LAW,
    titleTh: 'ภาค ข กฎหมายการศึกษา · ดร.วิรัตน์ (เช้า 11:00 / บ่าย 14:00)',
    seriesTh: 'ตารางติวออนไลน์ ครูผู้ช่วย 2569',
    sourceTh: 'flyer Update ตารางติวออนไลน์ 15–23 ต.ค.',
    priorityRank: LIVE_PRIORITY.PART_B_LAW + 1,
    reasonTh: 'ตามโปสเตอร์ · ทบทวนด้วยคลิปอ.นนท์กฎหมายในคลัง',
    tags: ['content-block', 'law', 'online-table', 'tutor:ดร.วิรัตน์'],
  },
  {
    id: 'online-math-2026-10-21',
    kind: 'content-block',
    date: '2026-10-21',
    dateEnd: '2026-10-23',
    startTime: '20:00',
    endTime: '22:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.MATH,
    titleTh: 'ภาค ก ตัวเลขและเหตุผล · อ.ศรัญภรณ์ (ค่ำ 20:00)',
    seriesTh: 'ตารางติวออนไลน์ ครูผู้ช่วย 2569',
    sourceTh: 'flyer Update ตารางติวออนไลน์ 15–23 ต.ค.',
    priorityRank: LIVE_PRIORITY.PART_A_MATH + 1,
    reasonTh: 'ตามโปสเตอร์ · ทบทวนด้วย YouTube/แก็บคณิตในคลัง',
    tags: ['content-block', 'math', 'online-table', 'tutor:อ.ศรัญภรณ์'],
  },
])

export const LIVE_TUTOR_SCHEDULE_VERSION = '4.1-online-tutors-labeled'

/**
 * @param {LiveTutorEvent} event
 */
export function expandLiveEventDates(event) {
  const start = event.date
  const end = event.dateEnd || event.date
  const out = []
  const cursor = new Date(`${start}T12:00:00+07:00`)
  const last = new Date(`${end}T12:00:00+07:00`)
  while (cursor <= last) {
    const plannedDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(cursor)
    out.push({ ...event, plannedDate })
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

/**
 * @param {string} [fromIso]
 * @param {{ includePast?: boolean, kinds?: LiveEventKind[] }} [options]
 */
export function listLiveTutorEvents(fromIso, options = {}) {
  const includePast = options.includePast === true
  const kinds = options.kinds
  return LIVE_TUTOR_EVENTS.filter(e => {
    if (kinds && !kinds.includes(e.kind)) return false
    if (!includePast && fromIso) {
      const end = e.dateEnd || e.date
      if (end < fromIso) return false
    }
    return true
  }).sort((a, b) => {
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return String(a.startTime || '').localeCompare(String(b.startTime || ''))
      || a.id.localeCompare(b.id)
  })
}

/**
 * @param {string} dateIso
 */
export function subjectFocusForDate(dateIso) {
  const hits = []
  for (const e of LIVE_TUTOR_EVENTS) {
    if (e.kind === 'logistics') continue
    const end = e.dateEnd || e.date
    if (dateIso < e.date || dateIso > end) continue
    hits.push(e)
  }
  hits.sort((a, b) => a.priorityRank - b.priorityRank || a.id.localeCompare(b.id))
  return hits[0] || null
}

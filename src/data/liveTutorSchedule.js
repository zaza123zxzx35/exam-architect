/**
 * User-supplied live / content-block schedules (โพสเตอร์ตารางติว).
 * Dates are Buddhist Era year on posters → Gregorian 2026 for พ.ศ. 2569.
 * Priority ranks follow official score weights (ว14/2566 / หลักเกณฑ์ 2569) — not “จะออกแน่นอน”.
 *
 * Sources (user images):
 * - ตารางติวพาบรรจุ สพฐ.69 · กลุ่ม VIP ครูเลดี้เก๋เก๋ (หมาหอน / แหกโค้ง ก+ข)
 * - ตารางติว VIP รับรองผล สพฐ.69 · ช่วงติวเนื้อหา 6–30 ต.ค.
 */

import { SUBJECT_IDS } from '../lib/study/taxonomy.js'

/** @typedef {'live' | 'content-block' | 'logistics'} LiveEventKind */

/**
 * @typedef {object} LiveTutorEvent
 * @property {string} id
 * @property {LiveEventKind} kind
 * @property {string} date ISO YYYY-MM-DD (start)
 * @property {string} [dateEnd] inclusive end for multi-day blocks
 * @property {string} [startTime] HH:MM local +07
 * @property {string} [endTime] HH:MM (may be 00:00 next calendar day)
 * @property {number} estimatedMinutes
 * @property {'ก'|'ข'|'mixed'|'admin'} examPart
 * @property {string} subjectId
 * @property {string} titleTh
 * @property {string} seriesTh
 * @property {string} sourceTh
 * @property {number} priorityRank lower = higher priority
 * @property {string} reasonTh
 * @property {string[]} tags
 */

/**
 * Official relative priority (lower = schedule / list earlier).
 * Part ข major 100 > education 75 > law 25;
 * Part ก english 50 ≈ civil-servant 50 > thai/math slice of 100.
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

/** Subject id for ข้าราชการที่ดี (ภาค ก 50 คะแนน) — not Part ข law. */
export const CIVIL_SERVANT_A = 'civil-servant-a'

/**
 * @type {ReadonlyArray<LiveTutorEvent>}
 */
export const LIVE_TUTOR_EVENTS = Object.freeze([
  // —— ครูเลดี้เก๋เก๋ · แหกโค้ง / หมาหอน ——
  {
    id: 'lady-a-2026-09-26-curve',
    kind: 'live',
    date: '2026-09-26',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก (50 คะแนน) — ต่ำกว่าวิชาเอกภาค ข',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-09-26-major',
    kind: 'live',
    date: '2026-09-26',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข (100 คะแนน) — ความสำคัญสูงสุดในตารางนี้',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-10-07-curve',
    kind: 'live',
    date: '2026-10-07',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-10-07-major',
    kind: 'live',
    date: '2026-10-07',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข (100 คะแนน)',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-10-21-curve',
    kind: 'live',
    date: '2026-10-21',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-10-21-major',
    kind: 'live',
    date: '2026-10-21',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข (100 คะแนน)',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-10-28-howl',
    kind: 'live',
    date: '2026-10-28',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน — เฉลยข้อสอบจริง สพฐ. ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'เฉลยข้อสอบจริงย้อนหลัง — สำคัญใกล้สอบ แต่รองจากเนื้อหาเอก/การศึกษา',
    tags: ['หมาหอน', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-10-28-curve',
    kind: 'live',
    date: '2026-10-28',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-10-28-major',
    kind: 'live',
    date: '2026-10-28',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข (100 คะแนน)',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-11-04-howl',
    kind: 'live',
    date: '2026-11-04',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน — เฉลยข้อสอบจริง สพฐ. ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'เฉลยข้อสอบจริงย้อนหลัง ใกล้สอบภาค ก',
    tags: ['หมาหอน', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-11-04-curve',
    kind: 'live',
    date: '2026-11-04',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-11-04-major',
    kind: 'live',
    date: '2026-11-04',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข (100 คะแนน)',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-11-11-howl',
    kind: 'live',
    date: '2026-11-11',
    startTime: '19:00',
    endTime: '21:00',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'หมาหอน — เฉลยข้อสอบจริง สพฐ. ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_HOWL_PAST,
    reasonTh: 'เฉลยข้อสอบจริงย้อนหลัง สัปดาห์ก่อนสอบ',
    tags: ['หมาหอน', 'lady-kaekae'],
  },
  {
    id: 'lady-a-2026-11-11-curve',
    kind: 'live',
    date: '2026-11-11',
    startTime: '21:00',
    endTime: '22:30',
    estimatedMinutes: 90,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.ENGLISH_SKILLS_A,
    titleTh: 'แหกโค้ง ภาค ก',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_A_ENGLISH,
    reasonTh: 'ไลฟ์เก็งอังกฤษภาค ก ใกล้สอบ',
    tags: ['แหกโค้ง', 'lady-kaekae'],
  },
  {
    id: 'lady-b-2026-11-11-major',
    kind: 'live',
    date: '2026-11-11',
    startTime: '22:30',
    endTime: '00:00',
    estimatedMinutes: 90,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'ไลฟ์วิชาเอกภาษาอังกฤษ ภาค ข',
    seriesTh: 'ครูเลดี้เก๋เก๋ · หมาหอน/แหกโค้ง',
    sourceTh: 'ตารางติวพาบรรจุ สพฐ.69 (VIP ครูเลดี้เก๋เก๋)',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ไลฟ์วิชาเอกภาค ข ใกล้สอบ',
    tags: ['วิชาเอก', 'lady-kaekae'],
  },

  // —— VIP ช่วงติวเนื้อหา ต.ค. ——
  {
    id: 'vip-2026-10-06-orient',
    kind: 'logistics',
    date: '2026-10-06',
    estimatedMinutes: 30,
    examPart: 'admin',
    subjectId: SUBJECT_IDS.ADMIN,
    titleTh: 'ปฐมนิเทศคอร์ส VIP',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.LOGISTICS,
    reasonTh: 'วันปฐมนิเทศ — ไม่ใช่เนื้อหาสอบ',
    tags: ['vip-content', 'orient'],
  },
  {
    id: 'vip-2026-10-07-10-civil',
    kind: 'live',
    date: '2026-10-07',
    dateEnd: '2026-10-10',
    startTime: '20:00',
    endTime: '22:30',
    estimatedMinutes: 150,
    examPart: 'ก',
    subjectId: CIVIL_SERVANT_A,
    titleTh: 'ติว พ.ร.บ.ฉบับจริง + ข้อสอบจริง (ข้าราชการที่ดี)',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_A_CIVIL,
    reasonTh: 'ภาค ก ข้าราชการที่ดี 50 คะแนน — แยกจากกฎหมายภาค ข',
    tags: ['vip-content', 'civil-servant', 'live-window'],
  },
  {
    id: 'vip-2026-10-11-12-ship',
    kind: 'logistics',
    date: '2026-10-11',
    dateEnd: '2026-10-12',
    estimatedMinutes: 15,
    examPart: 'admin',
    subjectId: SUBJECT_IDS.ADMIN,
    titleTh: 'ส่งหนังสือ / จัดส่งเอกสาร',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.LOGISTICS,
    reasonTh: 'โลจิสติกส์เอกสาร — ไม่จัดเป็นชั่วโมงติวหลัก',
    tags: ['vip-content', 'shipping'],
  },
  {
    id: 'vip-2026-10-12-edu-law',
    kind: 'live',
    date: '2026-10-12',
    startTime: '20:00',
    endTime: '22:30',
    estimatedMinutes: 150,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.LAW,
    titleTh: 'ติว พ.ร.บ.ฉบับจริง + ข้อสอบจริง (กฎหมายการศึกษา)',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_B_LAW,
    reasonTh: 'กฎหมายภาค ข 25 คะแนน — ไลฟ์เนื้อหาหลัก',
    tags: ['vip-content', 'law', 'live-window'],
  },
  {
    id: 'vip-2026-10-13-15-english',
    kind: 'content-block',
    date: '2026-10-13',
    dateEnd: '2026-10-15',
    estimatedMinutes: 120,
    examPart: 'mixed',
    subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
    titleTh: 'บล็อกติวภาษาอังกฤษ (เน้นเอก + ทบทวน ก)',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_B_MAJOR,
    reasonTh: 'ช่วงเนื้อหาอังกฤษ — ให้ความสำคัญวิชาเอกภาค ข ก่อนทักษะภาค ก',
    tags: ['vip-content', 'english'],
  },
  {
    id: 'vip-2026-10-16-18-thai',
    kind: 'content-block',
    date: '2026-10-16',
    dateEnd: '2026-10-18',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.GENERAL_KNOWLEDGE_A,
    titleTh: 'บล็อกติวภาษาไทย',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_A_THAI,
    reasonTh: 'ภาษาไทยอยู่ในก้อนคิดวิเคราะห์ภาค ก (ส่วนหนึ่งของ 100 คะแนน)',
    tags: ['vip-content', 'thai'],
  },
  {
    id: 'vip-2026-10-19-22-education',
    kind: 'content-block',
    date: '2026-10-19',
    dateEnd: '2026-10-22',
    estimatedMinutes: 120,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.EDUCATION,
    titleTh: 'บล็อกภาค ข — มาตรฐานการจัดการเรียนการสอน (วิชาการศึกษา)',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_B_EDUCATION,
    reasonTh: 'วิชาการศึกษาภาค ข 75 คะแนน — บังคับจัดคลิปการศึกษาในหน้าต่างนี้',
    tags: ['vip-content', 'education', 'part-b'],
  },
  {
    id: 'vip-2026-10-23-24-math',
    kind: 'content-block',
    date: '2026-10-23',
    dateEnd: '2026-10-24',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.MATH,
    titleTh: 'บล็อกติวคณิตศาสตร์',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_A_MATH,
    reasonTh: 'คณิตในคิดวิเคราะห์เชิงปริมาณภาค ก',
    tags: ['vip-content', 'math'],
  },
  {
    id: 'vip-2026-10-26-math',
    kind: 'content-block',
    date: '2026-10-26',
    estimatedMinutes: 120,
    examPart: 'ก',
    subjectId: SUBJECT_IDS.MATH,
    titleTh: 'บล็อกติวคณิตศาสตร์',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_A_MATH,
    reasonTh: 'คณิตในคิดวิเคราะห์เชิงปริมาณภาค ก',
    tags: ['vip-content', 'math'],
  },
  {
    id: 'vip-2026-10-27-30-edu-law',
    kind: 'content-block',
    date: '2026-10-27',
    dateEnd: '2026-10-30',
    estimatedMinutes: 120,
    examPart: 'ข',
    subjectId: SUBJECT_IDS.LAW,
    titleTh: 'บล็อกกฎหมายการศึกษา',
    seriesTh: 'ตารางติว VIP สพฐ.69 · ช่วงติวเนื้อหา',
    sourceTh: 'ตารางติว VIP รับรองผล สพฐ.69',
    priorityRank: LIVE_PRIORITY.PART_B_LAW,
    reasonTh: 'กฎหมายภาค ข 25 คะแนน — จัดคลิปกฎหมายครูในช่วงนี้',
    tags: ['vip-content', 'law', 'part-b'],
  },
])

export const LIVE_TUTOR_SCHEDULE_VERSION = '1.0-poster-2569'

/**
 * Expand multi-day events into per-date rows for calendar pinning.
 * @param {LiveTutorEvent} event
 * @returns {Array<LiveTutorEvent & { plannedDate: string }>}
 */
export function expandLiveEventDates(event) {
  const start = event.date
  const end = event.dateEnd || event.date
  const out = []
  const cursor = new Date(`${start}T12:00:00+07:00`)
  const last = new Date(`${end}T12:00:00+07:00`)
  while (cursor <= last) {
    const plannedDate = cursor.toISOString().slice(0, 10)
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
 * Subject focus for a calendar day from content-blocks / lives (highest priority wins).
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

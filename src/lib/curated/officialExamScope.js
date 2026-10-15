/**
 * Official exam-scope evidence for สพฐ. teacher-assistant competition (ครูผู้ช่วย).
 * Separates verified official facts from in-app catalog/taxonomy labels.
 * Never invents subject weights or frequency stats.
 */

import { SUBJECT_IDS } from '../study/taxonomy.js'

/** ISO date this module was last checked against cited sources. */
export const OFFICIAL_SCOPE_CHECKED_AT = '2026-10-14'

/**
 * @typedef {'verified_official' | 'aligned_official' | 'app_catalog_only' | 'unverified'} ScopeEvidenceStatus
 */

/**
 * Cited source documents (agency + date + URL).
 * @type {ReadonlyArray<{ id: string, titleTh: string, agencyTh: string, dated: string, url: string, roleTh: string }>}
 */
export const OFFICIAL_SCOPE_SOURCES = Object.freeze([
  {
    id: 'otepc-w14-2566',
    titleTh: 'ว14/2566 หลักเกณฑ์และวิธีการสอบแข่งขันฯ ตำแหน่งครูผู้ช่วย สังกัด สพฐ. (หลักสูตรแนบท้าย)',
    agencyTh: 'สำนักงาน ก.ค.ศ.',
    dated: '2566-05-01',
    url: 'http://circular.otepc.go.th/files/w14-2566_added_metadata_text.pdf',
    roleTh: 'หลักสูตรภาค ก / ภาค ข / ภาค ค อย่างเป็นทางการ',
  },
  {
    id: 'otepc-w14-2566-page',
    titleTh: 'หน้าประกาศ ว14/2566',
    agencyTh: 'สำนักงาน ก.ค.ศ.',
    dated: '2566-05-02',
    url: 'https://otepc.go.th/th/otepc06/news-otepc06/item/4409-14-2566.html',
    roleTh: 'หน้าเผยแพร่เอกสารทางการ (ดาวน์โหลด PDF)',
  },
  {
    id: 'sesao1-announce-2569',
    titleTh: 'ประกาศรับสมัครสอบแข่งขันฯ ตำแหน่งครูผู้ช่วย ปี พ.ศ. 2569 (ตารางสอบภาค ก/ข)',
    agencyTh: 'อ.ก.ค.ศ. เขตพื้นที่การศึกษามัธยมศึกษากรุงเทพมหานคร เขต 1',
    dated: '2569-10',
    url: 'https://www.sesao1.go.th/wp-content/uploads/2026/10/12162512505678.pdf',
    roleTh: 'ยืนยันว่าปี 2569 ยังใช้โครงวิชาภาค ก/ข ตาม ก.ค.ศ.',
  },
  {
    id: 'obec-w16660',
    titleTh: 'หนังสือ สพฐ. ด่วนที่สุด ที่ ศธ 04009/ว 16660',
    agencyTh: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
    dated: '2569-09-17',
    url: 'https://www.kruchiangrai.net/2026/09/27/kru-phu-chuay-2569-general-round-schedule/',
    roleTh: 'ปฏิทินสอบ 2569 (อ้างอิงหนังสือ; PDF ต้นทางควรตรวจบนเว็บ สพฐ./เขต)',
  },
  {
    id: 'obec-w17828',
    titleTh: 'หนังสือ สพฐ. ด่วนที่สุด ที่ ศธ 04009/ว 17828',
    agencyTh: 'สำนักงานคณะกรรมการการศึกษาขั้นพื้นฐาน',
    dated: '2569-10-05',
    url: 'https://krukengblog.com/education-updates/obec-assistant-teacher-exam-726-positions-45-majors-2569/',
    roleTh: 'ค่าสมัคร/สมัครออนไลน์/ตารางสอบ (อ้างอิงหนังสือ; PDF ต้นทางควรตรวจบนเว็บ สพฐ.)',
  },
])

/**
 * Official curriculum buckets (from ว14/2566 + confirmed in ประกาศเขต 2569).
 * @type {ReadonlyArray<{ examPart: 'ก'|'ข'|'ค', titleTh: string, maxScore: number, mapsToSubjectIds: string[], noteTh: string }>}
 */
export const OFFICIAL_CURRICULUM_BUCKETS = Object.freeze([
  {
    examPart: 'ก',
    titleTh: 'ความสามารถในการคิดวิเคราะห์',
    maxScore: 100,
    mapsToSubjectIds: [SUBJECT_IDS.MATH, SUBJECT_IDS.GENERAL_KNOWLEDGE_A, SUBJECT_IDS.GENERAL_REASONING],
    noteTh: 'รวมคิดวิเคราะห์เชิงภาษา / นามธรรม / ปริมาณ (คณิตเบื้องต้น)',
  },
  {
    examPart: 'ก',
    titleTh: 'ทักษะภาษาอังกฤษ',
    maxScore: 50,
    mapsToSubjectIds: [SUBJECT_IDS.ENGLISH_SKILLS_A],
    noteTh: 'แยกจากวิชาเอกอังกฤษภาค ข',
  },
  {
    examPart: 'ก',
    titleTh: 'ความรู้และลักษณะการเป็นข้าราชการที่ดี',
    maxScore: 50,
    mapsToSubjectIds: [SUBJECT_IDS.CIVIL_SERVANT_A],
    noteTh: 'แยกจากกฎหมายครูภาค ข — ใช้ subjectId civil-servant-a',
  },
  {
    examPart: 'ข',
    titleTh: 'มาตรฐานความรู้ทั่วไปในการจัดการเรียนการสอน',
    maxScore: 75,
    mapsToSubjectIds: [SUBJECT_IDS.EDUCATION],
    noteTh: 'วิชาการศึกษาอยู่ภาค ข ไม่ใช่ภาค ก',
  },
  {
    examPart: 'ข',
    titleTh: 'มาตรฐานความรู้ในเนื้อหาวิชาที่สอน (วิชาเอก)',
    maxScore: 100,
    mapsToSubjectIds: [SUBJECT_IDS.ENGLISH_MAJOR],
    noteTh: 'วิชาเอกตามกลุ่มที่สมัคร — ในคลังนี้คือ english-major',
  },
  {
    examPart: 'ข',
    titleTh: 'ความรอบรู้กฎหมายที่เกี่ยวข้องกับการปฏิบัติงานและแนวทางการปฏิรูปการศึกษา',
    maxScore: 25,
    mapsToSubjectIds: [SUBJECT_IDS.LAW],
    noteTh: 'กฎหมายครูอยู่ภาค ข ไม่ใช่ภาค ก',
  },
])

/**
 * Per-subject scope verdict used by scoring / UI.
 * status verified_official = mapped from cited curriculum text.
 */
export const SUBJECT_OFFICIAL_SCOPE = Object.freeze({
  [SUBJECT_IDS.EDUCATION]: {
    examPart: 'ข',
    status: /** @type {ScopeEvidenceStatus} */ ('verified_official'),
    officialBucketTh: 'มาตรฐานความรู้ทั่วไปในการจัดการเรียนการสอน (75 คะแนน)',
    sourceIds: ['otepc-w14-2566', 'sesao1-announce-2569'],
    noteTh: 'ยืนยันจากหลักสูตร ก.ค.ศ. ว14/2566 และตารางสอบประกาศเขตปี 2569',
  },
  [SUBJECT_IDS.LAW]: {
    examPart: 'ข',
    status: /** @type {ScopeEvidenceStatus} */ ('verified_official'),
    officialBucketTh: 'ความรอบรู้กฎหมายฯ (25 คะแนน)',
    sourceIds: ['otepc-w14-2566', 'sesao1-announce-2569'],
    noteTh: 'ยืนยันจากหลักสูตร ก.ค.ศ. ว14/2566 และตารางสอบประกาศเขตปี 2569',
  },
  [SUBJECT_IDS.ENGLISH_MAJOR]: {
    examPart: 'ข',
    status: /** @type {ScopeEvidenceStatus} */ ('verified_official'),
    officialBucketTh: 'มาตรฐานความรู้ในเนื้อหาวิชาที่สอน / วิชาเอก (100 คะแนน)',
    sourceIds: ['otepc-w14-2566', 'sesao1-announce-2569'],
    noteTh: 'วิชาเอกตามกลุ่มที่สมัคร — แยกจากทักษะอังกฤษภาค ก',
  },
  [SUBJECT_IDS.ENGLISH_SKILLS_A]: {
    examPart: 'ก',
    status: /** @type {ScopeEvidenceStatus} */ ('verified_official'),
    officialBucketTh: 'ทักษะภาษาอังกฤษ (50 คะแนน)',
    sourceIds: ['otepc-w14-2566', 'sesao1-announce-2569'],
    noteTh: 'แยกจาก english-major ภาค ข',
  },
  [SUBJECT_IDS.MATH]: {
    examPart: 'ก',
    status: /** @type {ScopeEvidenceStatus} */ ('aligned_official'),
    officialBucketTh: 'ความสามารถในการคิดวิเคราะห์ — เชิงปริมาณ (ส่วนหนึ่งของ 100 คะแนน)',
    sourceIds: ['otepc-w14-2566'],
    noteTh: 'คณิตอยู่ในหัวข้อคิดวิเคราะห์เชิงปริมาณของภาค ก — ไม่ใช่วิชาแยกเต็มภาค',
  },
  [SUBJECT_IDS.GENERAL_KNOWLEDGE_A]: {
    examPart: 'ก',
    status: /** @type {ScopeEvidenceStatus} */ ('aligned_official'),
    officialBucketTh: 'ความสามารถในการคิดวิเคราะห์ — เชิงภาษา (ส่วนหนึ่งของ 100 คะแนน)',
    sourceIds: ['otepc-w14-2566'],
    noteTh: 'คลังใช้สำหรับภาษาไทย/จับใจความ — สอดคล้องคิดวิเคราะห์เชิงภาษา',
  },
  [SUBJECT_IDS.CIVIL_SERVANT_A]: {
    examPart: 'ก',
    status: /** @type {ScopeEvidenceStatus} */ ('verified_official'),
    officialBucketTh: 'ความรู้และลักษณะการเป็นข้าราชการที่ดี (50 คะแนน)',
    sourceIds: ['otepc-w14-2566', 'sesao1-announce-2569'],
    noteTh: 'ยืนยันจากหลักสูตร ก.ค.ศ. ว14/2566 — ไม่ปนกับกฎหมายภาค ข',
  },
  [SUBJECT_IDS.GENERAL_REASONING]: {
    examPart: 'ก',
    status: /** @type {ScopeEvidenceStatus} */ ('aligned_official'),
    officialBucketTh: 'ความสามารถในการคิดวิเคราะห์ — เชิงนามธรรม (ส่วนหนึ่งของ 100 คะแนน)',
    sourceIds: ['otepc-w14-2566'],
    noteTh: 'สอดคล้องคิดวิเคราะห์เชิงนามธรรมของภาค ก',
  },
})

/**
 * @param {string} subjectId
 */
export function getOfficialScopeForSubject(subjectId) {
  return SUBJECT_OFFICIAL_SCOPE[subjectId] || null
}

/**
 * Compare catalog row examPart against official scope (does not mutate).
 * @param {{ subjectId?: string, examPart?: string, id?: string }} row
 */
export function auditRowAgainstOfficialScope(row) {
  const scope = getOfficialScopeForSubject(String(row?.subjectId || ''))
  if (!scope) {
    return {
      id: row?.id || '',
      subjectId: row?.subjectId || '',
      catalogExamPart: row?.examPart || '',
      officialExamPart: null,
      status: /** @type {ScopeEvidenceStatus} */ ('unverified'),
      ok: true,
      messageTh: 'ยังไม่มี mapping ทางการสำหรับวิชานี้ในโมดูลนี้',
    }
  }
  const ok = row?.examPart === scope.examPart
  return {
    id: row?.id || '',
    subjectId: row?.subjectId || '',
    catalogExamPart: row?.examPart || '',
    officialExamPart: scope.examPart,
    status: scope.status,
    ok,
    messageTh: ok
      ? `ตรงกับขอบเขตทางการ (${scope.officialBucketTh})`
      : `คลังระบุภาค ${row?.examPart} แต่หลักฐานทางการชี้ภาค ${scope.examPart}: ${scope.noteTh}`,
  }
}

/**
 * @param {Array<{ subjectId?: string, examPart?: string, id?: string }>} catalog
 */
export function buildOfficialScopeReport(catalog = []) {
  const mismatches = []
  const bySubject = new Map()
  for (const row of catalog) {
    const audit = auditRowAgainstOfficialScope(row)
    if (!audit.ok) mismatches.push(audit)
    if (!bySubject.has(audit.subjectId)) {
      bySubject.set(audit.subjectId, {
        subjectId: audit.subjectId,
        officialExamPart: audit.officialExamPart,
        status: audit.status,
        catalogParts: new Set(),
        count: 0,
      })
    }
    const agg = bySubject.get(audit.subjectId)
    agg.count += 1
    if (row?.examPart) agg.catalogParts.add(row.examPart)
  }
  return {
    checkedAt: OFFICIAL_SCOPE_CHECKED_AT,
    sources: OFFICIAL_SCOPE_SOURCES,
    curriculumBuckets: OFFICIAL_CURRICULUM_BUCKETS,
    subjects: [...bySubject.values()].map(s => ({
      ...s,
      catalogParts: [...s.catalogParts],
    })),
    mismatches,
    limitationsTh: [
      'หนังสือ สพฐ. ว 16660 / ว 17828 อ้างจากหน้าสรุปที่มีลิงก์ — ควรเปิด PDF ต้นทางบนเว็บ สพฐ. อีกครั้งก่อนใช้งานจริง',
      'คะแนนรายหัวข้อเป็นไปตามหลักสูตร ก.ค.ศ. — ไม่ใช่สถิติความถี่ข้อสอบเก่า',
      'ข้าราชการที่ดี = civil-servant-a ภาค ก — แยกจาก law ภาค ข',
    ],
  }
}

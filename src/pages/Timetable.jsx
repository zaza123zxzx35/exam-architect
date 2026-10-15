import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FolderOpen,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Sun,
  Moon,
  Coffee
} from 'lucide-react'
import { useScheduleStore } from '../hooks/useScheduleStore'
import { timetableDaysFromSessions } from '../lib/schedule/model.js'
import { safeResourceUrl } from '../lib/planner/safeLink.js'

const LADY_POST_PINNED_URL = 'https://www.facebook.com/groups/152029819565529/posts/1531391668295997/'
const LADY_ANNOUNCEMENTS_URL = 'https://www.facebook.com/groups/152029819565529/announcements'
const ANON_ANNOUNCEMENTS_URL = 'https://www.facebook.com/groups/1044167951855528/announcements'
const ANON_GROUP_MAIN = 'https://www.facebook.com/groups/1044167951855528/'

const FB_GROUP_URLS = {
  'อ.นนท์': ANON_GROUP_MAIN,
  'ครูโต้ง': 'https://www.facebook.com/groups/28869179949362729/',
  'ครูเลดี้เก๋': 'https://www.facebook.com/groups/152029819565529/',
  'KRu สานฝัน': 'https://www.facebook.com/groups/2133828397441989/',
  'ครูเลดี้เก๋เก๋': 'https://www.facebook.com/groups/152029819565529/',
}

const detectSlotAction = (slot = {}) => {
  const t = `${slot.title || ''} ${slot.note || ''}`
  const actions = []

  if (slot._link) {
    const external = !!slot._linkExternal
    const href = external ? safeResourceUrl(slot._link) : slot._link
    if (href) {
      actions.push({ label: 'เปิดคลิปติว', href, external, icon: 'ExternalLink' })
    }
  } else if (/ไลฟ์สด|LIVE|กลุ่ม/i.test(t)) {
    for (const [key, url] of Object.entries(FB_GROUP_URLS)) {
      if (t.includes(key)) {
        const href = safeResourceUrl(url)
        if (href) actions.push({ label: `📡 เปิดกลุ่ม ${key}`, href, external: true, icon: 'PlayCircle' })
        break
      }
    }
    if (actions.length === 0) {
      actions.push({ label: '🎥 หน้า Videos (คอร์ส FB ทั้งหมด)', href: '/videos', icon: 'FolderOpen' })
    }
  }

  if (/Quiz|ชุด|ทำข้อสอบ|Challenge/i.test(t)) {
    actions.push({ label: '📝 ไปหน้า Quiz เลย', href: '/quiz', icon: 'FolderOpen' })
  }
  if (/Mock|ฝึกคิดวิเคราะห์|ภาค ก|ภาค ข|เก็บคะแนน|เปรียบเทียบ Mock/i.test(t)) {
    actions.push({ label: '📊 ไปหน้า Plan (บันทึก Mock/เช็ก)', href: '/plan', icon: 'FolderOpen' })
    actions.push({ label: '📈 Dashboard: ดูกราฟคะแนน', href: '/', icon: 'FolderOpen' })
  }
  if (/จด|โน้ต|ทบทวน|จุดผิด|Notebook|ทฤษฎี|หลักสูตร|วิธีการสอน|Port|เขต|Portfolio|Portfolio|วิเคราะห์เขต/i.test(t)) {
    actions.push({ label: '📒 ไปหน้า Notes (จดโน้ต)', href: '/notes', icon: 'FolderOpen' })
  }
  if (/สมัครสอบ|ประกาศเขต|เขต|ดู HRMS|สถิติ|เปิดรับ|ขาด|เกษียณ/i.test(t)) {
    actions.push({ label: '📋 หน้า Info (HRMS + เขต + สูตรสอบ)', href: '/info', icon: 'FolderOpen' })
  }

  return actions
}

const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const BE_OFFSET = 543

function pad(n) { return String(n).padStart(2, '0') }

function formatThaiLabel(date) {
  const w = THAI_WEEKDAYS[date.getDay()]
  const d = date.getDate()
  const m = THAI_MONTHS[date.getMonth()]
  const y = (date.getFullYear() + BE_OFFSET).toString().slice(-2)
  return `${w} ${d} ${m}. ${y}`
}

function getTag(date, iso) {
  if (iso >= '2026-11-10' && iso <= '2026-11-13') return '🔥 Final Sprint'
  if (iso >= '2026-11-02') return '📘 เปิดเทอม 2 (สมัครเรียนเสร็จแล้ว!)'
  if (iso >= '2026-10-19' && iso <= '2026-10-25') return '📝 เปิดสมัครสอบ'
  if (iso >= '2026-10-10') return '🎉 ปิดเทอมต่อเนื่อง (10 ต.ค. - 1 พ.ย. → 25 วันเต็ม!)'
  return 'ก่อนปิดเทอม (สอนจนถึง ศุกร์ 9 ต.ค.)'
}

/**
 * Daily focus topic. Tutor ownership (do not mix):
 * - ภาษาอังกฤษ ก/ข, แหกโค้ง, หมาหอน → ครูเลดี้เก๋เก๋ only
 * - ภาษาไทย / คณิต → self-study (YouTube), not อ.นนท์ LIVE
 * - วิชาการศึกษา / กฎหมาย / ข้าราชการที่ดี → อ.นนท์
 */
function getDayFocusTopic(iso) {
  if (iso >= '2026-10-07' && iso <= '2026-10-10') {
    return { topic: 'พรบ.ฉบับจริง + ข้อสอบจริง (ข้าราชการที่ดี)', owner: 'nonn' }
  }
  if (iso === '2026-10-12') {
    return { topic: 'พรบ.ฉบับจริง + ข้อสอบจริง (กฎหมายการศึกษา)', owner: 'nonn' }
  }
  if (iso >= '2026-10-13' && iso <= '2026-10-15') {
    return { topic: 'ภาษาอังกฤษภาค ก', owner: 'lady' }
  }
  if (iso >= '2026-10-16' && iso <= '2026-10-18') {
    return { topic: 'ภาษาไทย', owner: 'self' }
  }
  if (iso >= '2026-10-19' && iso <= '2026-10-22') {
    return { topic: 'ภาค ข มาตรฐานความรู้ทั่วไปในการจัดการเรียนการสอน (วิชาการศึกษา)', owner: 'nonn' }
  }
  if ((iso >= '2026-10-23' && iso <= '2026-10-24') || iso === '2026-10-26') {
    return { topic: 'คณิตศาสตร์ / ตัวเลขและเหตุผล', owner: 'self' }
  }
  if (iso >= '2026-10-27' && iso <= '2026-10-30') {
    return { topic: 'กฎหมายการศึกษา', owner: 'nonn' }
  }
  if (iso >= '2026-11-01' && iso <= '2026-11-06') {
    return { topic: 'หมาหอน ภาค ก ภาษาอังกฤษ (เฉลยข้อสอบย้อนหลัง)', owner: 'lady' }
  }
  if (iso === '2026-11-08' || iso === '2026-11-09' || iso === '2026-11-10') {
    return { topic: 'แหกโค้ง ภาค ก ภาษาอังกฤษ + จุดผิดสะสม', owner: 'lady' }
  }
  return { topic: 'ทบทวนรวมเนื้อหาทั้งหมด', owner: 'nonn' }
}

function getLadyLiveInfo(iso) {
  if (iso === '2026-10-07') {
    return { hasLive: true, hasHmahon: false, slots: [
      { time: '21.00 - 22.30', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: แหกโค้ง ครูผู้ช่วยภาค ก [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'เก็งข้อสอบน่าจะออก สพฐ. รอบทั่วไป 69 — ปักหมุดกลุ่มหน้า 1 ตารางแดง wolf (วันพุธ 7 ต.ค. 2569)', done: false, _link: LADY_POST_PINNED_URL, _linkExternal: true },
      { time: '22.30 - 00.00', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: วิชาเอกภาษาอังกฤษ ภาค ข [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'วิชาเอกอังกฤษ — ตามคำสั่ง "เลดี้เก๋เก๋คนเดียวพอ" ห้ามพลาด!', done: false, _link: LADY_POST_PINNED_URL, _linkExternal: true }
    ]}
  }
  if (iso === '2026-10-21') {
    return { hasLive: true, hasHmahon: false, slots: [
      { time: '21.00 - 22.30', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: แหกโค้ง ครูผู้ช่วยภาค ก [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'เก็งข้อสอบน่าจะออก สัปดาห์ที่ 2', done: false, _link: LADY_ANNOUNCEMENTS_URL, _linkExternal: true },
      { time: '22.30 - 00.00', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: วิชาเอกภาษาอังกฤษ ภาค ข [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'วิชาเอกอังกฤษ ภาค ข', done: false, _link: LADY_ANNOUNCEMENTS_URL, _linkExternal: true }
    ]}
  }
  const bigDays = ['2026-10-28', '2026-11-04', '2026-11-11']
  if (bigDays.includes(iso)) {
    return { hasLive: true, hasHmahon: true, slots: [
      { time: '19.00 - 21.00', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: หมาหอน เฉลยข้อสอบจริงย้อนหลังทั้งหมด [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'เฉลยข้อสอบจริง สพฐ. ย้อนหลังทุกปี = หมาหอน 3 ชม.รอบแรก', done: false, _link: LADY_ANNOUNCEMENTS_URL, _linkExternal: true },
      { time: '21.00 - 22.30', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: แหกโค้ง ครูผู้ช่วยภาค ก [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'เก็งข้อสอบน่าจะออก (วิเคราะห์โจทย์ 5 ปีย้อนหลัง)', done: false, _link: LADY_ANNOUNCEMENTS_URL, _linkExternal: true },
      { time: '22.30 - 00.00', title: '🔴 LIVE! ครูเลดี้เก๋ VIP: วิชาเอกภาษาอังกฤษ ภาค ข [กลุ่ม VIP เลดี้เก๋เก๋]', note: 'วิชาเอกอังกฤษ ภาค ข (Grammar + Reading + Method) — 3 ชม.ต่อเนื่องทั้งคืน', done: false, _link: LADY_ANNOUNCEMENTS_URL, _linkExternal: true }
    ]}
  }
  return { hasLive: false, hasHmahon: false, slots: [] }
}

// ════════════════════════════════════════════════════════════════
// 🎬 VOD Queue เลดี้เก๋ VIP: จัดคิววันต่อวัน 13.30-15.00 ช่วงปิดเทอม 25 วัน
// ════════════════════════════════════════════════════════════════
// ลำดับ Priority: 🩷ภาคข(P1สูงสุด) → 🔥หมาหอน(P1สำคัญ68ซ้ำ) → 🩵ภาคก(P1รอง)
const LADY_VOD_QUEUE = {
  '2026-10-10': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep7] สรุป Grammar Post-Test (เช็คจุดอ่อนก่อนเรียน 8.1)', link: 'https://www.facebook.com/share/v/1LsYAqk1No/' },
  '2026-10-11': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep6] เฉลยข้อสอบจริง สพฐ.กรณีพิเศษ ปี 66-68', link: 'https://www.facebook.com/share/v/18nPZY8JEy/' },
  // 12 ต.ค. = ประกาศเขต → SKIP VOD (ใช้ P3 วิเคราะห์เขตแทน)
  '2026-10-13': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.1] เก็งปี 69: วิชาเอกอังกฤษ 155 ข้อ หน้า 1-58', link: 'https://www.facebook.com/share/v/14iDtAkcMHX/' },
  '2026-10-14': { cat: '🩷 P1 วิชาเอก ภาคข + 🔥หมาหอน', title: '[Ep8.2] หน้า 59-115 + 🔥 หมาหอนอังคาร ครั้งที่ 1 (ภาคก 68 NEW)', link: 'https://www.facebook.com/share/v/1CnWdcv2eJ/' },
  '2026-10-15': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.3] เก็งปี 69 วิชาเอกอังกฤษ Part 3', link: 'https://www.facebook.com/share/v/19ttD1qEtW/' },
  '2026-10-16': { cat: '🩷 P1 วิชาเอก ภาคข + 🔥หมาหอน', title: '[Ep8.4] Part4 + 🔥 หมาหอนศุกร์ ครั้งที่ 1 (ภาคก + วิชาเอก 65-68)', link: 'https://www.facebook.com/share/v/16bcpJCcRu/' },
  '2026-10-17': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.5] เก็งปี 69 วิชาเอกอังกฤษ Part 5', link: 'https://www.facebook.com/share/v/19MSg8MgQL/' },
  '2026-10-18': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.6] เก็งปี 69 วิชาเอกอังกฤษ Part 6', link: 'https://www.facebook.com/share/v/1C7Ktt7sci/' },
  // 19-20 ต.ค. = เปิดสมัครสอบ 1-2 → VOD + P5 ภาคค ประวัติสลับ
  '2026-10-19': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.7] เก็งปี 69 วิชาเอกอังกฤษ Part 7 (สมัครวันแรก! ดูคลิป 1 ชม. แล้วไปเช็คระบบ)', link: 'https://www.facebook.com/share/v/19Mijy9p3L/' },
  '2026-10-20': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.8] เก็งปี 69 วิชาเอกอังกฤษ Part 8 (หลังจากนี้ทำ 1 ชม. แล้วไป P5 ภาคค)', link: 'https://www.facebook.com/share/v/19Mijy9p3L/' },
  // 21 ต.ค. = LIVE เลดี้ 21.00+ → VOD บ่าย หมาหอนอังคาร 2
  '2026-10-21': { cat: '🔥 หมาหอนสำคัญ', title: '🔥 หมาหอนอังคาร ครั้งที่ 2 (ภาคก ภาษาอังกฤษ 65-68) — คืนนี้มี LIVE เลดี้ 21.00+', link: 'https://www.facebook.com/share/v/1AHuH4tK4B/' },
  '2026-10-22': { cat: '🩷 P1 วิชาเอก ภาคข', title: '[Ep8.9] เก็งปี 69 วิชาเอกอังกฤษ Part 9 (ก่อนหมาหอน 28 ต.ค.)', link: 'https://www.facebook.com/share/v/1CM8ZDiAtD/' },
  '2026-10-23': { cat: '🩷 P1 วิชาเอก ภาคข + 🔥หมาหอน', title: '[Ep8.10] สรุป 155 ข้อสุดท้าย + 🔥 หมาหอนศุกร์ ครั้งที่ 2 (สมัครวันที่5 ระวัง!)', link: 'https://www.facebook.com/share/v/14NzszfJDSa/' },
  // ช่วงสมัครสอบตามกำหนดการที่หน้าเว็บอ้างอิง: ลดเวลา VOD และเผื่อเวลาตรวจเอกสาร
  '2026-10-26': { cat: '🩵 P1 รอง ภาคก อังกฤษ', title: '[Ep9.1] แหกโค้งภาคก อังกฤษ เก็งปี 69 (ล่าสุด 26 ก.ย. 69)', link: 'https://www.facebook.com/share/v/1F1niimQ2j/' },
  '2026-10-27': { cat: '🩵 P1 รอง + 🔥หมาหอน', title: '[ภาคก Ep8.1] + 🔥 หมาหอนอังคาร ครั้งที่ 3 (ภาคก 65-68)', link: 'https://www.facebook.com/share/v/1BDMWPbLYE/' },
  // 28 ต.ค. = LIVE เลดี้ 19.00-00.00 (หมาหอน3ชม.+แหกโค้ง+วิชาเอก) → VOD บ่าย หมาหอนอังคาร 4
  '2026-10-28': { cat: '🔥 หมาหอนสำคัญ', title: '🔥 หมาหอนอังคาร ครั้งที่ 4 (ภาคก 65-68) — คืนนี้ LIVE เลดี้ 19.00-00.00 3 ชม.เต็ม!', link: 'https://www.facebook.com/share/v/1aFDgRVmTk/' },
  '2026-10-29': { cat: '🩵 P1 รอง ภาคก อังกฤษ', title: '[ภาคก Ep8.2] แหกโค้งภาคก อังกฤษ เก็งปี 69 Part2', link: 'https://www.facebook.com/share/v/19GVSm2tX9/' },
  '2026-10-30': { cat: '🩵 P1 รอง + 🔥หมาหอน', title: '[ภาคก Ep8.3] + 🔥 หมาหอนศุกร์ ครั้งที่ 3', link: 'https://www.facebook.com/share/v/1Aj6NFgcPV/' },
  '2026-10-31': { cat: '🩵 P1 รอง ภาคก อังกฤษ', title: '[ภาคก Ep8.4] แหกโค้งภาคก อังกฤษ เก็งปี 69 Part4', link: 'https://www.facebook.com/share/v/19dGcPcPMc/' },
  '2026-11-01': { cat: '🩵 P1 รอง ภาคก อังกฤษ (จบก่อนเปิดเทอม!)', title: '[ภาคก Ep8.5] + [ภาคก Ep8.6] เก็งปี 69 Part5-6 (จบก่อนเปิดเทอม 2 พ.ย.!)', link: 'https://www.facebook.com/share/v/19biq1naRt/' }
}
// เปิดเทอม 2 พ.ย.+ (ช่วงคาบว่างกลางวัน 13.30-14.30) → หมาหอนศุกร์ 4-5, หมาหอนอังคาร 5, ภาคก Ep1-4 คืนหมาหอนฉบับสมบูรณ์
const LADY_VOD_QUEUE_OPEN = {
  '2026-11-02': { cat: '🔥 หมาหอน + เปิดเทอม2', title: '🔥 หมาหอนศุกร์ ครั้งที่ 4 + ทบทวนจุดผิด (เปิดเทอม 2! สอนกลับไปแล้ว)', link: 'https://www.facebook.com/share/v/1AYi9Csi1D/' },
  '2026-11-03': { cat: '🔥 หมาหอน', title: '🔥 หมาหอนศุกร์ ครั้งที่ 5 (สุดท้าย) + ทบทวน 65-68', link: 'https://www.facebook.com/share/v/19ovUV74ZP/' },
  // 4 พ.ย. = LIVE เลดี้ 19.00-00.00 → VOD กลางวัน หมาหอนอังคาร 5
  '2026-11-04': { cat: '🔥 หมาหอน (สุดท้าย!)', title: '🔥 หมาหอนอังคาร ครั้งที่ 5 (สุดท้าย) — คืนนี้มี LIVE เลดี้ 19.00-00.00', link: 'https://www.facebook.com/share/v/16xa2HNhDa/' },
  '2026-11-05': { cat: '🩵 คืนหมาหอนฉบับสมบูรณ์ 65-68', title: '[ภาคก Ep1] คืนหมาหอนฉบับสมบูรณ์ 4 ชม. ครั้งที่ 1 (23 ก.ค. 69)', link: 'https://www.facebook.com/share/v/1CWoHwCv2Y/' },
  '2026-11-06': { cat: '🩵 คืนหมาหอนฉบับสมบูรณ์ 65-68', title: '[ภาคก Ep2] คืนหมาหอนฉบับสมบูรณ์ ครั้งที่ 2 (6 ส.ค. 69)', link: 'https://www.facebook.com/share/v/1EZp9yBiCd/' },
  // 7 พ.ย. = Mock Final #1 → SKIP
  // 8-9 พ.ย. = ทบทวนจุดผิดสะสม
  '2026-11-08': { cat: '🩵 คืนหมาหอนฉบับสมบูรณ์ (จบก่อนสอบ!)', title: '[ภาคก Ep3+Ep4] คืนหมาหอนฉบับสมบูรณ์ ครั้งที่ 3+4 (จบก่อนสอบ!)', link: 'https://www.facebook.com/share/v/18BFoWAtpg/' },
  // 10 พ.ย. = Final Sprint / 11 พ.ย. = Mock Final #2 + LIVE เลดี้ 19.00-00.00
  // 12-13 พ.ย. = ทบทวนสุดท้าย / วันก่อนสอบพัก → ไม่ต้อง VOD
}
function getLadyVodForToday(iso) {
  if (LADY_VOD_QUEUE[iso]) return LADY_VOD_QUEUE[iso]
  if (LADY_VOD_QUEUE_OPEN[iso]) return LADY_VOD_QUEUE_OPEN[iso]
  return null
}

function defaultSlotsForWeekday(weekday, iso) {
  // ⚠️ ตรงตามคำสั่ง User: ปิดเทอม 9 ต.ค. (สอนวันสุดท้าย = ศุกร์ 9 ต.ค.) → เปิดเทอมอีกที 2 พ.ย.69 (จันทร์)
  // → ระหว่าง 10 ต.ค. (เสาร์) - 1 พ.ย. (อาทิตย์) = ปิดเทอมทั้งหมด 25 วันเต็ม!
  const schoolOpen = iso <= '2026-10-09' || iso >= '2026-11-02'
  const slots = []
  let sIdx = 0
  const nextId = () => `s${++sIdx}`

  const focus = getDayFocusTopic(iso)
  const anonTopic = focus.topic
  const ladyInfo = getLadyLiveInfo(iso)   // คืนค่า hasLive / hasHmahon / slots (ห้ามตัดออกอีก! วิชาเอก User เป็นคนสั่ง)
  const isMockOrRest = ['2026-11-07','2026-11-11','2026-11-12','2026-11-13'].includes(iso)

  // === ช่วงปิดเทอมทองคำ (10 ต.ค.-1 พ.ย. = 25 วัน) → เต็มที่ 3-4 ช่องต่อวัน ===
  if (!schoolOpen) {
    slots.push({ id: nextId(), time: '09.00 - 11.00', zone: 'เช้า', title: 'P2: ทบทวนเนื้อหาคืนก่อน + จดโน้ตจุดผิด', note: `อ้างอิงไลฟ์สดเมื่อคืนก่อน — เน้นเฉพาะจุดผิด ${anonTopic}`, done: false })
    slots.push({ id: nextId(), time: '11.15 - 12.15', zone: 'เช้า', title: 'P4: Quiz 1 ชุด (50-60 ข้อ) — เก็บคะแนนใน Dashboard', note: 'ดู % Trend Graph สีฟ้า — เป้าหมายเฉลี่ย ≥ 75% (สู้ๆ)', done: false })
    const ladyVod = getLadyVodForToday(iso)
    if (iso === '2026-10-12') {
      slots.push({ id: nextId(), time: '13.30 - 15.00', zone: 'บ่าย', title: 'P3: ตรวจประกาศอัตรารับสมัคร (ถ้ามี)', note: 'เปรียบเทียบเฉพาะคุณสมบัติและจำนวนอัตราที่หน่วยงานประกาศอย่างเป็นทางการ', done: false })
    } else if (iso >= '2026-10-20' && iso <= '2026-10-23') {
      slots.push({ id: nextId(), time: '13.30 - 14.30', zone: 'บ่าย', title: 'P5: ภาค ค ประวัติ+ผลงาน 1 ชม. (มีคนช่วยทำ)', note: 'Portfolio + ใบประกาศนียบัตรจัดหมวด', done: false })
      if (ladyVod) slots.push({ id: nextId(), time: '14.45 - 15.45', zone: 'บ่าย', title: `${ladyVod.cat} ${ladyVod.title}`, note: '1 ชม. VOD เลยนะ — ถ้าไม่หมด คืนต่อ', done: false, _link: ladyVod.link, _linkExternal: true })
    } else if (ladyVod) {
      slots.push({ id: nextId(), time: '13.30 - 15.00', zone: 'บ่าย', title: `${ladyVod.cat} ${ladyVod.title}`, note: '1.5 ชม. MAX ห้าม 5-6 ชม. — ถ้ายาวจบก่อนเล่นอย่างเดียว ข้ามส่วนที่ซ้ำ! 📂 กดตรงนี้ ไปตรงคลิปเลย ไม่ต้องค้นหาในกลุ่ม', done: false, _link: ladyVod.link, _linkExternal: true })
    } else {
      slots.push({ id: nextId(), time: '13.30 - 15.00', zone: 'บ่าย', title: ladyInfo.hasLive ? 'P2: เลดี้เก๋ — ดูย้อนหลัง 1 EP (วิชาเอกอังกฤษ Grammar/Reading)' : 'P2: เลดี้เก๋ — ดูย้อนหลัง 1 EP (ถ้ามีเวลา)', note: ladyInfo.hasLive ? 'คืนนี้มี LIVE เลดี้ 21.00+ ดังนั้นช่วงบ่ายดูย้อนหลัง 1 EP (1.5 ชม. MAX ห้าม 5-6 ชม.)' : 'เน้นเฉพาะจุดอ่อนของตัวเอง', done: false, _link: ladyInfo.hasLive ? LADY_ANNOUNCEMENTS_URL : undefined, _linkExternal: !!ladyInfo.hasLive })
    }
  } else if (iso === '2026-10-09') {
    slots.push({ id: nextId(), time: '13.30 - 14.30', zone: 'กลางวัน', title: `P3: อ่านนำหน้า ${anonTopic} (ก่อนติวสดคืนนี้ อ.นนท์ 20.00)`, note: 'วันศุกร์ 9 ต.ค. = สอนครั้งสุดท้าย! ช่วงกลางวันอ่านนำหน้าเบาๆ 1 ชม.', done: false })
    slots.push({ id: nextId(), time: '17.15 - 18.15', zone: 'คืน', title: '📣 ทบทวนรอบสุดท้ายก่อนเข้าปิดเทอม 25 วัน', note: 'จดสรุปสิ่งที่ยังไม่เข้าใจ → จะได้แก้ต่อในช่วงปิดเทอมทองคำ!', done: false })
  }

  if (schoolOpen && iso !== '2026-10-09') {
    const ladyVodOpen = getLadyVodForToday(iso)
    if (ladyVodOpen) slots.push({ id: nextId(), time: '13.30 - 14.30', zone: 'กลางวัน', title: `${ladyVodOpen.cat} ${ladyVodOpen.title}`, note: 'คาบว่างกลางวัน! 1 ชม. VOD เท่านั้น — ถ้ายาวจบก่อนเล่นอย่างเดียว ข้ามส่วนที่ซ้ำ! 📂 กดตรงนี้ ไปตรงคลิปเลย', done: false, _link: ladyVodOpen.link, _linkExternal: true })
    slots.push({ id: nextId(), time: '17.15 - 18.15', zone: 'คืน', title: `P3: อ่านนำหน้า ${anonTopic} (ก่อนติวสดคืนนี้)`, note: `อ่าน 1-2 หัวข้อเบื้องต้น — เวลาติวสดจะจดไว้ได้เร็วขึ้น (2 พ.ย. เปิดเทอม 2 แล้วนะ!)`, done: false })
  }

  // === P1 คืน: ห้ามผสมติวเตอร์กับวิชา ===
  // - โฟกัสอังกฤษ/หมาหอน/แหกโค้ง → เลดี้เก๋เก๋เท่านั้น (ไม่มีอ.นนท์หัวข้ออังกฤษ)
  // - โฟกัสไทย/คณิต → ทบทวนเอง (YouTube) ไม่ติดป้ายอ.นนท์
  // - โฟกัสการศึกษา/กฎหมาย/ข้าราชการที่ดี → อ.นนท์
  // - วันที่มี LIVE เลดี้: อ.นนท์ได้เฉพาะหัวข้อของนนท์ (ถ้ามี) 1 ชม. แล้วสลับเลดี้

  if (!isMockOrRest && ladyInfo.hasLive) {
    if (focus.owner === 'nonn') {
      slots.push({
        id: nextId(),
        time: '20.00 - 21.00',
        zone: 'คืน',
        title: `🔴 [P1 รอง] LIVE อ.นนท์ VIP (1 ชม.แรก): ${anonTopic}  [จากนั้นสลับ!]`,
        note: 'อ.นนท์เฉพาะวิชาของนนท์ — 21.00 สลับไป LIVE เลดี้เก๋เก๋ (อังกฤษ)',
        done: false,
        _link: ANON_ANNOUNCEMENTS_URL,
        _linkExternal: true,
      })
    } else if (focus.owner === 'self') {
      slots.push({
        id: nextId(),
        time: '20.00 - 21.00',
        zone: 'คืน',
        title: `📺 ทบทวน ${anonTopic} (ก่อน LIVE เลดี้)`,
        note: 'ไม่ใช่ไลฟ์อ.นนท์ — ทบทวนเองแล้วสลับไปเลดี้เก๋เก๋',
        done: false,
      })
    }
    for (const s of ladyInfo.slots) {
      slots.push({ ...s, id: nextId(), title: '🔴 [เลดี้เก๋เก๋] ' + s.title.replace('🔴 LIVE! ', ''), note: (s.note || '') + ' | ตรวจประกาศล่าสุดจากผู้เผยแพร่ก่อนรับชม' })
    }
  } else if (!isMockOrRest) {
    if (focus.owner === 'lady') {
      const ladyVod = getLadyVodForToday(iso)
      slots.push({
        id: nextId(),
        time: '20.00 - 22.00',
        zone: 'คืน',
        title: ladyVod
          ? `🔴 [เลดี้เก๋เก๋] ${ladyVod.cat} ${ladyVod.title}`
          : `🔴 [เลดี้เก๋เก๋] ทบทวน/ย้อนหลัง · ${anonTopic}`,
        note: 'ภาษาอังกฤษภาค ก/ข เป็นของครูเลดี้เก๋เก๋เท่านั้น — ไม่ใช่อ.นนท์',
        done: false,
        _link: ladyVod?.link || LADY_ANNOUNCEMENTS_URL,
        _linkExternal: true,
      })
    } else if (focus.owner === 'self') {
      slots.push({
        id: nextId(),
        time: '20.00 - 22.00',
        zone: 'คืน',
        title: `📺 ทบทวน ${anonTopic} (YouTube / คลังหลักสูตร)`,
        note: 'ภาษาไทยและคณิตใช้คลิปในคลัง — ไม่ติดป้ายไลฟ์อ.นนท์',
        done: false,
      })
    } else {
      slots.push({
        id: nextId(),
        time: '20.00 - 22.00',
        zone: 'คืน',
        title: `🔴 LIVE อ.นนท์ VIP: ${anonTopic}`,
        note: 'อ.นนท์: วิชาการศึกษา / กฎหมาย / ข้าราชการที่ดี — ตรวจวันเวลาจากกลุ่มผู้เผยแพร่',
        done: false,
        _link: ANON_ANNOUNCEMENTS_URL,
        _linkExternal: true,
      })
    }
  }

  // Slots พิเศษสำหรับ Mock, การสมัคร และการทบทวนก่อนสอบ
  if (iso === '2026-11-07') {
    return [
      { id: nextId(), time: '08.00 - 10.30', zone: 'เช้า', title: '🔥 Mock Final #1 — ภาค ก (200 คะแนน) จับเวลา 2.5 ชม.', note: 'ห้ามหยุด! เหมือนสอบจริงที่สุด', done: false },
      { id: nextId(), time: '13.00 - 14.30', zone: 'บ่าย', title: '🔥 Mock Final #1 — ภาค ข (วิชาการศึกษา 50 + วิชาเอก 50 = 100)', note: 'รวม 100 คะแนน เป้าหมาย ≥ 85', done: false },
      { id: nextId(), time: '15.00 - 17.00', zone: 'บ่าย', title: 'ตรวจเฉลย + โน้ตจุดผิด 2 ชม.', note: 'จดเฉพาะข้อผิดแล้วอ่านซ้ำ 2 รอบ', done: false }
    ]
  }
  if (iso === '2026-11-11') {
    return [
      { id: nextId(), time: '09.00 - 11.30', zone: 'เช้า', title: '🔥 Mock Final #2 — ภาค ก (200 คะแนน) ใหม่ทั้งชุด', note: 'ใช้ข้อสอบปี 2568 รอบทั่วไปที่คุณทำไป 150-160', done: false },
      { id: nextId(), time: '13.00 - 14.30', zone: 'บ่าย', title: 'ตรวจเฉลย + เปรียบเทียบ Mock 1 vs Mock 2', note: 'ดูว่าจุดไหนเพิ่มขึ้น — เก็บใน Dashboard', done: false },
      { id: nextId(), time: '15.00 - 16.30', zone: 'บ่าย', title: 'P1: ทบทวนจุดผิดสะสม 2 เดือน', note: 'อ่านแค่ Notebook จุดผิด ไม่ต้องหาข้อใหม่', done: false },
      { id: nextId(), time: '20.00 - 21.00', zone: 'คืน', title: `🔴 [P1 รอง] LIVE อ.นนท์ VIP (1 ชม.แรก)  [จากนั้นสลับ!]`, note: '⚠️ จำกัด 1 ชม.เท่านั้น! 21.00 ต้องสลับไป LIVE เลดี้เก๋ (วิชาเอกสูงสุด)', done: false, _link: ANON_ANNOUNCEMENTS_URL, _linkExternal: true },
      ...ladyInfo.slots.map(s => ({ ...s, id: nextId(), title: '🔴 [P1 สูงสุด! วิชาเอก] ' + s.title.replace('🔴 LIVE! ',''), note: (s.note || '') + ' | ⭐⭐⭐ ห้ามพลาดเด็ดขาด! (11 พ.ย. = LIVE ครั้งสุดท้ายก่อนสอบ 14 พ.ย.)' }))
    ]
  }
  if (iso === '2026-11-12') {
    return [
      { id: nextId(), time: '09.00 - 11.00', zone: 'เช้า', title: 'P1: ภาค ก — รายการจุดผิดสุดท้าย (ข้อสอบ 2 ปีล่าสุด)', note: '67 / 68 — ห้ามพลาดจุดเดิม', done: false },
      { id: nextId(), time: '13.00 - 14.30', zone: 'บ่าย', title: 'P2: วิชาการศึกษา + จิตวิทยา — ทบทวนสูตร', note: '8 คุณลักษณะ / หลักสูตร 62 / ทฤษฎีเรียนรู้', done: false },
      { id: nextId(), time: '15.00 - 16.30', zone: 'บ่าย', title: 'P1: วิชาเอกอังกฤษ — Grammar + Method สุดท้าย', note: 'วิธีการสอน 4 แบบ + Tense 12', done: false },
      { id: nextId(), time: '20.00 - 21.30', zone: 'คืน', title: '🔴 [P1] LIVE อ.นนท์ VIP: สรุปข้อสอบสุดท้ายก่อนสอบ 1.5 ชม.', note: '⭐⭐⭐ ห้ามพลาด! ฟังสรุปท้ายคอร์ส + ข้อควรระวังวันสอบ (ตัดเหลือ 1.5 ชม. แล้วนอนเร็ว)', done: false, _link: ANON_ANNOUNCEMENTS_URL, _linkExternal: true }
    ]
  }
  if (iso === '2026-11-13') {
    return [
      { id: nextId(), time: '09.00 - 10.00', zone: 'เช้า', title: '🧘 พักผ่อน — อ่าน Notebook จุดผิดเบาๆ 1 หน้า', note: 'ห้ามอ่านหนังสือหนัก! หัวร้อนวันสอบไม่ดี', done: false },
      { id: nextId(), time: '13.00 - 14.00', zone: 'กลางวัน', title: 'ตรวจสอบเอกสารวันสอบ: บัตร ปชช. + ใบสมัคร + ปากกา 2 ด้าม', note: 'ห้ามลืม!', done: false },
      { id: nextId(), time: '21.00 - 22.00', zone: 'คืน', title: '😴 พักผ่อนและเตรียมตัวสำหรับวันสอบ', note: 'เตรียมเอกสารที่จำเป็น พักผ่อนให้เพียงพอ และยึดเกณฑ์ประเมินของหน่วยงาน', done: false }
    ]
  }

  if (iso >= '2026-10-20' && iso <= '2026-10-23' && weekday >= 1 && weekday <= 4) {
    const add = { id: `s${Date.now()}_reg`, time: '15.00 - 15.30', zone: 'กลางวัน', title: '📝 ตรวจเอกสารและสถานะใบสมัคร', note: 'ตรวจคุณสมบัติ เอกสาร และประกาศจากหน่วยงาน หากข้อมูลพร้อมให้ดำเนินการภายในกำหนด ไม่ควรรอจนวันสุดท้าย', done: false }
    if (slots.length >= 2) slots.splice(2, 0, add)
    else slots.push(add)
  }
  if (iso === '2026-10-19') {
    slots.unshift({ id: nextId(), time: '17.30 - 18.00', zone: 'บ่าย', title: '📝 ตรวจประกาศและเตรียมยื่นสมัคร', note: 'ยืนยันวันและเวลารับสมัครจากประกาศทางการ ตรวจข้อมูลและเอกสารให้ครบ และยื่นภายในกำหนดโดยไม่รอวันท้าย', done: false })
  }

  if (iso === '2026-10-12') {
    slots.unshift(
      { id: nextId(), time: '08.00 - 09.30', zone: 'เช้า', title: 'ตรวจประกาศรับสมัครและอัตราที่หน่วยงานเผยแพร่', note: 'เปิดอ่านประกาศต้นทาง หากยังไม่มีประกาศให้รอข้อมูลยืนยัน ไม่ใช้ตัวเลขคาดการณ์แทนจำนวนอัตราจริง', done: false },
      { id: nextId(), time: '09.45 - 12.00', zone: 'เช้า', title: 'P1: Mock ปี 67 ภาค ก (200 คะแนน) — ทำครึ่งแรก 2 ชม.15 นาที', note: 'วันจันทร์ 12 ต.ค. ปิดเทอมอยู่! ไม่ต้องไปสอน (ระบบ schoolOpen ผิดเดิม ตอนนี้ถูกแล้ว!)', done: false }
    )
  }

  if (iso === '2026-10-24') {
    // โฟกัสวัน = คณิต (self) — ห้ามติดป้ายอ.นนท์; คืนมีเลดี้ถ้ามี LIVE
    return [
      { id: nextId(), time: '08.00 - 09.30', zone: 'เช้า', title: 'ตรวจยอดผู้สมัครในระบบ (ถ้ามีข้อมูลแสดง)', note: 'บันทึกจำนวนผู้สมัครและเวลาที่ตรวจไว้เป็นข้อมูลประกอบ ไม่ใช่การคาดการณ์โอกาสสอบติด', done: false },
      { id: nextId(), time: '09.45 - 11.15', zone: 'เช้า', title: 'ทบทวนคุณสมบัติและประกาศของเขตที่สนใจ', note: 'เทียบคุณสมบัติ เอกสาร อัตราที่ประกาศ และความพร้อมส่วนตัว โดยยึดข้อมูลจากหน่วยงานต้นทาง', done: false },
      { id: nextId(), time: '13.30 - 14.30', zone: 'กลางวัน', title: 'ยื่นหรือยืนยันใบสมัครภายในกำหนด', note: 'ตรวจความถูกต้องของข้อมูลและเอกสารก่อนส่ง ไม่ควรรอจนใกล้ปิดระบบ', done: false },
      { id: nextId(), time: '15.00 - 16.00', zone: 'บ่าย', title: 'บันทึกหลักฐานและตรวจสถานะใบสมัคร', note: 'ดาวน์โหลด/เก็บหลักฐานการส่ง และตรวจสถานะตามช่องทางที่ประกาศระบุ', done: false },
      { id: nextId(), time: '20.00 - 21.00', zone: 'คืน', title: '📺 ทบทวนคณิต/ตัวเลขและเหตุผล (ก่อน LIVE เลดี้)', note: 'คณิตไม่ใช่ไลฟ์อ.นนท์ — ใช้คลิปในคลังหลักสูตร', done: false },
      ...(ladyInfo.hasLive ? ladyInfo.slots.map(s => ({ ...s, id: nextId(), title: '🔴 [เลดี้เก๋เก๋] ' + s.title.replace('🔴 LIVE! ', ''), note: (s.note || '') + ' | สมัครเสร็จสบายใจ! ฟังเลดี้เก๋เก๋ ให้เต็มที่' })) : [])
    ]
  }

  if (iso === '2026-10-25') {
    return [
      { id: nextId(), time: '09.00 - 10.00', zone: 'เช้า', title: '🔍 ตรวจสถานะการสมัครและหลักฐาน', note: 'ยืนยันการส่งใบสมัครและเก็บหลักฐาน หากพบปัญหาให้ติดต่อหน่วยงานตามช่องทางในประกาศ', done: false },
      { id: nextId(), time: '14.00 - 15.00', zone: 'บ่าย', title: '⏳ ตรวจอีเมลและข้อความยืนยัน', note: 'ยึดวันและเวลาปิดรับสมัครตามประกาศ ไม่ควรรอแก้ปัญหาจนใกล้เวลาปิดระบบ', done: false },
      { id: nextId(), time: '20.00 - 22.00', zone: 'คืน', title: '🔴 LIVE อ.นนท์ VIP: ทบทวนรวมเนื้อหาทั้งหมด + พักใจ 2 ชม.', note: 'สมัครเสร็จแล้ว — อ.นนท์เฉพาะวิชาของนนท์ (การศึกษา/กฎหมาย/ข้าราชการที่ดี)', done: false, _link: ANON_ANNOUNCEMENTS_URL, _linkExternal: true }
    ]
  }

  return slots
}

function generateTimetable() {
  const result = []
  const start = new Date(2026, 9, 6)   // 6 ต.ค. 2569 = วันนี้! (ก่อนปิดเทอม อังคาร)
  const end = new Date(2026, 10, 13)   // 13 พ.ย. 2569
  let cursor = new Date(start.getTime())
  let dayIdx = 0

  while (cursor <= end) {
    dayIdx++
    const iso = `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-${pad(cursor.getDate())}`
    const label = formatThaiLabel(cursor)
    const tag = getTag(cursor, iso)
    const weekday = cursor.getDay()
    const slots = defaultSlotsForWeekday(weekday, iso)
    const monthShort = cursor.getMonth() === 9 ? 'oct' : 'nov'
    result.push({
      id: `d-${monthShort}${cursor.getDate()}-${dayIdx}`,
      date: iso,
      label,
      tag,
      slots
    })
    cursor = new Date(cursor.getTime() + 86400000)
  }
  return result
}

const seedTimetable = generateTimetable()

const zoneColors = {
  'เช้า': { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: Sun },
  'กลางวัน': { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Coffee },
  'บ่าย': { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: Coffee },
  'คืน': { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', icon: Moon }
}

export default function Timetable() {
  const {
    schedule,
    setSchedule,
    ensureSessionsFromSeed,
    toggleSession,
    updateSessionNote,
    deleteSession,
    addSession,
  } = useScheduleStore()
  const [addMode, setAddMode] = useState(null)
  const [addError, setAddError] = useState('')
  const [newSlot, setNewSlot] = useState({ time: '', zone: 'คืน', title: '', note: '', _link: '', _linkExternal: false })

  useEffect(() => {
    ensureSessionsFromSeed(seedTimetable)
  }, [ensureSessionsFromSeed])

  // One-time rewrite of outdated registration hard-rule copy (preserves slot ids).
  useEffect(() => {
    setSchedule((previous) => {
      let changed = false
      const sessions = previous.sessions.map((session) => {
        if (session.date < '2026-10-19' || session.date > '2026-10-25') return session
        const content = `${session.title || ''} ${session.note || ''}`
        if (!/^s\d+(?:_reg)?$/.test(String(session.id)) || !/HARD RULE|ห้ามกดยื่นสมัคร|ยื่นรอ 24 ต\.ค\.|รอ 24 ต\.ค\.|Server ปิด 18\.00|ถ้ายังไม่ได้ยื่น/.test(content)) {
          return session
        }
        changed = true
        return {
          ...session,
          title: 'ตรวจเอกสารและสถานะใบสมัคร',
          note: 'ยึดประกาศและเวลารับสมัครจากหน่วยงาน ตรวจข้อมูลให้ครบและยื่นภายในกำหนด ไม่ควรรอจนวันสุดท้าย',
        }
      })
      return changed ? { ...previous, sessions } : previous
    })
  }, [setSchedule])

  const tt = useMemo(
    () => timetableDaysFromSessions(schedule.sessions, seedTimetable),
    [schedule.sessions]
  )

  const toggleSlot = (_dayId, slotId) => {
    toggleSession(slotId)
  }

  const updateNote = (_dayId, slotId, value) => {
    updateSessionNote(slotId, value)
  }

  const deleteSlot = (_dayId, slotId) => {
    if (!confirm('ลบตารางนี้ใช่ไหม?')) return
    deleteSession(slotId)
  }

  const saveNewSlot = (dayId) => {
    if (!newSlot.time.trim() || !newSlot.title.trim()) return
    const day = tt.find(d => d.id === dayId)
    if (!day) return
    const linkRaw = (newSlot._link || '').trim()
    const link = linkRaw && /^https?:\/\//i.test(linkRaw) ? linkRaw : ''
    const result = addSession({
      date: day.date,
      time: newSlot.time.trim(),
      zone: newSlot.zone,
      title: newSlot.title.trim(),
      note: newSlot.note.trim(),
      ...(link ? { _link: link, _linkExternal: newSlot._linkExternal } : {}),
      dayLabel: day.label,
      dayTag: day.tag,
      timetableDayId: day.id,
      origin: 'user',
    })
    if (!result.ok) {
      setAddError('ช่วงเวลานี้ทับกับตารางที่มีอยู่แล้ว หรือเวลาไม่ถูกต้อง')
      return
    }
    setAddError('')
    setNewSlot({ time: '', zone: 'คืน', title: '', note: '', _link: '', _linkExternal: false })
    setAddMode(null)
  }

  const totalDone = useMemo(() => tt.reduce((sum, d) => sum + d.slots.filter(s => s.done).length, 0), [tt])
  const totalSlots = useMemo(() => tt.reduce((sum, d) => sum + d.slots.length, 0), [tt])
  const pct = totalSlots > 0 ? Math.round((totalDone / totalSlots) * 100) : 0
  const htmlDone = useMemo(
    () => schedule.tasks.filter(t => String(t.id).startsWith('html_') && t.status === 'done').length,
    [schedule.tasks]
  )
  const htmlTotal = useMemo(
    () => schedule.tasks.filter(t => String(t.id).startsWith('html_')).length,
    [schedule.tasks]
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary-600" />
            ตารางติวรายวัน
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            ตารางนี้เป็นแผนส่วนตัว ลิงก์และเวลาไลฟ์อาจเปลี่ยน โปรดตรวจประกาศจากผู้จัดก่อนรับชม
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="badge bg-primary-100 text-primary-700 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ตาราง {totalDone}/{totalSlots} ({pct}%)
          </span>
          <span className="badge bg-slate-100 text-slate-700 inline-flex items-center gap-1 dark:bg-slate-800 dark:text-slate-200">
            แผน 34 วัน {htmlDone}/{htmlTotal}
          </span>
        </div>
      </div>

      <div className="card p-4 bg-gradient-to-r from-primary-50 to-indigo-50 border-primary-100">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            เริ่ม 6 ต.ค. 69 (วันนี้!) → สอบ 14-15 พ.ย. 69 (เหลือ ~40 วัน)
          </p>
      </div>

      <div className="space-y-4">
        {tt.map(day => {
          const doneDay = day.slots.filter(s => s.done).length
          const totalDay = day.slots.length
          const pctDay = totalDay > 0 ? Math.round((doneDay / totalDay) * 100) : 0

          return (
            <div key={day.id} className="card border-2 border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between gap-3 flex-wrap pb-4 mb-2 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold flex-col leading-none">
                    <div className="text-[10px] font-normal opacity-90">
                      {day.label.split(' ').slice(0, 1).join('')}
                    </div>
                    <div className="text-lg -mt-0.5">
                      {day.label.split(' ').slice(1, 2).join('').replace('ต.ค.', '')}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800 dark:text-slate-200">{day.label}</h3>
                      <span className="badge bg-pink-100 text-pink-700">{day.tag}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      เสร็จแล้ว {doneDay}/{totalDay} ({pctDay}%)
                    </div>
                  </div>
                </div>
                <button onClick={() => setAddMode(addMode === day.id ? null : day.id)} className="btn-secondary text-xs">
                  <Plus className="w-3.5 h-3.5" />
                  {addMode === day.id ? 'ยกเลิก' : 'เพิ่มตาราง'}
                </button>
              </div>

              {addMode === day.id && (
                <div className="p-4 rounded-xl bg-primary-50/70 border border-primary-100 mb-4 space-y-3 grid grid-cols-1 md:grid-cols-12 gap-3">
                  {addError && (
                    <div className="md:col-span-12 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                      {addError}
                    </div>
                  )}
                  <div className="md:col-span-3">
                    <label className="label text-xs">ช่วงเวลา</label>
                    <input
                      value={newSlot.time}
                      onChange={e => setNewSlot(p => ({ ...p, time: e.target.value }))}
                      placeholder="เช่น 19.00 - 21.00"
                      className="input text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label text-xs">ช่วง</label>
                    <select value={newSlot.zone} onChange={e => setNewSlot(p => ({ ...p, zone: e.target.value }))} className="input text-xs">
                      <option value="เช้า">เช้า</option>
                      <option value="กลางวัน">กลางวัน</option>
                      <option value="บ่าย">บ่าย</option>
                      <option value="คืน">คืน</option>
                    </select>
                  </div>
                  <div className="md:col-span-7">
                    <label className="label text-xs">หัวข้อที่จะติว *</label>
                    <input
                      value={newSlot.title}
                      onChange={e => setNewSlot(p => ({ ...p, title: e.target.value }))}
                      placeholder="เช่น P1: ฝึกคิดวิเคราะห์ 100 ข้อ"
                      className="input text-xs"
                    />
                  </div>
                  <div className="md:col-span-12">
                    <label className="label text-xs">โน้ตเพิ่มเติม</label>
                    <input
                      value={newSlot.note}
                      onChange={e => setNewSlot(p => ({ ...p, note: e.target.value }))}
                      className="input text-xs"
                    />
                  </div>
                  <div className="md:col-span-8">
                    <label className="label text-xs">📂 ลิงก์เฉพาะช่องนี้ (ใส่ URL ที่จะเปิดเมื่อกด — ถ้ามี)</label>
                    <input
                      value={newSlot._link}
                      onChange={e => setNewSlot(p => ({ ...p, _link: e.target.value }))}
                      placeholder="เช่น https://www.facebook.com/groups/xxx/posts/yyy หรือ https://docs.google.com/..."
                      className="input text-xs"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="label text-xs">ประเภทลิงก์</label>
                    <select
                      value={newSlot._linkExternal ? 'ext' : 'int'}
                      onChange={e => setNewSlot(p => ({ ...p, _linkExternal: e.target.value === 'ext' }))}
                      className="input text-xs"
                    >
                      <option value="int">ภายในเว็บเรา (/plan, /quiz ฯลฯ)</option>
                      <option value="ext">ภายนอก (FB/Google/Youtube)</option>
                    </select>
                  </div>
                  <div className="md:col-span-12 flex justify-end gap-2">
                    <button onClick={() => setAddMode(null)} className="btn-secondary text-xs">ยกเลิก</button>
                    <button onClick={() => saveNewSlot(day.id)} className="btn-primary text-xs">
                      <Save className="w-3.5 h-3.5" /> บันทึก
                    </button>
                  </div>
                </div>
              )}

              <ul className="space-y-2">
                {day.slots.length === 0 ? (
                  <li className="p-6 text-center text-sm text-gray-400 dark:text-slate-500">ยังไม่มีตารางในวันนี้ — กด "เพิ่มตาราง" ขวามือนะครับ</li>
                ) : (
                  day.slots.map(s => {
                    const z = zoneColors[s.zone] || zoneColors['คืน']
                    const Icon = z.icon
                    const actions = detectSlotAction(s)
                    return (
                      <li key={s.id} className={`rounded-xl border ${z.border} ${z.bg} p-3`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleSlot(day.id, s.id)}
                            className={`mt-0.5 flex-shrink-0 ${s.done ? 'text-success-600' : 'text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400'}`}
                            title={s.done ? 'คลิกเพื่อยกเลิก' : 'คลิกเพื่อทำเครื่องหมายทำแล้ว'}
                          >
                            {s.done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`badge ${z.badge} text-[10px] inline-flex items-center gap-0.5`}>
                                <Icon className="w-3 h-3" />
                                {s.zone} · {s.time}
                              </span>
                            </div>
                            <div className={`font-semibold text-sm ${s.done ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-200'}`}>
                              {s.title}
                            </div>
                            <textarea
                              value={s.note || ''}
                              onChange={e => updateNote(day.id, s.id, e.target.value)}
                              rows="1"
                              placeholder="จดโน้ตระหว่างติว... (บันทึกอัตโนมัติ)"
                              className="mt-1.5 w-full text-xs text-gray-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 border border-white dark:border-slate-700 focus:border-gray-300 dark:focus:border-slate-600 rounded-md px-2 py-1 resize-none focus:outline-none"
                            />
                            {actions.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {actions.map((a, i) => {
                                  const IconComp = a.icon === 'ExternalLink' ? ExternalLink : a.icon === 'PlayCircle' ? PlayCircle : FolderOpen
                                  const base = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all'
                                  const style = a.external
                                    ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800'
                                    : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100 hover:text-primary-800'
                                  if (a.external) {
                                    return (
                                      <a key={i} href={a.href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className={`${base} ${style}`}>
                                        <IconComp className="w-3 h-3" /> {a.label}
                                      </a>
                                    )
                                  }
                                  return (
                                    <Link key={i} to={a.href} onClick={e => e.stopPropagation()} className={`${base} ${style}`}>
                                      <IconComp className="w-3 h-3" /> {a.label}
                                    </Link>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deleteSlot(day.id, s.id)}
                            className="text-gray-300 dark:text-slate-600 hover:text-red-500 flex-shrink-0 mt-1"
                            title="ลบตาราง"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })
                )}
              </ul>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pctDay}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Timetable afternoon-slot copy for Lady VOD / announcements.
 * Never claims confirmed replay from a bare URL.
 */

import {
  replayEvidenceStatus,
  replayStatusLabelTh,
} from './liveConflictAdvisor.js'

/**
 * @param {{ hasLive: boolean, announcementsUrl?: string }} opts
 */
export function ladyAfternoonFallbackCopy(opts) {
  const hasLive = Boolean(opts?.hasLive)
  const url = String(opts?.announcementsUrl || '').trim()
  const status = hasLive && url
    ? replayEvidenceStatus({ resourceUrl: url })
    : 'none'
  const label = replayStatusLabelTh(status)
  return {
    title: hasLive
      ? `P2: เลดี้เก๋ — ${label} (วิชาเอกอังกฤษ Grammar/Reading)`
      : `P2: เลดี้เก๋ — ทบทวนจุดอ่อน (${label})`,
    note: hasLive
      ? `คืนนี้มี LIVE เลดี้ 21.00+ · ช่วงบ่ายมีลิงก์ประกาศกลุ่ม แต่${label} · 1.5 ชม. MAX ห้าม 5-6 ชม.`
      : 'เน้นเฉพาะจุดอ่อนของตัวเอง — ห้ามสรุปว่ามี replay จากลิงก์เปล่า',
    _replayStatus: status,
    _link: hasLive && url ? url : undefined,
    _linkExternal: Boolean(hasLive && url),
  }
}

/**
 * Evening lady review slot when there is no confirmed live block.
 * Keeps the activity; never claims confirmed replay from announcements/queue URL alone.
 * @param {{ topic: string, clip?: { cat: string, title: string, link?: string } | null, announcementsUrl?: string }} opts
 */
export function ladyEveningReviewCopy(opts) {
  const topic = String(opts?.topic || '').trim() || 'จุดอ่อน'
  const clip = opts?.clip || null
  const announcementsUrl = String(opts?.announcementsUrl || '').trim()
  if (clip) {
    const link = String(clip.link || '').trim() || announcementsUrl || undefined
    return {
      title: `🔴 [เลดี้เก๋เก๋] ${clip.cat} ${clip.title}`,
      note: 'ภาษาอังกฤษภาค ก/ข เป็นของครูเลดี้เก๋เก๋เท่านั้น — ไม่ใช่อ.นนท์ · มีลิงก์ในคิวแต่ยังไม่ยืนยันว่าเป็น replay',
      _replayStatus: link ? replayEvidenceStatus({ resourceUrl: link }) : 'none',
      _link: link,
      _linkExternal: Boolean(link),
    }
  }
  const link = announcementsUrl || undefined
  return {
    title: `🔴 [เลดี้เก๋เก๋] ทบทวนจุดอ่อน · ${topic}`,
    note: 'ภาษาอังกฤษภาค ก/ข เป็นของครูเลดี้เก๋เก๋เท่านั้น — ไม่ใช่อ.นนท์ · ลิงก์ประกาศกลุ่มยังไม่ยืนยันว่าเป็น replay',
    _replayStatus: link ? replayEvidenceStatus({ resourceUrl: link }) : 'none',
    _link: link,
    _linkExternal: Boolean(link),
  }
}

/**
 * Annotate a queued clip row that has a share URL but no confirmed replay evidence.
 * Avoids "VOD/ดูย้อนหลัง" wording that implies confirmed replay from URL alone.
 * @param {{ cat: string, title: string, link?: string }} vod
 * @param {{ durationNote?: string }} [opts]
 */
export function ladyVodSlotCopy(vod, opts = {}) {
  const link = String(vod?.link || '').trim()
  const status = link
    ? replayEvidenceStatus({ resourceUrl: link })
    : 'none'
  const label = replayStatusLabelTh(status)
  const durationNote = opts.durationNote
    || 'คิวคลิปในแผน · 1.5 ชม. MAX — ถ้ายาวจบก่อนเล่นอย่างเดียว ข้ามส่วนที่ซ้ำ'
  return {
    title: `${vod.cat} ${vod.title}`,
    note: `${durationNote} · ${label}`,
    _replayStatus: status,
    _link: link || undefined,
    _linkExternal: Boolean(link),
  }
}

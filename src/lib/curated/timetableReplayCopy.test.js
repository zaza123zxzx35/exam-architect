import { describe, expect, it } from 'vitest'
import {
  ladyAfternoonFallbackCopy,
  ladyEveningReviewCopy,
  ladyVodSlotCopy,
} from './timetableReplayCopy.js'
import { replayStatusLabelTh } from './liveConflictAdvisor.js'

const ANNOUNCE = 'https://www.facebook.com/groups/152029819565529/announcements'

describe('timetableReplayCopy', () => {
  it('does not hard-code ดูย้อนหลัง for announcements-only live days', () => {
    const slot = ladyAfternoonFallbackCopy({ hasLive: true, announcementsUrl: ANNOUNCE })
    expect(slot.title).not.toMatch(/ดูย้อนหลัง/)
    expect(slot.title).toMatch(/ลิงก์ยังไม่ยืนยันว่าเป็น replay/)
    expect(slot._replayStatus).toBe('unconfirmed_link')
    expect(slot.note).toMatch(/ยังไม่ยืนยัน/)
  })

  it('does not claim replay when there is no link', () => {
    const slot = ladyAfternoonFallbackCopy({ hasLive: false })
    expect(slot.title).not.toMatch(/ดูย้อนหลังได้/)
    expect(slot._replayStatus).toBe('none')
    expect(slot._link).toBeUndefined()
    expect(replayStatusLabelTh('none')).toBe('ยังไม่มีหลักฐาน replay')
  })

  it('labels queued clip share links as unconfirmed until evidence exists', () => {
    const slot = ladyVodSlotCopy({
      cat: '🩷 P1',
      title: '[Ep7] test',
      link: 'https://www.facebook.com/share/v/1LsYAqk1No/',
    })
    expect(slot._replayStatus).toBe('unconfirmed_link')
    expect(slot.note).toMatch(/ลิงก์ยังไม่ยืนยันว่าเป็น replay/)
    expect(slot.note).not.toMatch(/\bVOD\b/)
    expect(slot.title).not.toMatch(/ดูย้อนหลัง/)
  })

  it('uses confirmed label only when replay evidence is confirmed', () => {
    expect(replayStatusLabelTh('confirmed')).toMatch(/ยืนยันแล้ว/)
  })

  it('evening lady review keeps the slot but does not claim confirmed replay from URL', () => {
    const fallback = ladyEveningReviewCopy({
      topic: 'หมาหอน',
      announcementsUrl: ANNOUNCE,
    })
    expect(fallback.title).toMatch(/ทบทวนจุดอ่อน/)
    expect(fallback.title).not.toMatch(/ทบทวน\/ย้อนหลัง|ดูย้อนหลัง/)
    expect(fallback.note).toMatch(/ยังไม่ยืนยันว่าเป็น replay/)
    expect(fallback._replayStatus).toBe('unconfirmed_link')
    expect(fallback._link).toBe(ANNOUNCE)

    const queued = ladyEveningReviewCopy({
      topic: 'หมาหอน',
      clip: { cat: '🩷 P1', title: '[Ep7] test', link: 'https://www.facebook.com/share/v/1LsYAqk1No/' },
      announcementsUrl: ANNOUNCE,
    })
    expect(queued.title).toMatch(/\[Ep7\] test/)
    expect(queued.title).not.toMatch(/ดูย้อนหลัง|ทบทวน\/ย้อนหลัง/)
    expect(queued.note).toMatch(/ยังไม่ยืนยันว่าเป็น replay/)
    expect(queued._replayStatus).toBe('unconfirmed_link')
  })
})

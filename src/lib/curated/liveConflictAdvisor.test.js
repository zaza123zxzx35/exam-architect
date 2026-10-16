import { describe, expect, it } from 'vitest'
import {
  adviseLiveConflicts,
  replayEvidenceStatus,
} from './liveConflictAdvisor.js'
import { generateLiveScheduleTasks } from './liveSchedulePlan.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('liveConflictAdvisor', () => {
  it('advises attend haek live on 2026-10-21 without moving online-math source clock', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-21',
      untilIso: '2026-10-21',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-21')
    const math = day.find((t) => String(t.liveEventId || '').includes('online-math'))
    expect(math?.startTime).toBe('20:00')
    expect(math?.endTime).toBe('22:00')
    expect(math?.scheduleConflictPending).toBe(true)
    expect(math?.conflictResolved).toBe(false)
    expect(math?.conflictWithLiveEventIds).toContain('lady-live-a-haek-2026-10-21')

    const advice = adviseLiveConflicts(day)
    expect(advice.conflictCount).toBeGreaterThan(0)
    const resolved = advice.decisions.find((d) => d.type === 'resolved' && d.watchLater?.id === math.id)
    expect(resolved).toBeTruthy()
    expect(resolved.attendLive.liveKind).toBe('live')
    expect(resolved.attendLive.liveEventId || resolved.attendLive.id).toMatch(/haek-2026-10-21/)
    expect(resolved.attendLive.title).toMatch(/แหกโค้ง/)
    expect(resolved.overlapTh).toMatch(/20:00/)
    expect(resolved.awaitingUserDecision).toBe(true)
    expect(resolved.watchLaterHintTh).toMatch(/ยังไม่ยืนยัน|ไม่มีหลักฐาน/)
  })

  it('advises attend haek live on 2026-10-07 vip-civil conflict; keeps 20:00–22:30', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-07',
      untilIso: '2026-10-07',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-07')
    const vip = day.find((t) => String(t.liveEventId || '').includes('vip-civil'))
    expect(vip?.startTime).toBe('20:00')
    expect(vip?.endTime).toBe('22:30')
    expect(vip?.scheduleConflictPending).toBe(true)

    const advice = adviseLiveConflicts(day)
    const resolved = advice.decisions.find((d) => d.type === 'resolved' && d.watchLater?.id === vip.id)
    expect(resolved?.attendLive.title).toMatch(/แหกโค้ง/)
    expect(resolved?.watchLater.title).toMatch(/ข้าราชการ/)
    expect(resolved?.watchLater.startTime).toBe('20:00')
  })

  it('2026-10-16 has no lady-live clock conflict advice', () => {
    const draft = generateLiveScheduleTasks({
      todayIso: '2026-10-16',
      untilIso: '2026-10-16',
    })
    const day = draft.proposedTasks.filter((t) => t.plannedDate === '2026-10-16')
    expect(day.every((t) => !t.scheduleConflictPending)).toBe(true)
    const civil = day.find((t) => String(t.liveEventId || '').includes('online-civil'))
    expect(civil?.startTime).toBe('11:00')
    expect(civil?.endTime).toBe('14:00')
    const advice = adviseLiveConflicts(day)
    expect(advice.decisions.filter((d) => d.type === 'resolved')).toHaveLength(0)
  })

  it('does not invent conflicts when no clock overlap', () => {
    const advice = adviseLiveConflicts([
      {
        id: 'a',
        title: 'เช้า',
        startTime: '09:00',
        endTime: '10:00',
        liveKind: 'content-block',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.IF_TIME,
      },
      {
        id: 'b',
        title: 'ค่ำ',
        startTime: '20:00',
        endTime: '21:00',
        liveKind: 'live',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.MUST,
      },
    ])
    expect(advice.conflictCount).toBe(0)
  })

  it('does not treat bare resourceUrl as confirmed replay', () => {
    expect(replayEvidenceStatus({
      resourceUrl: 'https://www.facebook.com/watch/?v=1',
      urlStatus: 'unchecked',
    })).toBe('unconfirmed_link')
    expect(replayEvidenceStatus({
      resourceUrl: 'https://example.com/a',
      replayConfirmed: true,
    })).toBe('confirmed')
    expect(replayEvidenceStatus({ title: 'no link' })).toBe('none')

    const advice = adviseLiveConflicts([
      {
        id: 'live1',
        title: 'ไลฟ์',
        startTime: '21:00',
        endTime: '22:30',
        liveKind: 'live',
        liveEventId: 'lady-live-a-haek-2026-10-07',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.MUST,
      },
      {
        id: 'block1',
        title: 'บล็อก',
        startTime: '20:00',
        endTime: '22:00',
        liveKind: 'content-block',
        status: 'pending',
        priorityTier: PRIORITY_TIERS.IF_TIME,
        resourceUrl: 'https://www.facebook.com/watch/?v=1',
        urlStatus: 'unchecked',
        scheduleConflictPending: true,
      },
    ])
    const resolved = advice.decisions.find((d) => d.type === 'resolved')
    expect(resolved?.watchLater.hasReplayLink).toBe(false)
    expect(resolved?.watchLater.replayStatus).toBe('unconfirmed_link')
    expect(resolved?.watchLaterHintTh).toMatch(/ยังไม่ยืนยัน/)
  })
})

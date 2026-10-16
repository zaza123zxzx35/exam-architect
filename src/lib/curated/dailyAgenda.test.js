import { describe, expect, it } from 'vitest'
import {
  buildDailyAgenda,
  compareAgendaItems,
  classifyAgendaKind,
  mapTaskStatus,
  liveClockPhase,
  DAILY_AGENDA_VERSION,
} from './dailyAgenda.js'
import { PRIORITY_TIERS } from './priorityScoring.js'

describe('dailyAgenda', () => {
  it('maps statuses without inventing in_progress from pending', () => {
    expect(mapTaskStatus('done')).toBe('done')
    expect(mapTaskStatus('pending')).toBe('not_started')
    expect(mapTaskStatus('in_progress')).toBe('in_progress')
  })

  it('classifies live vs study vs review', () => {
    expect(classifyAgendaKind({ liveKind: 'live' })).toBe('live')
    expect(classifyAgendaKind({ liveKind: 'content-block' })).toBe('content-block')
    expect(classifyAgendaKind({ planPack: 'victory-drive' })).toBe('review')
    expect(classifyAgendaKind({ id: 'curated_x', origin: 'part-b-29' })).toBe('study')
  })

  it('orders real lives before self-study and by clock', () => {
    const liveLate = {
      kind: 'live',
      startTime: '21:00',
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.9,
      title: 'ไลฟ์ดึก',
    }
    const liveEarly = {
      kind: 'live',
      startTime: '19:00',
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.9,
      title: 'ไลฟ์เย็น',
    }
    const study = {
      kind: 'study',
      startTime: null,
      priorityTier: PRIORITY_TIERS.MUST,
      priorityScore: 0.99,
      title: 'อ่านเอง',
    }
    const sorted = [study, liveLate, liveEarly].sort(compareAgendaItems)
    expect(sorted.map((x) => x.title)).toEqual(['ไลฟ์เย็น', 'ไลฟ์ดึก', 'อ่านเอง'])
  })

  it('builds agenda separating lives from self-study using schedule tasks only', () => {
    const agenda = buildDailyAgenda({
      todayIso: '2026-10-28',
      schedule: {
        tasks: [
          {
            id: 'live_lady-live-a-howl-2026-10-28_2026-10-28',
            title: 'ไลฟ์ 19:00–21:00 · หมาหอน',
            plannedDate: '2026-10-28',
            startTime: '19:00',
            endTime: '21:00',
            status: 'pending',
            liveKind: 'live',
            liveEventId: 'lady-live-a-howl-2026-10-28',
            subjectId: 'english-skills-a',
            examPart: 'ก',
            priorityTier: PRIORITY_TIERS.MUST,
            priorityScore: 0.5,
            reasonTh: 'จากโปสเตอร์',
            origin: 'live-tutor-schedule',
          },
          {
            id: 'curated_thai_1',
            title: 'ไทย Ep.1',
            plannedDate: '2026-10-28',
            status: 'done',
            subjectId: 'general-knowledge-a',
            examPart: 'ก',
            priorityTier: PRIORITY_TIERS.MUST,
            priorityScore: 0.9,
            origin: 'part-b-29-plan',
          },
          {
            id: 'other_day',
            title: 'ไม่ใช่วันนี้',
            plannedDate: '2026-10-27',
            status: 'pending',
            liveKind: 'live',
          },
        ],
      },
    })

    expect(agenda.version).toBe(DAILY_AGENDA_VERSION)
    expect(agenda.todayIso).toBe('2026-10-28')
    expect(agenda.counts.total).toBe(2)
    expect(agenda.counts.lives).toBe(1)
    expect(agenda.counts.selfStudy).toBe(1)
    expect(agenda.counts.done).toBe(1)
    expect(agenda.items[0].order).toBe(1)
    expect(agenda.items[0].kind).toBe('live')
    expect(agenda.items[0].isRealLive).toBe(true)
    expect(agenda.items[0].orderReasonTh).toMatch(/ไลฟ์จริง/)
    expect(agenda.sections.prep.length).toBe(1)
    expect(agenda.sections.postReview.length).toBeGreaterThan(0)
    expect(agenda.sourceLives.some((e) => e.id.includes('2026-10-28'))).toBe(true)
  })

  it('labels live clock phases from source times only', () => {
    expect(liveClockPhase({ startTime: null })).toBe('no_clock')
    expect(liveClockPhase(
      { startTime: '19:00', endTime: '21:00', plannedDate: '2026-10-28' },
      { todayIso: '2026-10-28', now: new Date('2026-10-28T19:30:00+07:00') },
    )).toBe('live_now')
    expect(liveClockPhase(
      { startTime: '21:00', endTime: '22:30', plannedDate: '2026-10-28' },
      { todayIso: '2026-10-28', now: new Date('2026-10-28T20:30:00+07:00') },
    )).toBe('soon')
    expect(liveClockPhase(
      { startTime: '19:00', endTime: '21:00', plannedDate: '2026-10-28' },
      { todayIso: '2026-10-28', now: new Date('2026-10-28T22:00:00+07:00') },
    )).toBe('ended')
  })

  it('does not invent live clock times for content-only days', () => {
    const agenda = buildDailyAgenda({
      todayIso: '2026-10-16',
      schedule: {
        tasks: [
          {
            id: 'live_vip-thai-2026-10-16_2026-10-16',
            title: 'โฟกัสเนื้อหา · โฟกัสภาษาไทย',
            plannedDate: '2026-10-16',
            status: 'pending',
            liveKind: 'content-block',
            liveEventId: 'vip-thai-2026-10-16',
            subjectId: 'general-knowledge-a',
            examPart: 'ก',
            startTime: null,
            priorityTier: PRIORITY_TIERS.IF_TIME,
            priorityScore: 0.4,
            reasonTh: 'บล็อกไทยตามโปสเตอร์',
            origin: 'live-tutor-schedule',
          },
        ],
      },
    })
    expect(agenda.sections.lives).toHaveLength(0)
    expect(agenda.sections.selfStudy.length).toBeGreaterThanOrEqual(1)
    expect(agenda.items.find((i) => i.id.includes('vip-thai'))?.startTime).toBeNull()
    expect(agenda.sourceFocus.some((e) => e.id === 'vip-thai-2026-10-16')).toBe(true)
  })

  it('fills agenda from poster source when schedule has no today tasks', () => {
    const agenda = buildDailyAgenda({
      todayIso: '2026-10-16',
      schedule: { tasks: [] },
    })
    expect(agenda.filledFromSource).toBe(true)
    expect(agenda.counts.total).toBeGreaterThan(0)
    expect(agenda.sourceFocus.length).toBeGreaterThan(0)
    expect(agenda.sections.lives).toHaveLength(0)
  })
})

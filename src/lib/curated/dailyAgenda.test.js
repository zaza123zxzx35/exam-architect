import { describe, expect, it } from 'vitest'
import {
  buildDailyAgenda,
  compareAgendaItems,
  classifyAgendaKind,
  ensureTodaySourceTasks,
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

  it('ensureTodaySourceTasks upserts flyer clocks even when victory rows already fill the day', () => {
    const polluted = {
      tasks: [{
        id: 'victory_noise',
        title: 'งาน victory ที่ไม่มีนาฬิกา',
        plannedDate: '2026-10-07',
        status: 'pending',
        estimatedMinutes: 90,
        origin: 'victory-plan',
      }, {
        id: 'live_vip-civil-2026-10-07_2026-10-07',
        title: 'ทบทวนกลางวัน (หลบไลฟ์เลดี้) · VIP',
        plannedDate: '2026-10-07',
        status: 'pending',
        startTime: '09:00',
        endTime: '11:00',
        demotedFromStartTime: '20:00',
        demotedFromEndTime: '22:30',
        conflictResolved: true,
        liveKind: 'content-block',
        liveEventId: 'vip-civil-2026-10-07',
        origin: 'live-tutor-schedule',
        reasonTh: 'เลื่อนเป็นทบทวนกลางวันตามแผน 100',
        reasonCodes: ['victory-lady-wins'],
      }],
    }
    const out = ensureTodaySourceTasks(polluted, '2026-10-07')
    expect(out.added).toBeGreaterThan(0)
    const vip = out.schedule.tasks.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    const haek = out.schedule.tasks.find((t) => t.liveEventId === 'lady-live-a-haek-2026-10-07')
    expect(vip?.startTime).toBe('20:00')
    expect(vip?.endTime).toBe('22:30')
    expect(vip?.scheduleConflictPending).toBe(true)
    expect(haek?.startTime).toBe('21:00')
    expect(haek?.endTime).toBe('22:30')
    // Idempotent
    const again = ensureTodaySourceTasks(out.schedule, '2026-10-07')
    expect(again.added).toBe(0)
    const vip2 = again.schedule.tasks.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    expect(vip2?.startTime).toBe('20:00')
  })

  it('ensureTodaySourceTasks does not overwrite userEdited clocks', () => {
    const schedule = {
      tasks: [{
        id: 'live_vip-civil-2026-10-07_2026-10-07',
        title: 'VIP ที่ผู้ใช้ย้ายเอง',
        plannedDate: '2026-10-07',
        status: 'pending',
        startTime: '14:00',
        endTime: '16:00',
        userEdited: true,
        liveKind: 'content-block',
        liveEventId: 'vip-civil-2026-10-07',
        origin: 'live-tutor-schedule',
      }],
    }
    const out = ensureTodaySourceTasks(schedule, '2026-10-07')
    const vip = out.schedule.tasks.find((t) => t.liveEventId === 'vip-civil-2026-10-07')
    expect(vip?.startTime).toBe('14:00')
    expect(vip?.endTime).toBe('16:00')
    // source snapshot still refreshes from flyer
    expect(vip?.sourceStartTime).toBe('20:00')
    expect(vip?.sourceEndTime).toBe('22:30')
  })

  describe('Strategy D planned-clock protect', () => {
    const vipId = 'live_vip-civil-2026-10-07_2026-10-07'

    it('1) tracking row (no lock) adopts flyer planned clocks and sets source*', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'โฟกัสเนื้อหา · VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '20:00',
          endTime: '22:30',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('20:00')
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(vip?.clockLocked).not.toBe(true)
    })

    it('2) userEdited planned clocks are not overwritten; source* still refreshes', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP edited',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          userEdited: true,
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.endTime).toBe('16:00')
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(out.protectedClockIds).toContain(vipId)
    })

    it('3) localStorage drift without userEdited (planned ≠ source*) → protect + clockLocked', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP drifted',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.endTime).toBe('16:00')
      expect(vip?.clockLocked).toBe(true)
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(vip?.reasonCodes).toEqual(expect.arrayContaining(['clock-locked-protect', 'clock-protect:drift']))
      expect(out.clockProtectNotesTh.some((n) => n.includes(vipId))).toBe(true)
    })

    it('4) flyer source changes while user has custom planned → source* updates, planned kept', () => {
      // Simulate prior flyer 19:00 tracked in source*; user moved planned to 14:00.
      // Current flyer for vip-civil is 20:00 — source refreshes to 20:00, planned stays 14:00.
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          sourceStartTime: '19:00',
          sourceEndTime: '21:30',
          clockLocked: true,
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(vip?.sourceEndTime).toBe('22:30')
      expect(vip?.clockLocked).toBe(true)
    })

    it('5) conflict flags sync without changing protected planned clocks', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          clockLocked: true,
          scheduleConflictPending: false,
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.scheduleConflictPending).toBe(true)
      expect(vip?.conflictWithLiveEventIds?.length).toBeGreaterThan(0)
    })

    it('6) legacy row without source* and planned ≠ flyer → protect, report, no overwrite', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP legacy',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.clockLocked).toBe(true)
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(vip?.reasonCodes).toEqual(expect.arrayContaining(['clock-protect:legacy-no-source']))
      expect(out.protectedClockIds).toContain(vipId)
    })

    it('7) adds missing live_* without duplicating existing id', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '20:00',
          endTime: '22:30',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vipRows = out.schedule.tasks.filter((t) => t.liveEventId === 'vip-civil-2026-10-07')
      expect(vipRows).toHaveLength(1)
      expect(out.added).toBeGreaterThan(0) // lady lives etc.
      const again = ensureTodaySourceTasks(out.schedule, '2026-10-07')
      expect(again.added).toBe(0)
      expect(again.schedule.tasks.filter((t) => t.liveEventId === 'vip-civil-2026-10-07')).toHaveLength(1)
    })

    it('8) repeated ensure is idempotent for protected and tracking rows', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP drift',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '14:00',
          endTime: '16:00',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const first = ensureTodaySourceTasks(schedule, '2026-10-07')
      const second = ensureTodaySourceTasks(first.schedule, '2026-10-07')
      expect(second.added).toBe(0)
      expect(second.updated).toBe(0)
      const vip = second.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('14:00')
      expect(vip?.clockLocked).toBe(true)
      expect(vip?.sourceStartTime).toBe('20:00')
    })

    it('clockLocked alone blocks planned overwrite', () => {
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '15:00',
          endTime: '17:00',
          sourceStartTime: '20:00',
          sourceEndTime: '22:30',
          clockLocked: true,
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      expect(out.schedule.tasks.find((t) => t.id === vipId)?.startTime).toBe('15:00')
    })

    it('tracking row follows flyer when planned still equals prior source*', () => {
      // planned === source* (19:00) but current flyer is 20:00 → adopt 20:00
      const schedule = {
        tasks: [{
          id: vipId,
          title: 'VIP',
          plannedDate: '2026-10-07',
          status: 'pending',
          startTime: '19:00',
          endTime: '21:30',
          sourceStartTime: '19:00',
          sourceEndTime: '21:30',
          liveKind: 'content-block',
          liveEventId: 'vip-civil-2026-10-07',
          origin: 'live-tutor-schedule',
        }],
      }
      const out = ensureTodaySourceTasks(schedule, '2026-10-07')
      const vip = out.schedule.tasks.find((t) => t.id === vipId)
      expect(vip?.startTime).toBe('20:00')
      expect(vip?.endTime).toBe('22:30')
      expect(vip?.sourceStartTime).toBe('20:00')
      expect(vip?.clockLocked).not.toBe(true)
    })
  })
})

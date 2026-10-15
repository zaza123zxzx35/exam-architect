import { describe, expect, it } from 'vitest'
import {
  attachCatalogLinkToLiveTask,
  pickCatalogLinkForSubject,
  resolveTaskOpenAction,
} from './taskOpenAction.js'
import { SUBJECT_IDS } from '../study/taxonomy.js'

describe('taskOpenAction', () => {
  it('opens complete unchecked URLs', () => {
    const action = resolveTaskOpenAction({
      resourceUrl: 'https://www.youtube.com/live/abc123',
      urlStatus: 'unchecked',
    })
    expect(action.mode).toBe('open')
    expect(action.href).toContain('youtube.com')
    expect(action.labelTh).toMatch(/เปิดคลิป/)
  })

  it('opens complete URLs even when urlStatus is missing', () => {
    const action = resolveTaskOpenAction({
      originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    })
    expect(action.mode).toBe('open')
    expect(action.href).toContain('youtube.com')
  })

  it('offers copy for needs_full_url stubs', () => {
    const stub = 'https://www.facebook.com/.../pcb.../123'
    const action = resolveTaskOpenAction({
      resourceUrl: stub,
      originalUrl: stub,
      urlStatus: 'needs_full_url',
    })
    expect(action.mode).toBe('copy')
    expect(action.copyText).toBe(stub)
    expect(action.labelTh).toMatch(/คัดลอก/)
  })

  it('attaches a catalog tutoring link to live focus tasks', () => {
    const linked = attachCatalogLinkToLiveTask({
      id: 'live_x',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      examPart: 'ข',
      liveKind: 'content-block',
      resourceUrl: '',
      reasonTh: 'โฟกัส',
      reasonCodes: [],
    })
    expect(linked.resourceUrl || linked.originalUrl).toBeTruthy()
    const action = resolveTaskOpenAction(linked)
    expect(['open', 'copy']).toContain(action.mode)
  })

  it('resolves open/copy for live tasks that still lack a stored URL', () => {
    const action = resolveTaskOpenAction({
      id: 'live_legacy',
      subjectId: SUBJECT_IDS.ENGLISH_MAJOR,
      examPart: 'ข',
      liveKind: 'content-block',
      resourceUrl: '',
      originalUrl: '',
      urlStatus: 'unchecked',
    })
    expect(['open', 'copy']).toContain(action.mode)
    expect(action.copyText || action.href).toBeTruthy()
  })

  it('picks catalog rows per subject', () => {
    const row = pickCatalogLinkForSubject(SUBJECT_IDS.MATH, 'ก')
    expect(row?.subjectId).toBe(SUBJECT_IDS.MATH)
  })
})

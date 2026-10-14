import { beforeEach, describe, expect, it } from 'vitest'
import {
  LEGACY_EXAM_HTML_KEY,
  UNIFIED_KEY,
} from './constants.js'
import { migrateFromLegacy, loadUnifiedStore } from './migrate.js'
import { listBackupKeys } from './backup.js'

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    key(index) {
      return [...map.keys()][index] ?? null
    },
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
    removeItem(key) {
      map.delete(key)
    },
    clear() {
      map.clear()
    },
  }
}

describe('migrateFromLegacy', () => {
  /** @type {ReturnType<typeof createMemoryStorage>} */
  let storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('initializes an empty unified store when no legacy keys exist', () => {
    const report = migrateFromLegacy(storage)
    expect(report.migrated).toBe(true)
    expect(report.reason).toBe('empty-initialized')
    const store = loadUnifiedStore(storage)
    expect(store?.schemaVersion).toBe(1)
    expect(store?.exams[0]?.startsAt).toBe('2026-11-14T09:00:00+07:00')
  })

  it('imports English-only keys and retains legacy keys', () => {
    storage.setItem('app_theme_v1', JSON.stringify('dark'))
    storage.setItem('study_plan', JSON.stringify([
      {
        id: 'p1',
        priority: 1,
        title: 'Sector A',
        details: ['Task one', 'Task two'],
        color: 'blue',
      },
    ]))
    storage.setItem('plan_progress', JSON.stringify({ p1_0: true }))
    storage.setItem('study_videos', JSON.stringify([
      {
        id: 'v1',
        title: 'FB lesson',
        url: 'https://www.facebook.com/share/v/abc/',
        isWatched: true,
        category: 'VIP',
      },
    ]))

    const report = migrateFromLegacy(storage)
    expect(report.sources).toContain('english')
    expect(report.migrated).toBe(true)

    const store = loadUnifiedStore(storage)
    expect(store.prefs.theme).toBe('dark')
    expect(store.topics).toHaveLength(1)
    expect(store.tasks).toHaveLength(2)
    expect(store.tasks.find(t => t.id === 'p1_0')?.status).toBe('done')
    expect(store.videos[0].sourceUrl).toContain('facebook.com')
    expect(store.videoProgress.v1.watched).toBe(true)

    // Legacy keys must remain for coexistence / rollback
    expect(storage.getItem('study_plan')).not.toBeNull()
    expect(storage.getItem('plan_progress')).not.toBeNull()
    expect(listBackupKeys(storage).length).toBeGreaterThan(0)
  })

  it('imports exam-html progress and strips sensitive u_id from seed links', () => {
    storage.setItem(LEGACY_EXAM_HTML_KEY, JSON.stringify({
      days: { '2026-10-13': { 0: true, 1: false } },
      notes: { '2026-10-13': 'weak grammar' },
    }))

    const dailyPlanByDate = {
      '2026-10-13': [
        {
          text: 'i-test Grammar',
          pri: 'high',
          link: 'https://i-test.kruphuchuay.com/pro/quiz.php?id=2/5&u_id=0610395503',
        },
        {
          text: 'LIVE review',
          pri: 'med',
          link: 'https://www.facebook.com/groups/example/',
        },
      ],
    }

    const report = migrateFromLegacy(storage, { dailyPlanByDate })
    expect(report.sources).toContain('exam-html')
    expect(report.strippedSensitiveUrls).toBeGreaterThanOrEqual(1)

    const store = loadUnifiedStore(storage)
    const grammar = store.tasks.find(t => t.id === 'html_2026-10-13_0')
    expect(grammar?.status).toBe('done')
    expect(grammar?.sourceUrl).toContain('i-test.kruphuchuay.com')
    expect(grammar?.sourceUrl).not.toMatch(/u_id/i)
    expect(JSON.stringify(store)).not.toContain('0610395503')
    expect(store.notes.some(n => n.kind === 'daily' && n.date === '2026-10-13')).toBe(true)
    expect(storage.getItem(LEGACY_EXAM_HTML_KEY)).not.toBeNull()
  })

  it('merges both English and exam-html sources', () => {
    storage.setItem('study_plan', JSON.stringify([
      { id: 'p1', priority: 1, title: 'Plan', details: ['A'] },
    ]))
    storage.setItem(LEGACY_EXAM_HTML_KEY, JSON.stringify({
      days: { '2026-10-12': { 0: true } },
      notes: {},
    }))

    const report = migrateFromLegacy(storage, {
      dailyPlanByDate: {
        '2026-10-12': [{ text: 'Mock', pri: 'high' }],
      },
    })
    expect(report.sources.sort()).toEqual(['english', 'exam-html'])
    const store = loadUnifiedStore(storage)
    expect(store.tasks.some(t => t.origin === 'seed-english')).toBe(true)
    expect(store.tasks.some(t => t.origin === 'seed-exam-html')).toBe(true)
  })

  it('skips when unified store already exists', () => {
    migrateFromLegacy(storage)
    const second = migrateFromLegacy(storage)
    expect(second.skipped).toBe(true)
    expect(second.reason).toBe('already-unified')
    expect(storage.getItem(UNIFIED_KEY)).not.toBeNull()
  })
})

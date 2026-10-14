import { describe, expect, it } from 'vitest'
import {
  courses,
  dailyPlan,
  getDayIndexForDate,
  getPlanDateByIndex,
  htmlPlannerLinkInventory,
  importantLinks,
  phases,
} from './htmlPlannerData.js'
import { buildHtmlResourceAccounting } from '../lib/planner/resourceAccounting.js'
import { initialVideos } from './videoData.js'

describe('htmlPlannerData (ported from HTML)', () => {
  it('has 34 days starting 2026-10-12 ending 2026-11-14', () => {
    expect(dailyPlan).toHaveLength(34)
    expect(getPlanDateByIndex(0)).toBe('2026-10-12')
    expect(getPlanDateByIndex(33)).toBe('2026-11-14')
    expect(getDayIndexForDate('2026-10-12')).toBe(0)
    expect(getDayIndexForDate('2026-11-14')).toBe(33)
  })

  it('preserves phases, courses, and importantLinks counts from HTML', () => {
    expect(phases).toHaveLength(5)
    expect(courses).toHaveLength(6)
    expect(importantLinks).toHaveLength(5)
    expect(importantLinks.map(l => l.name)).toContain('เฉลยเล่มแดงกฎหมายครู (Google Drive)')
    expect(importantLinks.some(l => l.url.includes('drive.google.com'))).toBe(true)
  })

  it('keeps every inventory URL exactly as sourced (no empty invent)', () => {
    expect(htmlPlannerLinkInventory.length).toBeGreaterThan(0)
    for (const row of htmlPlannerLinkInventory) {
      expect(row.url).toMatch(/^https?:\/\//)
      expect(row.title).toBeTruthy()
      expect(['dailyPlan', 'importantLinks']).toContain(row.source)
    }
  })

  it('accounts for all planner links including those missing from video library', () => {
    const accounting = buildHtmlResourceAccounting(initialVideos)
    expect(accounting.rows).toHaveLength(htmlPlannerLinkInventory.length)
    expect(accounting.summary.notInVideoLibraryUnique).toBeGreaterThanOrEqual(30)
    // No row silently dropped
    const urls = new Set(accounting.rows.map(r => r.url))
    for (const row of htmlPlannerLinkInventory) {
      expect(urls.has(row.url)).toBe(true)
    }
    // Drive answer keys present
    expect(accounting.rows.some(r => r.url.includes('drive.google.com/file/d/1bflOPJkhXV_jn7'))).toBe(true)
    expect(accounting.rows.some(r => r.url.includes('drive.google.com/file/d/1u5d9UzKGG7X4TzJbe6LRIUJf4M-WDUmW'))).toBe(true)
  })

  it('flags duplicate planner URLs instead of deleting them', () => {
    const accounting = buildHtmlResourceAccounting(initialVideos)
    const byUrl = new Map()
    for (const row of accounting.rows) {
      byUrl.set(row.url, (byUrl.get(row.url) || 0) + 1)
    }
    const dups = [...byUrl.entries()].filter(([, count]) => count > 1)
    expect(dups.length).toBeGreaterThan(0)
    for (const [url] of dups) {
      const rows = accounting.rows.filter(r => r.url === url)
      expect(rows.every(r => r.status === 'duplicate' || r.flags.includes('duplicate-in-planner'))).toBe(true)
    }
  })
})

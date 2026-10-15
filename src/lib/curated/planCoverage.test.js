import { describe, expect, it } from 'vitest'
import { auditPlanCoverage } from './planCoverage.js'
import { enrichCuratedResources } from './catalog.js'
import { generateUnifiedStudyDraft } from './unifiedPlan.js'

describe('plan coverage audit', () => {
  it('reports priority coverage without raising daily budget or requiring all 217', () => {
    const catalog = enrichCuratedResources()
    const coverage = auditPlanCoverage(catalog, { todayIso: '2026-10-14', dailyMinutes: 120, mode: 'score-max' })
    expect(coverage.examPartA).toBe('2026-11-14')
    expect(coverage.examPartB).toBe('2026-11-15')
    expect(coverage.durationsAreEstimates).toBe(true)
    expect(coverage.dailyMinutes).toBe(120)
    expect(coverage.totals.planPool).toBe(217)
    expect(coverage.totals.must + coverage.totals.ifTime + coverage.totals.defer).toBe(217)
    expect(coverage.totals.scheduled + coverage.totals.unscheduled).toBe(coverage.totals.planPool)
    expect(coverage.minutes.unitNoteTh).toMatch(/ค่าประมาณ|ต้องเก็บคะแนน/)
    expect(coverage.optionsTh.some(o => /ไม่เพิ่มนาที|คุ้มคะแนน/.test(o))).toBe(true)
    expect(coverage.dailyMinutesIsDefault || coverage.dailyMinutes === 120).toBe(true)
  })

  it('queue pointer fix keeps not-yet-fit items for later days', () => {
    const catalog = enrichCuratedResources()
      .filter(r => r.examPart === 'ก')
      .slice(0, 6)
      .map((r, i) => ({ ...r, estimatedMinutes: i === 0 ? 90 : 45, priority: i }))
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 60,
      catalog,
      mode: 'balanced',
    })
    const scheduled = new Set(draft.proposedTasks.filter(t => t.resourceId).map(t => t.resourceId))
    // With the bug, item[1] could be skipped forever after a 90-min first item fills day 1.
    // After the fix, later 45-min items still get scheduled on subsequent days.
    expect(scheduled.size).toBeGreaterThanOrEqual(2)
    // Deferred items are intentionally excluded from partA queue counts.
    expect(draft.unscheduled.partA + draft.unscheduled.deferred + scheduled.size).toBe(catalog.length)
  })
})

import { describe, expect, it } from 'vitest'
import { auditPlanCoverage } from './planCoverage.js'
import { enrichCuratedResources } from './catalog.js'
import { generateUnifiedStudyDraft } from './unifiedPlan.js'
import { FIXTURE_CURATED_RESOURCES } from '../../data/curatedCatalog.fixture.js'

describe('plan coverage audit', () => {
  it('reports empty coverage on clean-slate catalog', () => {
    const coverage = auditPlanCoverage(enrichCuratedResources(), {
      todayIso: '2026-10-14',
      dailyMinutes: 120,
      mode: 'score-max',
    })
    expect(coverage.totals.planPool).toBe(0)
    expect(coverage.dailyMinutes).toBe(120)
  })

  it('queue pointer fix keeps not-yet-fit items for later days (fixture)', () => {
    const catalog = enrichCuratedResources(FIXTURE_CURATED_RESOURCES)
      .filter(r => r.examPart === 'ก')
      .map((r, i) => ({ ...r, estimatedMinutes: i === 0 ? 90 : 45, priority: i }))
    const draft = generateUnifiedStudyDraft({
      todayIso: '2026-10-14',
      dailyMinutes: 60,
      catalog,
      mode: 'balanced',
    })
    const scheduled = new Set(draft.proposedTasks.filter(t => t.resourceId).map(t => t.resourceId))
    expect(scheduled.size).toBeGreaterThanOrEqual(2)
    expect(draft.unscheduled.partA + draft.unscheduled.deferred + scheduled.size).toBe(catalog.length)
  })
})

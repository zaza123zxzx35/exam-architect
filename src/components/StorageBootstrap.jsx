import { useState } from 'react'
import { migrateFromLegacy } from '../lib/storage/migrate.js'
import { loadOrMigrateSchedule } from '../lib/schedule/migrate.js'
import { getScheduleSnapshot, resetScheduleCache } from '../lib/schedule/store.js'
import { dailyPlan, getPlanDateByIndex } from '../data/htmlPlannerData.js'

function buildDailyPlanByDate() {
  const map = {}
  dailyPlan.forEach((tasks, index) => {
    map[getPlanDateByIndex(index)] = tasks
  })
  return map
}

function runMigration() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      unified: { migrated: false, skipped: true, reason: 'no-storage' },
      schedule: { migrated: false, skipped: true, reason: 'no-storage' },
    }
  }
  try {
    const unified = migrateFromLegacy(window.localStorage, {
      dailyPlanByDate: buildDailyPlanByDate(),
    })
    // Reset module cache so first page read sees post-migrate schedule.
    resetScheduleCache()
    const { report: schedule } = loadOrMigrateSchedule(window.localStorage)
    getScheduleSnapshot(window.localStorage)

    if (import.meta.env.DEV) {
      if (unified.migrated) {
        console.info('[storage] migrate', {
          reason: unified.reason,
          sources: unified.sources,
          strippedSensitiveUrls: unified.strippedSensitiveUrls,
          tasks: unified.taskCount,
          sessions: unified.sessionCount,
          videos: unified.videoCount,
        })
      }
      if (schedule.migrated || schedule.recovered) {
        console.info('[schedule] migrate', {
          reason: schedule.reason,
          sources: schedule.sources,
          recovered: schedule.recovered,
          tasks: schedule.taskCount,
          sessions: schedule.sessionCount,
        })
      }
    }
    return { unified, schedule }
  } catch (error) {
    console.error('[storage] migrate failed', error)
    return {
      unified: { migrated: false, skipped: true, reason: 'error' },
      schedule: { migrated: false, skipped: true, reason: 'error' },
    }
  }
}

/**
 * Runs reversible localStorage migrations once on first client render.
 * M1: kru_unified_v1 snapshot. M3: kru_schedule_v1 runtime SSOT.
 */
export default function StorageBootstrap({ children }) {
  const [report] = useState(runMigration)

  return (
    <>
      {children}
      {report?.unified?.migrated && report.unified.reason === 'migrated' && (
        <div className="sr-only" data-testid="migration-report">
          migrated from {(report.unified.sources || []).join(', ') || 'empty'}
        </div>
      )}
      {report?.schedule?.migrated && (
        <div className="sr-only" data-testid="schedule-migration-report">
          schedule {report.schedule.reason}; tasks {report.schedule.taskCount}
        </div>
      )}
    </>
  )
}

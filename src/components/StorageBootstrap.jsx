import { useState } from 'react'
import { migrateFromLegacy } from '../lib/storage/migrate.js'

function runMigration() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { migrated: false, skipped: true, reason: 'no-storage' }
  }
  try {
    const result = migrateFromLegacy(window.localStorage)
    if (import.meta.env.DEV && result.migrated) {
      console.info('[storage] migrate', {
        reason: result.reason,
        sources: result.sources,
        strippedSensitiveUrls: result.strippedSensitiveUrls,
        tasks: result.taskCount,
        sessions: result.sessionCount,
        videos: result.videoCount,
      })
    }
    return result
  } catch (error) {
    console.error('[storage] migrate failed', error)
    return { migrated: false, skipped: true, reason: 'error' }
  }
}

/**
 * Runs the reversible localStorage migration once on first client render.
 * Existing page hooks continue to read legacy keys (M1 coexistence).
 */
export default function StorageBootstrap({ children }) {
  const [report] = useState(runMigration)

  return (
    <>
      {children}
      {report?.migrated && report.reason === 'migrated' && (
        <div className="sr-only" data-testid="migration-report">
          migrated from {(report.sources || []).join(', ') || 'empty'}
        </div>
      )}
    </>
  )
}

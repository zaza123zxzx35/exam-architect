/**
 * Resolve open / copy actions for schedule tasks that carry tutoring URLs.
 */

import { enrichCuratedResources } from './catalog.js'
import {
  URL_STATUS,
  canOpenExternally,
  classifyResourceUrl,
  copyUrlPayload,
  isIncompleteUrl,
} from './urlStatus.js'

/**
 * @typedef {{
 *   mode: 'open' | 'copy' | 'none',
 *   href: string | null,
 *   copyText: string,
 *   labelTh: string,
 *   hintTh: string,
 * }} TaskOpenAction
 */

/**
 * Pick a catalog row for a live/content-block focus subject.
 * Prefers structurally complete URLs, then any stub the user can copy.
 * @param {string} subjectId
 * @param {string} [examPart]
 * @param {ReturnType<typeof enrichCuratedResources>} [catalog]
 */
export function pickCatalogLinkForSubject(subjectId, examPart, catalog = enrichCuratedResources()) {
  const rows = (catalog || []).filter((r) => {
    if (!r || r.subjectId !== subjectId) return false
    if (examPart && examPart !== 'admin' && examPart !== 'mixed' && r.examPart !== examPart) {
      return false
    }
    return Boolean(r.originalUrl || r.url)
  })
  if (!rows.length) return null
  const openable = rows.find((r) => r.canOpen && canOpenExternally(r.urlStatus) && r.safeUrl)
  if (openable) return openable
  const unchecked = rows.find((r) => r.urlStatus === URL_STATUS.UNCHECKED && r.safeUrl)
  if (unchecked) return unchecked
  return rows[0]
}

/**
 * @param {object} task
 * @returns {TaskOpenAction}
 */
/**
 * Ensure a task carries a tutoring URL when possible (live focus → catalog).
 * Safe to call at render time; does not mutate the schedule store.
 * @param {object} task
 * @param {ReturnType<typeof enrichCuratedResources>} [catalog]
 */
export function withOpenableTaskUrl(task, catalog = enrichCuratedResources()) {
  if (!task) return task
  const raw = String(task.originalUrl || task.resourceUrl || task.url || '').trim()
  if (raw) return task
  return attachCatalogLinkToLiveTask(task, catalog)
}

export function resolveTaskOpenAction(task) {
  if (!task) {
    return { mode: 'none', href: null, copyText: '', labelTh: '', hintTh: '' }
  }

  const enriched = withOpenableTaskUrl(task)
  const raw = String(enriched.originalUrl || enriched.resourceUrl || enriched.url || '').trim()
  if (!raw) {
    return { mode: 'none', href: null, copyText: '', labelTh: '', hintTh: '' }
  }

  // Prefer stored status; if missing, classify from the URL itself.
  const classified = classifyResourceUrl(raw)
  const status = enriched.urlStatus || classified.status

  if (canOpenExternally(status)) {
    const href = classified.safeUrl || (isIncompleteUrl(raw) ? null : raw)
    if (href) {
      return {
        mode: 'open',
        href,
        copyText: href,
        labelTh: 'เปิดคลิปติว',
        hintTh: 'เปิดลิงก์ในแท็บใหม่',
      }
    }
  }

  const copyText = copyUrlPayload({
    url: raw,
    originalUrl: raw,
    urlStatus: status || (isIncompleteUrl(raw) ? URL_STATUS.NEEDS_FULL_URL : URL_STATUS.UNCHECKED),
  })
  if (copyText) {
    return {
      mode: 'copy',
      href: null,
      copyText,
      labelTh: 'คัดลอก URL',
      hintTh: status === URL_STATUS.NEEDS_FULL_URL
        ? 'URL ไม่ครบ — คัดลอกแล้ววางในเบราว์เซอร์ หรือกดลิงก์ใต้โพสต์'
        : 'คัดลอกลิงก์ไปเปิดเอง',
    }
  }

  return { mode: 'none', href: null, copyText: '', labelTh: '', hintTh: '' }
}

/**
 * Attach openable catalog link fields onto a live/content focus task.
 * @param {object} task
 * @param {ReturnType<typeof enrichCuratedResources>} [catalog]
 */
export function attachCatalogLinkToLiveTask(task, catalog = enrichCuratedResources()) {
  if (!task?.subjectId || task.resourceUrl) return task
  if (task.liveKind === 'logistics' || task.examPart === 'admin') return task
  const pick = pickCatalogLinkForSubject(task.subjectId, task.examPart, catalog)
  if (!pick) return task
  return {
    ...task,
    resourceId: task.resourceId || pick.id,
    resourceUrl: pick.safeUrl || pick.originalUrl || pick.url || '',
    originalUrl: pick.originalUrl || pick.url || '',
    urlStatus: pick.urlStatus || 'unchecked',
    tutorTh: task.tutorTh || pick.tutorTh || '',
    reasonTh: [
      task.reasonTh,
      `ลิงก์แนะนำจากคลัง: ${pick.title}`,
    ].filter(Boolean).join(' · '),
    reasonCodes: [...new Set([...(task.reasonCodes || []), 'live-focus-catalog-link'])],
  }
}

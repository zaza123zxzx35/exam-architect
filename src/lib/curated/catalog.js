/**
 * Curated catalog enrichment + filters. Classify-on-read; never mutates seed rows.
 */

import { getCuratedResources, CURATED_CATALOG_VERSION } from '../../data/curatedCatalog.js'
import { classifyResourceUrl, copyUrlPayload, URL_STATUS_LABELS_TH } from './urlStatus.js'
import { HUB_SUBJECT_LABELS, HUB_EXAM_PART_LABELS } from '../study/hub.js'

export { CURATED_CATALOG_VERSION }

/**
 * @typedef {import('../../data/curatedCatalog.js').CuratedResource & {
 *   urlStatus: import('./urlStatus.js').UrlStatus,
 *   safeUrl: string | null,
 *   originalUrl: string,
 *   statusLabelTh: string,
 *   canOpen: boolean,
 * }} EnrichedCuratedResource
 */

/**
 * @param {import('../../data/curatedCatalog.js').CuratedResource[]} [resources]
 * @returns {EnrichedCuratedResource[]}
 */
export function enrichCuratedResources(resources = getCuratedResources()) {
  return (resources || []).map(row => {
    const originalUrl = String(row.url || '')
    const { status, safeUrl } = classifyResourceUrl(originalUrl)
    return {
      ...row,
      originalUrl,
      urlStatus: status,
      safeUrl,
      statusLabelTh: URL_STATUS_LABELS_TH[status] || status,
      canOpen: status !== 'needs_full_url' && status !== 'unreachable' && Boolean(safeUrl),
      subjectLabelTh: HUB_SUBJECT_LABELS[row.subjectId] || row.subjectId,
      examPartLabelTh: HUB_EXAM_PART_LABELS[row.examPart] || row.examPart,
    }
  })
}

/**
 * @param {EnrichedCuratedResource[]} items
 * @param {{
 *   examPart?: string,
 *   subjectId?: string,
 *   kind?: string,
 *   urlStatus?: string,
 *   series?: string,
 *   query?: string,
 * }} [filters]
 */
export function filterCuratedResources(items, filters = {}) {
  const examPart = filters.examPart || 'all'
  const subjectId = filters.subjectId || 'all'
  const kind = filters.kind || 'all'
  const urlStatus = filters.urlStatus || 'all'
  const series = filters.series || 'all'
  const query = String(filters.query || '').trim().toLowerCase()

  return (items || []).filter(item => {
    if (!item) return false
    if (examPart !== 'all' && item.examPart !== examPart) return false
    if (subjectId !== 'all' && item.subjectId !== subjectId) return false
    if (kind !== 'all' && item.kind !== kind) return false
    if (urlStatus !== 'all' && item.urlStatus !== urlStatus) return false
    if (series !== 'all' && item.series !== series) return false
    if (query) {
      const hay = `${item.title} ${item.series} ${item.subjectId} ${item.notes || ''}`.toLowerCase()
      if (!hay.includes(query)) return false
    }
    return true
  })
}

/**
 * Summarize URL statuses for reporting UI.
 * @param {EnrichedCuratedResource[]} items
 */
export function summarizeCuratedUrlStatuses(items) {
  const summary = {
    total: items.length,
    unchecked: 0,
    openable: 0,
    verified_accessible: 0,
    needs_login: 0,
    needs_full_url: 0,
    unreachable: 0,
    awaiting_user: 0,
  }
  for (const item of items) {
    if (item.urlStatus in summary) summary[item.urlStatus] += 1
  }
  return summary
}

/**
 * Recommend curated practice for a subject (rule-based; no AI).
 * @param {string} subjectId
 * @param {EnrichedCuratedResource[]} [catalog]
 * @param {{ limit?: number }} [options]
 */
export function recommendCuratedForSubject(subjectId, catalog = enrichCuratedResources(), options = {}) {
  const limit = options.limit ?? 6
  const sid = String(subjectId || '')
  const hits = filterCuratedResources(catalog, { subjectId: sid })
    .slice()
    .sort((a, b) => (a.priority - b.priority) || String(a.id).localeCompare(String(b.id)))
  return hits.slice(0, limit)
}

export function getCopyUrl(item) {
  return copyUrlPayload(item)
}

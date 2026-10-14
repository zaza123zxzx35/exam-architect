/**
 * District intelligence helpers (Phase 5).
 * User-entered competition figures only — never invent vacancies or applicant counts.
 * HRMS national stats stay cited separately and must not be treated as district openings.
 */

/**
 * @typedef {object} CompetitionRecord
 * @property {string} id
 * @property {string} district
 * @property {string} [subject]
 * @property {number|string} vacancies
 * @property {number|string} applicants
 * @property {string} [updatedAt]
 * @property {string} [sourceUrl]
 * @property {string} [note]
 */

/**
 * Strip legacy seed rows (not user-authored evidence).
 * @param {unknown} rows
 * @returns {CompetitionRecord[]}
 */
export function sanitizeCompetitionRecords(rows) {
  if (!Array.isArray(rows)) return []
  return rows.filter(row => row && typeof row === 'object' && !String(row.id || '').startsWith('seed-'))
}

/**
 * @param {CompetitionRecord} row
 * @returns {{ ok: boolean, vacancies: number, applicants: number, ratio: number | null, applicantsPerVacancyLabel: string, issues: string[] }}
 */
export function analyzeCompetitionRow(row) {
  const issues = []
  if (!row || typeof row !== 'object') {
    return { ok: false, vacancies: 0, applicants: 0, ratio: null, applicantsPerVacancyLabel: '—', issues: ['invalid-row'] }
  }
  if (!String(row.district || '').trim()) issues.push('missing-district')
  const vacancies = Number(row.vacancies)
  const applicants = Number(row.applicants)
  if (!Number.isFinite(vacancies) || vacancies <= 0) issues.push('invalid-vacancies')
  if (!Number.isFinite(applicants) || applicants < 0) issues.push('invalid-applicants')
  if (!String(row.updatedAt || '').trim()) issues.push('missing-measured-at')
  if (!String(row.sourceUrl || '').trim()) issues.push('missing-source-url')

  const ratio = vacancies > 0 && Number.isFinite(applicants) ? applicants / vacancies : null
  return {
    ok: issues.filter(i => i !== 'missing-source-url').length === 0,
    vacancies: Number.isFinite(vacancies) ? vacancies : 0,
    applicants: Number.isFinite(applicants) ? applicants : 0,
    ratio,
    applicantsPerVacancyLabel: ratio == null ? '—' : `1:${ratio.toFixed(1)}`,
    issues,
  }
}

/**
 * @param {CompetitionRecord[]} rows
 * @param {{ ascending?: boolean }} [options]
 */
export function sortCompetitionByRatio(rows, options = {}) {
  const ascending = options.ascending !== false
  return [...rows].sort((a, b) => {
    const ra = analyzeCompetitionRow(a).ratio
    const rb = analyzeCompetitionRow(b).ratio
    const first = ra == null ? Number.POSITIVE_INFINITY : ra
    const second = rb == null ? Number.POSITIVE_INFINITY : rb
    return ascending ? first - second : second - first
  })
}

/**
 * Evidence summary for UI — separates user local records from national HRMS citation.
 * @param {CompetitionRecord[]} rows
 * @param {{ nationalSourceLabel?: string }} [meta]
 */
export function districtEvidenceSummary(rows, meta = {}) {
  const records = sanitizeCompetitionRecords(rows)
  const withSource = records.filter(r => String(r.sourceUrl || '').trim())
  const complete = records.filter(r => analyzeCompetitionRow(r).ok)
  return {
    recordCount: records.length,
    completeCount: complete.length,
    withSourceCount: withSource.length,
    provenance: 'user-local-only',
    nationalStatsNote:
      meta.nationalSourceLabel
      || 'HRMS.OBEC national figures are workforce statistics, not district vacancy openings.',
    inventsVacancies: false,
  }
}

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  analyzeCompetitionRow,
  districtEvidenceSummary,
  sanitizeCompetitionRecords,
  sortCompetitionByRatio,
} from './intelligence.js'

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'intelligence.js'),
  'utf8',
)

describe('district intelligence (Phase 5)', () => {
  it('drops seed rows and never claims invented vacancies', () => {
    expect(source).toContain('never invent vacancies')
    const rows = sanitizeCompetitionRecords([
      { id: 'seed-1', district: 'fake' },
      { id: 'record-1', district: 'สพป.ทดสอบ', vacancies: 2, applicants: 40, updatedAt: '2026-10-01', sourceUrl: 'https://example.com/a' },
    ])
    expect(rows).toHaveLength(1)
    const summary = districtEvidenceSummary(rows)
    expect(summary.inventsVacancies).toBe(false)
    expect(summary.provenance).toBe('user-local-only')
  })

  it('computes applicants-per-vacancy only from user figures', () => {
    const analysis = analyzeCompetitionRow({
      id: 'r1',
      district: 'สพม.1',
      vacancies: 5,
      applicants: 120,
      updatedAt: '2026-10-02',
      sourceUrl: 'https://example.com/b',
    })
    expect(analysis.ok).toBe(true)
    expect(analysis.ratio).toBeCloseTo(24)
    expect(analysis.applicantsPerVacancyLabel).toBe('1:24.0')
  })

  it('sorts by ratio and flags missing evidence fields', () => {
    const sorted = sortCompetitionByRatio([
      { id: 'a', district: 'A', vacancies: 1, applicants: 30, updatedAt: '2026-01-01' },
      { id: 'b', district: 'B', vacancies: 2, applicants: 20, updatedAt: '2026-01-01' },
    ], { ascending: true })
    expect(sorted.map(r => r.id)).toEqual(['b', 'a'])
    const weak = analyzeCompetitionRow({ id: 'c', district: '', vacancies: 0, applicants: -1 })
    expect(weak.issues).toEqual(expect.arrayContaining([
      'missing-district',
      'invalid-vacancies',
      'invalid-applicants',
      'missing-measured-at',
      'missing-source-url',
    ]))
  })
})

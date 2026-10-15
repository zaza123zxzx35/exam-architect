/**
 * Curated study catalog for สพฐ. 2569.
 * v10.0-clean-slate: wiped mixed multi-tutor inventory.
 * Rebuild subject-by-subject from user-confirmed packs (starting: ครูเลดี้เก๋เก๋ English ก+ข).
 *
 * URLs are stored exactly as provided. Never invent missing segments.
 */

/** @typedef {'lesson' | 'quiz-practice' | 'answer-key' | 'document' | 'live'} CuratedKind */

/**
 * @typedef {object} CuratedResource
 * @property {string} id
 * @property {string} series
 * @property {number | null} [episode]
 * @property {string} title
 * @property {CuratedKind} kind
 * @property {'ก' | 'ข' | 'ค' | 'admin' | 'mixed' | 'unknown'} examPart
 * @property {string} subjectId
 * @property {string} url
 * @property {number | null} [estimatedMinutes]
 * @property {number} priority lower = earlier in plan
 * @property {string} [notes]
 * @property {string[]} [relatedIds]
 * @property {string} source
 * @property {string} [tutorTh]
 */

export const CURATED_CATALOG_VERSION = '10.0-clean-slate'

/**
 * Clean slate — awaiting user packs.
 * Next expected pack: วิชาเอกอังกฤษ ข + อังกฤษ ก · ครูเลดี้เก๋เก๋
 * Source post (needs Facebook login):
 * https://www.facebook.com/groups/152029819565529/posts/1531391668295997
 *
 * @type {CuratedResource[]}
 */
export const curatedResources = []

/** @returns {CuratedResource[]} defensive copy — never mutate seed rows */
export function getCuratedResources() {
  return curatedResources.map(row => ({ ...row, relatedIds: [...(row.relatedIds || [])] }))
}

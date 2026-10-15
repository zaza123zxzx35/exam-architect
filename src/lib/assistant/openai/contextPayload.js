/**
 * Build a minimal, non-secret context payload for the model.
 * Official facts vs catalog metadata are labeled separately.
 */

import { enrichCuratedResources } from '../../curated/catalog.js'
import {
  OFFICIAL_SCOPE_CHECKED_AT,
  OFFICIAL_CURRICULUM_BUCKETS,
  OFFICIAL_SCOPE_SOURCES,
  SUBJECT_OFFICIAL_SCOPE,
} from '../../curated/officialExamScope.js'
import {
  PRIORITY_TIERS,
  normalizePriorityMode,
  rankCuratedCatalog,
  weaknessMapFromAnalysis,
} from '../../curated/priorityScoring.js'
import { SUBJECT_IDS } from '../../study/taxonomy.js'
import { MAX_CONTEXT_JSON_CHARS } from './config.js'

function trimMessages(messages = []) {
  return (messages || [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    .slice(-8)
    .map(m => ({
      role: m.role,
      text: String(m.text).slice(0, 600),
    }))
}

function resourceCard(row, score) {
  return {
    id: row.id,
    title: row.title,
    examPart: row.examPart,
    subjectId: row.subjectId,
    kind: row.kind,
    urlStatus: row.urlStatus,
    canOpen: Boolean(row.canOpen),
    estimatedMinutes: row.estimatedMinutes ?? null,
    tier: score?.tier || null,
    tierLabelTh: score?.tierLabelTh || null,
    // Never claim accessibility for unchecked / needs_full_url
    accessibilityNoteTh: row.urlStatus === 'needs_full_url'
      ? 'URL ไม่ครบ — ห้ามอ้างว่าเปิดได้'
      : row.urlStatus === 'unchecked'
        ? 'URL ยังไม่ตรวจ (unchecked) — ห้ามอ้างว่า verified'
        : row.urlStatus === 'verified_accessible'
          ? 'verified_accessible'
          : String(row.urlStatus || ''),
  }
}

/**
 * @param {{
 *   userMessage: string,
 *   language?: 'th'|'en',
 *   todayIso?: string,
 *   priorityMode?: string,
 *   recentMessages?: Array<{ role: string, text: string }>,
 *   weaknessAnalysis?: { observedWeaknesses?: Array<object> },
 *   existingTaskSummaries?: Array<{ id: string, title?: string, status?: string, userEdited?: boolean, resourceId?: string }>,
 *   catalog?: ReturnType<typeof enrichCuratedResources>,
 * }} input
 */
export function buildModelContextPayload(input = {}) {
  const catalog = input.catalog || enrichCuratedResources()
  const mode = normalizePriorityMode(input.priorityMode)
  const weaknessBySubject = weaknessMapFromAnalysis(input.weaknessAnalysis)
  const ranked = rankCuratedCatalog(catalog, { mode, weaknessBySubject })
  const scoreById = new Map(ranked.map(e => [e.row.id, e.score]))

  const mustTop = ranked
    .filter(e => e.score.tier === PRIORITY_TIERS.MUST)
    .slice(0, 24)
    .map(e => resourceCard(e.row, e.score))

  // Prefer resources matching keywords lightly for find-style questions
  const q = String(input.userMessage || '').toLowerCase()
  const keywordHits = catalog
    .filter(r => {
      const hay = `${r.title} ${r.series} ${r.subjectId} ${r.examPart}`.toLowerCase()
      return q && (hay.includes(q.slice(0, 40)) || q.includes(r.subjectId) || q.includes(r.examPart))
    })
    .slice(0, 12)
    .map(r => resourceCard(r, scoreById.get(r.id)))

  const existing = (input.existingTaskSummaries || []).slice(0, 40).map(t => ({
    id: String(t.id),
    title: t.title ? String(t.title).slice(0, 120) : undefined,
    status: t.status === 'done' ? 'done' : 'pending',
    userEdited: Boolean(t.userEdited),
    resourceId: t.resourceId ? String(t.resourceId) : undefined,
  }))

  const payload = {
    meta: {
      todayIso: input.todayIso || null,
      language: input.language === 'en' ? 'en' : 'th',
      priorityMode: mode,
      catalogTotal: catalog.length,
    },
    officialFacts: {
      kind: 'official_facts',
      checkedAt: OFFICIAL_SCOPE_CHECKED_AT,
      sources: OFFICIAL_SCOPE_SOURCES.map(s => ({
        id: s.id,
        titleTh: s.titleTh,
        agencyTh: s.agencyTh,
        dated: s.dated,
        url: s.url,
      })),
      curriculumBuckets: OFFICIAL_CURRICULUM_BUCKETS.map(b => ({
        examPart: b.examPart,
        titleTh: b.titleTh,
        maxScore: b.maxScore,
        mapsToSubjectIds: b.mapsToSubjectIds,
        noteTh: b.noteTh,
      })),
      subjectScope: Object.fromEntries(
        Object.entries(SUBJECT_OFFICIAL_SCOPE).map(([id, v]) => [id, {
          examPart: v.examPart,
          status: v.status,
          officialBucketTh: v.officialBucketTh,
          noteTh: v.noteTh,
        }]),
      ),
      hardRulesTh: [
        'english-skills-a = ภาค ก เท่านั้น; english-major = ภาค ข เท่านั้น — ห้ามปน',
        'education และ law = ภาค ข ตาม ก.ค.ศ. ว14/2566',
        'ห้ามแต่งสถิติความถี่ข้อสอบหรือน้ำหนักคะแนน',
        'ห้ามแต่ง URL; ห้ามอ้างว่าลิงก์เปิดได้ถ้า urlStatus เป็น unchecked หรือ needs_full_url',
        'หากข้อมูลไม่พอ ให้บอกว่าไม่พบข้อมูลที่ยืนยันได้',
      ],
    },
    appCatalogMetadata: {
      kind: 'app_catalog_metadata',
      mustScoreSample: mustTop,
      keywordHits,
      subjectCounts: {
        [SUBJECT_IDS.ENGLISH_SKILLS_A]: catalog.filter(r => r.subjectId === SUBJECT_IDS.ENGLISH_SKILLS_A).length,
        [SUBJECT_IDS.ENGLISH_MAJOR]: catalog.filter(r => r.subjectId === SUBJECT_IDS.ENGLISH_MAJOR).length,
        [SUBJECT_IDS.EDUCATION]: catalog.filter(r => r.subjectId === SUBJECT_IDS.EDUCATION).length,
        [SUBJECT_IDS.LAW]: catalog.filter(r => r.subjectId === SUBJECT_IDS.LAW).length,
        [SUBJECT_IDS.MATH]: catalog.filter(r => r.subjectId === SUBJECT_IDS.MATH).length,
      },
    },
    weaknessSummary: {
      kind: 'user_weakness_summary',
      observed: (input.weaknessAnalysis?.observedWeaknesses || []).slice(0, 8).map(w => ({
        subjectId: w.subjectId,
        avgPct: w.avgPct,
        attempts: w.attempts,
        confidence: w.confidence,
      })),
    },
    existingScheduleSummary: {
      kind: 'existing_schedule_summary',
      noteTh: 'ห้ามเขียนทับงาน status=done หรือ userEdited=true; เสนอเพิ่มเท่านั้น',
      tasks: existing,
    },
    recentMessages: trimMessages(input.recentMessages),
  }

  let json = JSON.stringify(payload)
  if (json.length > MAX_CONTEXT_JSON_CHARS) {
    payload.appCatalogMetadata.mustScoreSample = payload.appCatalogMetadata.mustScoreSample.slice(0, 12)
    payload.appCatalogMetadata.keywordHits = payload.appCatalogMetadata.keywordHits.slice(0, 6)
    payload.existingScheduleSummary.tasks = payload.existingScheduleSummary.tasks.slice(0, 20)
    json = JSON.stringify(payload)
  }

  return { payload, json, catalog, ranked }
}

export function buildSystemInstructions() {
  return [
    'You are a Thai teacher-assistant exam study coach for สพฐ. ครูผู้ช่วย.',
    'Return ONLY valid JSON matching the required schema. No markdown.',
    'intent MUST be exactly one of: help, show_today, show_exams, summarize_progress, find_resources, show_weakness, create_plan, revise_plan, add_task, remove_task, reschedule_task, change_duration, change_daily_limit, change_priority, clarify, explain_scope, unsupported.',
    'For scope/curriculum questions use intent=explain_scope (never invent intents like provide_info).',
    'Separate officialFacts from appCatalogMetadata from your own explanation in evidenceNotes.',
    'Never invent URLs, exam frequency stats, or official score weights.',
    'Never claim a resource URL is openable when urlStatus is unchecked or needs_full_url.',
    'Keep english-skills-a (Part ก) strictly separate from english-major (Part ข).',
    'education and law are Part ข. math and english-skills-a are Part ก.',
    'selectedResourceIds must be ids from the provided catalog sample only.',
    'Schedule changes are proposals only (needsConfirmation=true). Never imply they were saved.',
    'If evidence is insufficient, say so clearly in responseText and set intent to clarify or unsupported.',
    'Respond in the user language (Thai default).',
  ].join('\n')
}

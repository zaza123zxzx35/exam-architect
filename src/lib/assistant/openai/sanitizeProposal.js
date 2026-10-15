/**
 * Post-validate model output against the real curated catalog.
 * Drops unknown resource IDs and unsafe URL claims.
 */

import { enrichCuratedResources } from '../../curated/catalog.js'
import { parseAssistantAiResponse } from './schema.js'
import { looksLikeSecretLeak } from './config.js'

/**
 * @param {unknown} rawModelOutput
 * @param {{ catalog?: ReturnType<typeof enrichCuratedResources> }} [options]
 */
export function sanitizeAndValidateAiResult(rawModelOutput, options = {}) {
  const parsed = parseAssistantAiResponse(rawModelOutput)
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, code: 'schema_invalid' }
  }

  const catalog = options.catalog || enrichCuratedResources()
  const byId = new Map(catalog.map(r => [r.id, r]))

  const value = parsed.value
  if (looksLikeSecretLeak(value.responseText)) {
    return { ok: false, error: 'secret_leak_in_response', code: 'secret_leak' }
  }

  const validSelected = []
  const droppedIds = []
  for (const id of value.selectedResourceIds) {
    if (byId.has(id)) validSelected.push(id)
    else droppedIds.push(id)
  }

  let proposed = value.proposedScheduleChanges
  const droppedTasks = []
  if (proposed?.tasks?.length) {
    const tasks = []
    for (const t of proposed.tasks) {
      const row = byId.get(t.resourceId)
      if (!row) {
        droppedTasks.push(t.resourceId)
        continue
      }
      // Keep proposal even if URL incomplete — but annotate; never invent URL.
      tasks.push({
        ...t,
        title: t.title || row.title,
        examPart: row.examPart,
        subjectId: row.subjectId,
        urlStatus: row.urlStatus,
        warningTh: row.urlStatus === 'needs_full_url' || row.urlStatus === 'unchecked'
          ? `ลิงก์สถานะ ${row.urlStatus} — ยังไม่ยืนยันว่าเปิดได้`
          : null,
      })
    }
    proposed = tasks.length
      ? { ...proposed, tasks }
      : null
  }

  // Enforce English part separation in selected set
  const selectedRows = validSelected.map(id => byId.get(id)).filter(Boolean)
  const skills = selectedRows.filter(r => r.subjectId === 'english-skills-a')
  const major = selectedRows.filter(r => r.subjectId === 'english-major')
  if (skills.some(r => r.examPart !== 'ก') || major.some(r => r.examPart !== 'ข')) {
    return { ok: false, error: 'english_part_corruption', code: 'taxonomy_violation' }
  }

  const evidenceNotes = [
    ...value.evidenceNotes,
    ...(droppedIds.length ? [`ตัด resource id ที่ไม่มีในคลัง: ${droppedIds.slice(0, 8).join(', ')}`] : []),
    ...(droppedTasks.length ? [`ตัดงานที่ resourceId ไม่มีในคลัง: ${droppedTasks.slice(0, 8).join(', ')}`] : []),
  ]

  const urlWarnings = selectedRows
    .filter(r => r.urlStatus === 'needs_full_url' || r.urlStatus === 'unchecked')
    .map(r => `${r.id}: ${r.urlStatus} — ห้ามอ้างว่าเปิดได้`)

  return {
    ok: true,
    value: {
      ...value,
      selectedResourceIds: validSelected,
      proposedScheduleChanges: proposed,
      needsConfirmation: Boolean(proposed?.tasks?.length) || value.needsConfirmation,
      evidenceNotes: [...evidenceNotes, ...urlWarnings].slice(0, 30),
      selectedResources: selectedRows.map(r => ({
        id: r.id,
        title: r.title,
        examPart: r.examPart,
        subjectId: r.subjectId,
        urlStatus: r.urlStatus,
        canOpen: Boolean(r.canOpen),
      })),
    },
    droppedIds,
    droppedTasks,
  }
}

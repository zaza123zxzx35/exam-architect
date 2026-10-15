/**
 * Convert a validated AI proposal into a pendingChange, and apply on confirm.
 * Add-only. Never overwrites done / userEdited / existing ids.
 */

/**
 * @param {object} aiValue sanitized AI result
 * @param {object} schedule
 * @param {string} [lang]
 */
export function proposalToPendingChange(aiValue, schedule, lang = 'th') {
  const tasks = aiValue?.proposedScheduleChanges?.tasks || []
  if (!tasks.length) return null

  const existingIds = new Set((schedule?.tasks || []).map(t => String(t.id)))
  const doneResourceIds = new Set(
    (schedule?.tasks || [])
      .filter(t => t.status === 'done' && t.resourceId)
      .map(t => String(t.resourceId)),
  )

  const toAdd = []
  const skipped = []
  for (const t of tasks) {
    const id = `curated_${t.resourceId}`
    if (existingIds.has(id)) {
      skipped.push({ id, reason: 'already_exists' })
      continue
    }
    if (doneResourceIds.has(String(t.resourceId))) {
      skipped.push({ id, reason: 'resource_already_done' })
      continue
    }
    const minutes = Number(t.durationMinutes)
    toAdd.push({
      id,
      title: t.title || t.resourceId,
      plannedDate: t.plannedDate,
      status: 'pending',
      origin: 'curated-openai-proposal',
      examPart: t.examPart,
      subjectId: t.subjectId,
      resourceId: t.resourceId,
      urlStatus: t.urlStatus,
      estimatedMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 45,
      durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 45,
      durationIsEstimate: true,
      warningTh: t.warningTh || null,
    })
  }

  if (!toAdd.length) return null

  const summary = lang === 'en'
    ? `AI proposes +${toAdd.length} curated tasks (confirm to save; skipped ${skipped.length})`
    : `AI เสนอเพิ่ม ${toAdd.length} งานจากคลัง (ต้องยืนยันก่อนบันทึก · ข้าม ${skipped.length})`

  return {
    type: 'apply_openai_proposal',
    summary,
    tasks: toAdd,
    skipped,
    source: 'openai',
  }
}

/**
 * Apply a confirmed openai proposal add-only.
 * @param {object} schedule
 * @param {{ tasks?: object[] }} pending
 */
export function applyOpenAiProposal(schedule, pending) {
  const safe = schedule && typeof schedule === 'object'
    ? schedule
    : { tasks: [], sessions: [] }
  const rawTasks = Array.isArray(safe.tasks) ? safe.tasks : []
  const byId = new Map()
  for (const t of rawTasks) {
    if (t?.id != null) byId.set(String(t.id), t)
  }

  let added = 0
  let skippedExisting = 0
  let skippedProtected = 0

  for (const task of pending?.tasks || []) {
    if (!task?.id) continue
    const id = String(task.id)
    const prev = byId.get(id)
    if (prev) {
      // Never overwrite done / userEdited / existing rows
      if (prev.status === 'done' || prev.userEdited) skippedProtected += 1
      else skippedExisting += 1
      continue
    }
    byId.set(id, { ...task, id })
    added += 1
  }

  return {
    ok: true,
    schedule: {
      ...safe,
      tasks: [...byId.values()],
      updatedAt: new Date().toISOString(),
      lastOpenAiMerge: { added, skippedExisting, skippedProtected, at: new Date().toISOString() },
    },
    added,
    skippedExisting,
    skippedProtected,
  }
}

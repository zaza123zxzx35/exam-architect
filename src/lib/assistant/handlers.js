import { getExams, getPrimaryExam } from '../../data/examCalendar.js'
import { dailyPlan, getDayIndexForDate, getPlanDateByIndex } from '../../data/htmlPlannerData.js'
import { rescheduleUnfinished } from '../schedule/engine.js'
import { progressSnapshot } from '../schedule/progress.js'
import {
  applyPlanPreview,
  cancelPlanPreview,
  createEmptyPlannerRequest,
  defaultAvailabilityPreset,
  generatePlanPreview,
  interpretNaturalLanguage,
  listResourceCatalog,
  subjectIdsFromText,
} from '../smartPlanner/index.js'
import { listSupportedCommands } from './intents.js'
import { parseRelativeDate } from './relativeDates.js'

function reply(lang, th, en) {
  return lang === 'en' ? en : th
}

function summarizePreview(preview, lang) {
  if (!preview) return ''
  const s = preview.stats || {}
  if (lang === 'en') {
    return `Proposed: +${s.proposedSessionCount || 0} sessions, +${s.proposedTaskCount || 0} tasks` +
      (s.unscheduledCount ? `, ${s.unscheduledCount} could not fit` : '') +
      `. Existing ${s.existingSessionCount || 0} sessions kept.`
  }
  return `เสนอ: +${s.proposedSessionCount || 0} ช่วง, +${s.proposedTaskCount || 0} งาน` +
    (s.unscheduledCount ? `, จัดลงไม่ได้ ${s.unscheduledCount}` : '') +
    ` · ตารางเดิม ${s.existingSessionCount || 0} ช่วงคงอยู่`
}

function buildCreateRequest(text, context, dates) {
  const defaults = context.lastRequest || createEmptyPlannerRequest({
    availability: defaultAvailabilityPreset(),
    examId: getPrimaryExam().id,
    examDate: String(getPrimaryExam().startsAt).slice(0, 10),
    startDate: dates.todayIso(),
    includeExistingUnfinished: true,
    priority: 'high',
    sessionMinutes: 60,
    breakMinutes: 10,
  })
  const interpreted = interpretNaturalLanguage(text, {
    todayIso: dates.todayIso(),
    defaults,
  })
  return interpreted
}

export function handleHelp(lang) {
  const lines = listSupportedCommands(lang)
  return {
    messages: [
      reply(
        lang,
        `ฉันช่วยเรื่องแผนติวได้ดังนี้:\n- ${lines.join('\n- ')}\n\nคำสั่งที่เปลี่ยนตารางจะให้ดูตัวอย่างก่อน แล้วพิมพ์ "ยืนยัน" หรือ "ยกเลิก"`,
        `I can help with:\n- ${lines.join('\n- ')}\n\nSchedule changes show a preview first. Reply "confirm" or "cancel".`
      ),
    ],
    readOnly: true,
  }
}

export function handleShowToday(schedule, dates, lang) {
  const today = dates.todayIso()
  const dayIndex = getDayIndexForDate(today)
  const tasks = dayIndex >= 0 && dayIndex < dailyPlan.length ? dailyPlan[dayIndex] : []
  const dateIso = dayIndex >= 0 ? getPlanDateByIndex(dayIndex) : today
  const doneIds = new Set(
    (schedule.tasks || [])
      .filter(t => t.status === 'done' && String(t.plannedDate || '').startsWith(dateIso.slice(0, 10)))
      .map(t => t.id)
  )
  const htmlDone = (schedule.tasks || []).filter(t =>
    String(t.id).startsWith(`html_${dateIso}_`) && t.status === 'done'
  ).length
  const sessions = (schedule.sessions || [])
    .filter(s => s.date === today && s.status !== 'cancelled')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const taskLines = tasks.length
    ? tasks.map((t, i) => {
      const id = `html_${dateIso}_${i}`
      const mark = doneIds.has(id) || (schedule.tasks || []).find(x => x.id === id)?.status === 'done' ? '✓' : '○'
      return `${mark} ${t.text}`
    }).slice(0, 12)
    : [reply(lang, '(นอกช่วงแผน 34 วัน)', '(Outside the 34-day plan window)')]

  const sessionLines = sessions.slice(0, 8).map(s =>
    `${s.startTime}-${s.endTime} ${s.title}${s.status === 'done' ? ' ✓' : ''}`
  )

  const body = lang === 'en'
    ? `Today (${today})\nPlan tasks: ${htmlDone}/${tasks.length}\n${taskLines.join('\n')}\n\nSessions:\n${sessionLines.length ? sessionLines.join('\n') : '(none)'}`
    : `วันนี้ (${today})\nงานในแผน: ${htmlDone}/${tasks.length}\n${taskLines.join('\n')}\n\nช่วงตาราง:\n${sessionLines.length ? sessionLines.join('\n') : '(ไม่มี)'}`

  return { messages: [body], readOnly: true }
}

export function handleShowExams(lang) {
  const exams = getExams()
  const lines = exams.map(e => `${e.title}: ${e.labelLong}`)
  return {
    messages: [
      reply(lang, `วันสอบ:\n- ${lines.join('\n- ')}`, `Exam dates:\n- ${lines.join('\n- ')}`),
    ],
    readOnly: true,
  }
}

export function handleSummarizeProgress(schedule, lang) {
  const snap = progressSnapshot(schedule)
  const sessions = schedule.sessions || []
  const msg = lang === 'en'
    ? `Progress: ${snap.taskDone}/${snap.taskTotal} plan tasks done · ${snap.sessionDone}/${snap.sessionTotal} sessions done · projection consistent: ${snap.consistent ? 'yes' : 'no'}`
    : `ความคืบหน้า: งานแผน ${snap.taskDone}/${snap.taskTotal} · ช่วงตาราง ${snap.sessionDone}/${sessions.length} · ความสอดคล้อง: ${snap.consistent ? 'ตรงกัน' : 'ไม่ตรง'}`
  return { messages: [msg], readOnly: true }
}

export function handleFindResources(text, lang) {
  const subjects = subjectIdsFromText(text)
  const catalog = listResourceCatalog().filter(r => r.url)
  let hits = catalog
  if (subjects.length) {
    const keys = subjects.join(' ')
    hits = catalog.filter(r => {
      const hay = `${r.title} ${r.url}`.toLowerCase()
      return subjects.some(id => hay.includes(id)) ||
        /english|อังกฤษ|กฎหมาย|คณิต|education|hrms|drive/i.test(hay + keys)
    })
    // Prefer keyword overlap with message
    const lower = text.toLowerCase()
    hits = catalog.filter(r => {
      const hay = `${r.title}`.toLowerCase()
      if (/อังกฤษ|english|วิชาเอก/i.test(lower)) return /อังกฤษ|english|วิชาเอก|grammar|reading/i.test(hay)
      if (/กฎหมาย|law/i.test(lower)) return /กฎหมาย|law|พ\.?ร\.?บ|drive/i.test(hay)
      if (/สมัคร|hrms|เขต/i.test(lower)) return /hrms|สมัคร|ประกาศ|เขต/i.test(hay + r.url)
      return subjects.length ? true : /./.test(hay)
    })
  }
  hits = hits.slice(0, 8)
  if (!hits.length) {
    return {
      messages: [
        reply(
          lang,
          'ไม่พบลิงก์ในคลังที่มีอยู่สำหรับคำขอนี้ (จะไม่สร้าง URL ใหม่)',
          'No matching links in the existing catalog (I will not invent URLs).'
        ),
      ],
      readOnly: true,
    }
  }
  const lines = hits.map(h => `- ${h.title}: ${h.url}`)
  return {
    messages: [
      reply(lang, `ทรัพยากรที่พบ:\n${lines.join('\n')}`, `Resources found:\n${lines.join('\n')}`),
    ],
    readOnly: true,
  }
}

export function handleCreateOrRevisePlan(text, schedule, context, dates, lang, mode) {
  const interpreted = buildCreateRequest(text, context, dates)
  if (!interpreted.ok) {
    const qs = interpreted.clarifyingQuestions || []
    return {
      messages: [
        reply(
          lang,
          `ข้อมูลยังไม่พอสำหรับ${mode === 'revise' ? 'แก้' : 'สร้าง'}แผน:\n- ${qs.join('\n- ') || interpreted.errors.join('\n- ')}`,
          `I need more details to ${mode === 'revise' ? 'revise' : 'create'} a plan:\n- ${(qs.length ? qs : interpreted.errors).join('\n- ')}`
        ),
      ],
      clarifying: true,
      lastRequest: interpreted.value,
      readOnly: true,
    }
  }

  // Merge revise tweaks onto last request
  let request = interpreted.value
  if (mode === 'revise' && context.lastRequest) {
    request = {
      ...context.lastRequest,
      ...interpreted.value,
      subjects: interpreted.value.subjects?.length
        ? interpreted.value.subjects
        : context.lastRequest.subjects,
      availability: interpreted.value.availability?.length
        ? interpreted.value.availability
        : context.lastRequest.availability,
      topics: interpreted.value.topics?.length
        ? interpreted.value.topics
        : context.lastRequest.topics,
    }
  }

  // Relative start date override
  const rel = parseRelativeDate(text, {
    todayIso: dates.todayIso(),
    addDays: (iso, n) => dates.addDays(iso, n),
  })
  if (rel.iso && /start|เริ่ม|จาก/i.test(text)) {
    request = { ...request, startDate: rel.iso }
  }

  const generated = generatePlanPreview(schedule, request, { todayIso: dates.todayIso() })
  if (!generated.ok) {
    return {
      messages: [
        reply(
          lang,
          `สร้างตัวอย่างไม่ได้: ${generated.error}\n${(generated.validation?.clarifyingQuestions || []).join('\n')}`,
          `Could not build a preview: ${generated.error}`
        ),
      ],
      lastRequest: request,
      readOnly: true,
    }
  }

  const summary = summarizePreview(generated.preview, lang)
  return {
    messages: [
      reply(
        lang,
        `${mode === 'revise' ? 'ปรับแผนแล้ว' : 'ได้ตัวอย่างแผนแล้ว'}\n${summary}\n\nพิมพ์ "ยืนยัน" เพื่อบันทึก หรือ "ยกเลิก" เพื่อทิ้งตัวอย่าง`,
        `${mode === 'revise' ? 'Revised preview ready' : 'Preview ready'}\n${summary}\n\nReply "confirm" to apply or "cancel" to discard.`
      ),
    ],
    pendingChange: {
      type: 'apply_plan_preview',
      preview: generated.preview,
      summary,
    },
    lastRequest: request,
    readOnly: false,
  }
}

export function handleAddTask(text, schedule, context, dates, lang) {
  const subjects = subjectIdsFromText(text)
  const topicMatch = text.match(/(?:เพิ่ม(?:งาน)?|add(?: task)?)\s*[:-]?\s*(.+)$/i)
  const topic = topicMatch ? topicMatch[1].trim().slice(0, 80) : null
  if (!subjects.length && !topic) {
    return {
      messages: [
        reply(
          lang,
          'จะเพิ่มงานวิชาอะไร หรือหัวข้ออะไร? เช่น "เพิ่มงาน อังกฤษ Grammar"',
          'Which subject or topic should I add? e.g. "add task English Grammar"'
        ),
      ],
      clarifying: true,
      readOnly: true,
    }
  }

  const request = createEmptyPlannerRequest({
    ...(context.lastRequest || {}),
    examId: context.lastRequest?.examId || getPrimaryExam().id,
    examDate: context.lastRequest?.examDate || String(getPrimaryExam().startsAt).slice(0, 10),
    startDate: dates.todayIso(),
    endDate: context.lastRequest?.endDate || String(getPrimaryExam().startsAt).slice(0, 10),
    subjects: subjects.length ? subjects : (context.lastRequest?.subjects || ['general']),
    topics: topic ? [topic] : (context.lastRequest?.topics || []),
    availability: context.lastRequest?.availability?.length
      ? context.lastRequest.availability
      : defaultAvailabilityPreset(),
    sessionMinutes: context.lastRequest?.sessionMinutes || 60,
    breakMinutes: context.lastRequest?.breakMinutes ?? 10,
    priority: context.lastRequest?.priority || 'med',
    includeExistingUnfinished: false,
    targetSessionCount: 1,
  })

  const generated = generatePlanPreview(schedule, request, { todayIso: dates.todayIso() })
  if (!generated.ok) {
    return {
      messages: [reply(lang, `เพิ่มงานไม่ได้: ${generated.error}`, `Could not add task: ${generated.error}`)],
      readOnly: true,
    }
  }
  const summary = summarizePreview(generated.preview, lang)
  return {
    messages: [
      reply(
        lang,
        `เสนอเพิ่มงาน:\n${summary}\nยืนยันหรือยกเลิก?`,
        `Proposed task addition:\n${summary}\nConfirm or cancel?`
      ),
    ],
    pendingChange: { type: 'apply_plan_preview', preview: generated.preview, summary },
    lastRequest: request,
  }
}

export function handleRemoveTask(text, schedule, lang) {
  const needle = text
    .replace(/ลบ(งาน|รายการ)?|remove (the )?task|delete (the )?task|เอาออก/gi, '')
    .trim()
    .toLowerCase()
  if (!needle || needle.length < 2) {
    return {
      messages: [
        reply(lang, 'ระบุชื่องานหรือรหัสงานที่จะลบด้วย', 'Please name the task or id to remove.'),
      ],
      clarifying: true,
      readOnly: true,
    }
  }

  const candidates = (schedule.tasks || []).filter(t =>
    t.status !== 'done'
    && (String(t.id).toLowerCase().includes(needle) || String(t.title).toLowerCase().includes(needle))
  ).slice(0, 5)

  if (!candidates.length) {
    return {
      messages: [reply(lang, `ไม่พบงานที่ตรงกับ "${needle}"`, `No task matched "${needle}".`)],
      readOnly: true,
    }
  }

  return {
    messages: [
      reply(
        lang,
        `จะลบงานเหล่านี้ (ยังไม่บันทึก):\n${candidates.map(t => `- ${t.id}: ${t.title}`).join('\n')}\nพิมพ์ "ยืนยัน" หรือ "ยกเลิก"`,
        `Will remove (not saved yet):\n${candidates.map(t => `- ${t.id}: ${t.title}`).join('\n')}\nReply "confirm" or "cancel".`
      ),
    ],
    pendingChange: {
      type: 'remove_tasks',
      taskIds: candidates.map(t => t.id),
      summary: `remove ${candidates.length} tasks`,
    },
  }
}

export function handleReschedule(schedule, dates, lang) {
  const draft = {
    ...schedule,
    tasks: schedule.tasks.map(t => ({ ...t, rescheduleHistory: [...(t.rescheduleHistory || [])] })),
    sessions: schedule.sessions.map(s => ({ ...s })),
  }
  const result = rescheduleUnfinished(draft, {
    todayIso: dates.todayIso(),
    hardStopDate: (schedule.exams?.[0]?.startsAt || '').slice(0, 10),
  })
  const moved = result.report.moved || []
  const skipped = result.report.skipped || []

  // Build a synthetic preview-like apply payload
  const newSessions = result.schedule.sessions.filter(
    s => s.origin === 'scheduler' && !(schedule.sessions || []).some(old => old.id === s.id)
  )
  const taskPatches = result.schedule.tasks.filter((t) => {
    const prev = schedule.tasks.find(p => p.id === t.id)
    return prev && (prev.plannedDate !== t.plannedDate || prev.status !== t.status)
  })

  if (!moved.length && !newSessions.length) {
    return {
      messages: [
        reply(
          lang,
          skipped.length
            ? `ไม่มีงานที่เลื่อนได้ (${skipped[0]?.reason || 'no-slot'})`
            : 'ไม่มีงานค้างที่ต้องเลื่อน',
          skipped.length
            ? `Nothing to reschedule (${skipped[0]?.reason || 'no-slot'})`
            : 'No unfinished work to reschedule.'
        ),
      ],
      readOnly: true,
    }
  }

  return {
    messages: [
      reply(
        lang,
        `เสนอเลื่อนงานค้าง ${moved.length} รายการ (+${newSessions.length} ช่วงใหม่) · ข้าม ${skipped.length}\nพิมพ์ "ยืนยัน" หรือ "ยกเลิก"`,
        `Propose rescheduling ${moved.length} items (+${newSessions.length} sessions) · skipped ${skipped.length}\nReply "confirm" or "cancel".`
      ),
    ],
    pendingChange: {
      type: 'apply_reschedule',
      nextSchedule: result.schedule,
      summary: `reschedule ${moved.length}`,
      taskPatches: taskPatches.map(t => t.id),
      sessionIds: newSessions.map(s => s.id),
    },
  }
}

export function handleChangeDurationOrLimit(text, schedule, context, dates, lang, kind) {
  if (!context.lastRequest && !context.pendingChange) {
    // Allow starting a fresh draft with the change
  }
  const minutes = (() => {
    const m = text.match(/(\d{1,3})\s*(นาที|min)/i)
    if (m) return Number(m[1])
    const h = text.match(/(\d+(?:\.\d+)?)\s*(ชม|ชั่วโมง|h|hr)/i)
    if (h) return Math.round(Number(h[1]) * 60)
    return null
  })()

  if (minutes == null) {
    return {
      messages: [
        reply(
          lang,
          kind === 'daily'
            ? 'ระบุลิมิตต่อวันเป็นนาทีหรือชั่วโมง เช่น "ลิมิต 3 ชม./วัน"'
            : 'ระบุความยาวช่วง เช่น "ช่วงละ 45 นาที"',
          kind === 'daily'
            ? 'Specify a daily limit, e.g. "daily limit 3 hours"'
            : 'Specify session length, e.g. "45 minute sessions"'
        ),
      ],
      clarifying: true,
      readOnly: true,
    }
  }

  const base = context.lastRequest || createEmptyPlannerRequest({
    examId: getPrimaryExam().id,
    examDate: String(getPrimaryExam().startsAt).slice(0, 10),
    startDate: dates.todayIso(),
    subjects: subjectIdsFromText(text).length ? subjectIdsFromText(text) : ['general'],
    availability: defaultAvailabilityPreset(),
    includeExistingUnfinished: false,
    targetSessionCount: 3,
  })

  const request = {
    ...base,
    ...(kind === 'daily'
      ? { dailyLimitMinutes: minutes }
      : { sessionMinutes: minutes }),
  }

  return handleCreateOrRevisePlan(
    text,
    schedule,
    { ...context, lastRequest: request },
    dates,
    lang,
    'revise'
  )
}

export function handleChangePriority(text, schedule, context, dates, lang) {
  let priority = null
  if (/high|สำคัญมาก|เร่งด่วน/i.test(text)) priority = 'high'
  else if (/low|สำคัญน้อย/i.test(text)) priority = 'low'
  else if (/med|medium|ปานกลาง/i.test(text)) priority = 'med'
  if (!priority) {
    return {
      messages: [
        reply(lang, 'จะตั้งความสำคัญเป็น high / med / low?', 'Set priority to high, med, or low?'),
      ],
      clarifying: true,
      readOnly: true,
    }
  }
  const base = context.lastRequest || createEmptyPlannerRequest({
    examId: getPrimaryExam().id,
    examDate: String(getPrimaryExam().startsAt).slice(0, 10),
    startDate: dates.todayIso(),
    subjects: ['general'],
    availability: defaultAvailabilityPreset(),
    includeExistingUnfinished: false,
    targetSessionCount: 2,
  })
  return handleCreateOrRevisePlan(
    text,
    schedule,
    { ...context, lastRequest: { ...base, priority } },
    dates,
    lang,
    'revise'
  )
}

export function handleConfirm(schedule, context, lang) {
  const pending = context.pendingChange
  if (!pending) {
    return {
      messages: [reply(lang, 'ไม่มีตัวอย่างที่รอยืนยัน', 'There is no pending change to confirm.')],
      readOnly: true,
    }
  }

  if (pending.type === 'apply_plan_preview') {
    const applied = applyPlanPreview(schedule, pending.preview)
    if (!applied.ok) {
      return {
        messages: [reply(lang, `บันทึกไม่สำเร็จ: ${applied.error}`, `Apply failed: ${applied.error}`)],
        pendingChange: pending,
        readOnly: false,
      }
    }
    return {
      messages: [
        reply(
          lang,
          `บันทึกแล้ว: +${applied.applied.sessions.length} ช่วง, +${applied.applied.tasks.length} งาน`,
          `Saved: +${applied.applied.sessions.length} sessions, +${applied.applied.tasks.length} tasks`
        ),
      ],
      applySchedule: applied.schedule,
      clearPending: true,
      readOnly: false,
    }
  }

  if (pending.type === 'remove_tasks') {
    const removeSet = new Set(pending.taskIds || [])
    // Never remove completed tasks
    const next = {
      ...schedule,
      tasks: schedule.tasks.filter(t => !(removeSet.has(t.id) && t.status !== 'done')),
      sessions: schedule.sessions.map(s => ({
        ...s,
        taskIds: (s.taskIds || []).filter(id => !removeSet.has(id)),
      })).filter(s => {
        // Drop smart sessions solely tied to removed tasks
        if (s.origin !== 'smart-planner' && s.origin !== 'scheduler') return true
        const tied = (s.taskIds || []).some(id => removeSet.has(id))
        const onlyThose = (pending.taskIds || []).length && (s.taskIds || []).every(id => removeSet.has(id))
        if (tied && onlyThose && s.status !== 'done') return false
        return true
      }),
    }
    return {
      messages: [
        reply(lang, `ลบแล้ว ${pending.taskIds.length} งาน`, `Removed ${pending.taskIds.length} tasks`),
      ],
      applySchedule: next,
      clearPending: true,
    }
  }

  if (pending.type === 'apply_reschedule') {
    return {
      messages: [
        reply(lang, `เลื่อนงานแล้ว: ${pending.summary}`, `Rescheduled: ${pending.summary}`),
      ],
      applySchedule: pending.nextSchedule,
      clearPending: true,
    }
  }

  return {
    messages: [reply(lang, 'ชนิดการเปลี่ยนแปลงนี้ยังไม่รองรับ', 'This change type is not supported.')],
    readOnly: true,
  }
}

export function handleCancel(schedule, context, lang) {
  if (!context.pendingChange) {
    return {
      messages: [reply(lang, 'ไม่มีตัวอย่างให้ยกเลิก', 'Nothing to cancel.')],
      readOnly: true,
    }
  }
  cancelPlanPreview(schedule)
  return {
    messages: [
      reply(lang, 'ยกเลิกแล้ว — ตารางไม่เปลี่ยน', 'Cancelled — schedule unchanged.'),
    ],
    clearPending: true,
    readOnly: true,
  }
}

export function handleUnsupported(lang, classification) {
  const alts = classification.alternatives || []
  return {
    messages: [
      reply(
        lang,
        alts.length
          ? `ยังไม่แน่ใจว่าต้องการอะไร หมายถึง "${alts[0]}" หรือ "${alts[1]}" หรือพิมพ์ "ช่วยเหลือ"`
          : 'ยังไม่รองรับคำสั่งนี้ พิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้',
        alts.length
          ? `I'm not sure — did you mean "${alts[0]}" or "${alts[1]}"? Or type "help".`
          : 'That command is not supported. Type "help" for the list.'
      ),
    ],
    clarifying: true,
    readOnly: true,
  }
}

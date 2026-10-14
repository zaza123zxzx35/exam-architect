import { getExamById, getPrimaryExam } from '../../data/examCalendar.js'
import { bangkokTodayIso } from '../../data/htmlPlannerData.js'
import {
  proposeSessionsForTasks,
  sortTasksForScheduling,
} from '../schedule/engine.js'
import { isValidIsoDate } from '../schedule/time.js'
import { validatePlannerRequest } from './schema.js'
import {
  listResourceCatalog,
  PLANNER_SUBJECTS,
  resolveResourcesForSubjects,
} from './subjects.js'

function explainUnscheduled(reason) {
  switch (reason) {
    case 'no-available-slot':
      return 'ไม่มีช่วงว่างที่พอสำหรับงานนี้ก่อนวันสอบ (หรือชนกับตารางเดิม)'
    case 'duplicate-session-id':
      return 'รายการนี้ถูกเสนอไปแล้วในแผน (กันซ้ำ)'
    case 'invalid-today':
      return 'วันที่เริ่มต้นไม่ถูกต้อง'
    case 'loop-guard':
      return 'หยุดเพื่อกันวนซ้ำ — ลดจำนวนงานหรือขยายเวลาว่าง'
    case 'missing-resource':
      return 'ไม่พบลิงก์ทรัพยากรที่เลือกในคลังที่มีอยู่'
    case 'no-tasks':
      return 'ไม่มีงานให้จัดหลังจากกรองวิชา/หัวข้อ'
    default:
      return reason || 'จัดลงตารางไม่ได้'
  }
}

function matchesSubjectFilters(task, subjectIds, topics) {
  if (!subjectIds.length && !topics.length) return true
  const hay = `${task.title || ''} ${task.resourceUrl || ''}`
  const subjectOk = !subjectIds.length || subjectIds.some((id) => {
    const subject = PLANNER_SUBJECTS.find(s => s.id === id)
    if (!subject) return false
    return subject.keywords.some(k => hay.toLowerCase().includes(String(k).toLowerCase()))
      || subject.resourceMatchers.some(re => re.test(hay))
  })
  const topicOk = !topics.length || topics.some(t => hay.toLowerCase().includes(String(t).toLowerCase()))
  if (subjectIds.length && topics.length) return subjectOk && topicOk
  if (subjectIds.length) return subjectOk
  return topicOk
}

function buildSmartTasks(request, resourceMatches) {
  const tasks = []
  const subjects = request.subjects.length ? request.subjects : ['general']

  let index = 0
  for (const subjectId of subjects) {
    const subject = PLANNER_SUBJECTS.find(s => s.id === subjectId)
    const resources = resourceMatches.matched.filter(r => r.subjectId === subjectId && r.url)
    const topicTitles = request.topics.length
      ? request.topics
      : [subject?.label || subjectId]

    for (const topic of topicTitles) {
      const resource = resources.length ? resources[index % resources.length] : undefined
      tasks.push({
        id: `smart_task_${subjectId}_${index}`,
        title: `ติว${subject?.label || subjectId}: ${topic}`,
        type: 'study',
        subjectId,
        topicId: topic,
        resourceUrl: resource?.url,
        priority: request.priority,
        plannedDate: request.startDate,
        originalPlannedDate: request.startDate,
        durationMinutes: request.sessionMinutes,
        deadline: request.examDate || undefined,
        examId: request.examId || undefined,
        status: 'pending',
        origin: 'smart-planner',
        rescheduleHistory: [],
      })
      index += 1
      if (request.targetSessionCount && index >= request.targetSessionCount) {
        return tasks
      }
    }
  }

  if (!tasks.length && request.topics.length) {
    tasks.push({
      id: 'smart_task_topic_0',
      title: `ติว: ${request.topics[0]}`,
      type: 'study',
      priority: request.priority,
      plannedDate: request.startDate,
      originalPlannedDate: request.startDate,
      durationMinutes: request.sessionMinutes,
      deadline: request.examDate || undefined,
      examId: request.examId || undefined,
      status: 'pending',
      origin: 'smart-planner',
      rescheduleHistory: [],
    })
  }

  return tasks
}

function collectExistingUnfinished(schedule, request) {
  if (!request.includeExistingUnfinished) return []
  return (schedule.tasks || []).filter((task) => {
    if (String(task.id).startsWith('smart_task_')) return false
    if (task.status === 'done' || task.status === 'cancelled') return false
    return matchesSubjectFilters(task, request.subjects, request.topics)
  })
}

/**
 * Build a reviewable plan preview. Does not write to storage.
 */
export function generatePlanPreview(schedule, rawRequest, options = {}) {
  const todayIso = options.todayIso || bangkokTodayIso()
  const validated = validatePlannerRequest(rawRequest)
  if (!validated.ok) {
    return {
      ok: false,
      preview: null,
      validation: validated,
      error: validated.errors[0] || 'validation-failed',
    }
  }

  const request = { ...validated.value }
  if (!request.startDate) request.startDate = todayIso

  if (!request.examDate && request.examId) {
    const exam = getExamById(request.examId)
    if (exam) request.examDate = String(exam.startsAt).slice(0, 10)
  }
  if (!request.examDate) {
    const primary = getPrimaryExam()
    request.examId = request.examId || primary.id
    request.examDate = String(primary.startsAt).slice(0, 10)
  }
  if (!request.endDate) request.endDate = request.examDate

  if (!isValidIsoDate(request.startDate) || !isValidIsoDate(request.examDate)) {
    return {
      ok: false,
      preview: null,
      validation: validated,
      error: 'invalid-dates',
    }
  }

  if (!request.availability.length) {
    return {
      ok: false,
      preview: null,
      validation: {
        ...validated,
        ok: false,
        clarifyingQuestions: [
          ...validated.clarifyingQuestions,
          'ยังไม่มีช่วงเวลาว่าง — ระบุวันและช่วงเวลาที่เรียนได้',
        ],
      },
      error: 'missing-availability',
    }
  }

  const resourceMatches = resolveResourcesForSubjects(request.subjects)
  const catalog = listResourceCatalog()
  const selectedResources = []
  const missingResources = []

  for (const id of request.resourceIds) {
    const hit = catalog.find(r => r.id === id)
    if (!hit || !hit.url) missingResources.push({ id, reason: 'missing-resource' })
    else selectedResources.push(hit)
  }

  const smartTasks = buildSmartTasks(request, resourceMatches)
  if (selectedResources.length) {
    smartTasks.forEach((task, i) => {
      task.resourceUrl = selectedResources[i % selectedResources.length].url
    })
  }

  const existingCapped = sortTasksForScheduling(
    collectExistingUnfinished(schedule, request),
    schedule.exams,
    request.startDate
  ).slice(0, Math.max(0, 12 - smartTasks.length))

  const packingTasks = [...smartTasks, ...existingCapped]

  if (!packingTasks.length) {
    return {
      ok: false,
      preview: null,
      validation: validated,
      error: 'no-tasks',
      explanations: [{ reason: 'no-tasks', message: explainUnscheduled('no-tasks') }],
    }
  }

  const packing = proposeSessionsForTasks(schedule, packingTasks, {
    todayIso: request.startDate,
    hardStopDate: request.endDate || request.examDate,
    breakMinutes: request.breakMinutes,
    maxSessionMinutes: request.sessionMinutes,
    dailyLimitMinutes: request.dailyLimitMinutes,
    availability: request.availability,
    idPrefix: 'smart',
    sessionNote: 'Smart Planner preview',
  })

  const preservedSessionIds = (schedule.sessions || []).map(s => s.id)
  const unscheduled = [
    ...packing.unscheduled.map(u => ({
      ...u,
      message: explainUnscheduled(u.reason),
    })),
    ...missingResources.map(m => ({
      taskId: m.id,
      reason: m.reason,
      message: explainUnscheduled(m.reason),
    })),
    ...resourceMatches.missing.map(subjectId => ({
      taskId: `subject:${subjectId}`,
      reason: 'missing-resource',
      message: `วิชา ${subjectId}: ไม่พบลิงก์ในคลังทรัพยากรที่มีอยู่ (ไม่สร้าง URL ใหม่)`,
    })),
  ]

  const preview = {
    id: `preview_${request.startDate}_${smartTasks.length}`,
    createdAt: new Date().toISOString(),
    request,
    proposedTasks: smartTasks,
    reusedTaskIds: existingCapped.map(t => t.id),
    proposedSessions: packing.proposedSessions,
    scheduled: packing.scheduled,
    unscheduled,
    preservedSessionIds,
    resourceMatches: {
      matched: resourceMatches.matched,
      missingSubjects: resourceMatches.missing,
      selected: selectedResources,
      incomplete: resourceMatches.matched.filter(r => r.incomplete),
    },
    stats: {
      existingSessionCount: preservedSessionIds.length,
      proposedSessionCount: packing.proposedSessions.length,
      proposedTaskCount: smartTasks.length,
      reusedTaskCount: existingCapped.length,
      unscheduledCount: unscheduled.filter(u => u.reason === 'no-available-slot').length,
    },
  }

  return {
    ok: true,
    preview,
    validation: validated,
    error: null,
  }
}

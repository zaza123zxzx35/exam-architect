export {
  SCHEDULE_KEY,
  SCHEDULE_SCHEMA_VERSION,
  SCHEDULE_ENGINE_VERSION,
  LEGACY_HTML_KEY,
  LEGACY_TIMETABLE_KEY,
  DEFAULT_AVAILABILITY,
} from './constants.js'

export {
  normalizeTime,
  timeToMinutes,
  isValidIsoDate,
  addDaysIso,
  weekdayUtc,
  sessionInterval,
  intervalsOverlap,
  intervalsAdjacent,
} from './time.js'

export {
  createEmptySchedule,
  htmlTaskId,
  inferTaskType,
  estimateMinutes,
  buildTasksFromHtmlPlan,
  parseSlotTimeRange,
  sessionsFromTimetableDays,
  timetableDaysFromSessions,
  isScheduleStore,
} from './model.js'

export {
  validateSession,
  validateTask,
  detectConflicts,
  canAddSession,
  sortTasksForScheduling,
  splitTask,
  rescheduleUnfinished,
  markTaskCompletion,
} from './engine.js'

export {
  scheduleToHtmlPlannerState,
  parseHtmlTaskId,
  isScheduleTaskDone,
  dayCompletionFromSchedule,
  progressSnapshot,
} from './progress.js'

export {
  sanitizeSchedule,
  buildScheduleFromSources,
  ensureCanonicalHtmlTasks,
  loadOrMigrateSchedule,
  saveSchedule,
  loadSchedule,
} from './migrate.js'

export {
  getScheduleSnapshot,
  resetScheduleCache,
  subscribeSchedule,
  updateSchedule,
  ensureSessionsFromSeed,
  remigrateSchedule,
} from './store.js'

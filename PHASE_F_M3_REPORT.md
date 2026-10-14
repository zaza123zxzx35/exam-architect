# Phase F — M3 Unified Schedule Engine Report

**Status:** Complete  
**Date:** 2026-10-14  
**Scope:** Unified schedule/task model + deterministic engine + page wiring (M4/M5 not started)

## Step 1 — Audit

See [PHASE_F_M3_AUDIT.md](./PHASE_F_M3_AUDIT.md). Confirmed dual calendars (HTML Oct 12–Nov 14 vs Timetable Oct 6–Nov 13), dual progress stores (`kru_thp_69_v1` vs `daily_timetable_v8`), and unstable HTML index IDs before migration.

## Single source of truth

| Key | Role |
|---|---|
| `kru_schedule_v1` | **Runtime SSOT** — tasks, sessions, notes, availability, exam refs |
| `kru_thp_69_v1` | Dual-written legacy HTML progress (never deleted) |
| `daily_timetable_v8` | Dual-written Timetable day tree (never deleted) |
| `kru_unified_v1` | M1 snapshot only (unchanged role) |

Stable task IDs: `html_{YYYY-MM-DD}_{index}` (139 tasks from 34-day plan).  
Sessions retain Timetable slot ids (`sN`, user ids, `resched_*`).

### localStorage limitations (documented)

- Browser-only; no cross-device sync; quota ~5MB.
- Concurrent tabs can race (last write wins).
- Migrations are idempotent and never delete legacy keys; malformed `kru_schedule_v1` is sanitized and rebuilt from legacy + HTML seed.

## Engine (deterministic, no LLM)

Module: `src/lib/schedule/engine.js`

- Validate dates/durations
- Overlap detection (adjacent end==start allowed)
- Availability packing + reschedule unfinished work
- Priority: overdue → importance → nearer exam weight
- Task splitting with hard stop (max 24 parts)
- Loop guards; duplicate session-id skip; completed tasks untouched

## Page integration

| Page | Data path |
|---|---|
| Today / Overview / History | `useHtmlPlannerState` → schedule tasks + notes (projected to HTML `{days,notes}` for existing UI) |
| Timetable | `useScheduleStore` → sessions; seeds from generator if empty; rejects overlapping adds |
| Progress badges | Same store (`progressSnapshot` / projected completion) |

Preserved counts: **34** plan days, **139** HTML tasks (verified in tests, not assumed 1:1 with Timetable slots).

## Files added

- `src/lib/schedule/constants.js`
- `src/lib/schedule/time.js`
- `src/lib/schedule/model.js`
- `src/lib/schedule/engine.js` (+ `engine.test.js`)
- `src/lib/schedule/progress.js` (+ `progress.test.js`)
- `src/lib/schedule/migrate.js` (+ `migrate.test.js`)
- `src/lib/schedule/store.js`
- `src/lib/schedule/index.js`
- `src/hooks/useScheduleStore.js`
- `PHASE_F_M3_AUDIT.md`
- `PHASE_F_M3_REPORT.md`

## Files updated

- `src/hooks/useHtmlPlannerState.js` — schedule-backed
- `src/components/StorageBootstrap.jsx` — schedule migrate on boot
- `src/pages/Timetable.jsx` — schedule sessions + overlap guard
- `src/pages/Today.jsx` — reschedule unfinished control
- `README.md`

## Tests executed

| Command | Result |
|---|---|
| `npm test` | **41/41 passed** (9 files) |
| `npm run lint` | **clean** (0 warnings) |
| `npm run build` | **success** |

Coverage includes: overlaps, adjacent sessions, no available slots, exam/priority ordering, reschedule + duplicate prevention, completed-task preservation, localStorage migrate + malformed recovery, timezone/date boundaries, progress consistency (139/34).

## Known limitations

- Timetable sessions and HTML day-tasks remain **linked by schedule store**, not always by `taskIds` on every seed slot (seed sessions start with empty `taskIds`; reschedule sessions set `taskIds`).
- Plan (`plan_progress`) / Dashboard topic checklist stay on legacy English keys (out of M3 HTML/Timetable scope).
- Smart Planner UI (M4) and AI assist (M5) not implemented.
- No deploy performed.

## Stop point

**M3 complete. Waiting for approval before M4.**

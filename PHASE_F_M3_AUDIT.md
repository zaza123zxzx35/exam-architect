# M3 Step 1 — Schedule audit (pre-implementation)

## Current data sources (conflicts)

| Source | Location | Role |
|---|---|---|
| HTML `dailyPlan` | `src/data/htmlPlannerData.js` | 34 days / 139 day-tasks for Today/Overview/History |
| `kru_thp_69_v1` | localStorage | `{ days: { date: { index: bool } }, notes }` progress for HTML pages |
| Timetable generator | `src/pages/Timetable.jsx` `generateTimetable()` | Seed slots Oct 6–Nov 13 with times |
| `daily_timetable_v8` | localStorage | Editable day/slot tree (`done`, notes, links) |
| `examCalendar.js` | module | Authoritative exam datetimes |
| `kru_unified_v1` | localStorage | M1 migrate snapshot; **not** runtime SSOT for pages |

## Conventions today

- Dates: `YYYY-MM-DD` Bangkok calendar (`bangkokTodayIso`)
- HTML task identity: **index within day** (not stable across reorders)
- Timetable slot identity: `sN` / `s${Date.now()}`
- Timezone: Asia/Bangkok for “today”; exam times use `+07:00`
- Progress: HTML pages count `days[date][index]`; Timetable counts `slot.done`

## Conflicts

1. Two calendars (HTML starts Oct 12; Timetable starts Oct 6).  
2. Two progress stores (`kru_thp_69_v1` vs slot `done`).  
3. No overlap detection when adding Timetable slots.  
4. Task IDs unstable (array index).  

## Minimal migration plan

1. Introduce `kru_schedule_v1` as runtime SSOT for **tasks + sessions + notes**.  
2. Seed tasks from HTML `dailyPlan` with stable ids `html_{date}_{index}`.  
3. Seed sessions from existing `daily_timetable_v8` (or generator if absent).  
4. Import completions from `kru_thp_69_v1` onto tasks; import slot `done` onto sessions.  
5. Dual-write legacy keys on change (recoverable).  
6. Never delete legacy keys.  
7. Deterministic engine module for validate/overlap/reschedule (no LLM).  

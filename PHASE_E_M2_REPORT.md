# Phase E — M2 HTML Feature Parity Report

**Status:** Complete  
**Date:** 2026-10-14  
**Scope:** Today, Overview, History, Resources only (M3–M5 not started)

## Migration map

| HTML view | React route | Data source |
|---|---|---|
| `view-today` | `/today` | `src/data/htmlPlannerData.js` ← `dailyPlan`, `motivators` |
| `view-overview` | `/overview` | same + `kru_thp_69_v1` progress |
| `view-history` | `/history` | same + `phases` |
| `view-resources` | `/resources` | `courses`, `importantLinks`, link inventory accounting |
| Progress | shared | `localStorage` key `kru_thp_69_v1` (HTML-compatible) |

## Files changed / added

**Added**

- `src/data/htmlPlannerData.js` (+ tests)
- `src/lib/planner/htmlPlannerState.js` (+ tests)
- `src/lib/planner/formatThaiDate.js`
- `src/lib/planner/resourceAccounting.js`
- `src/hooks/useHtmlPlannerState.js`
- `src/components/planner/TaskList.jsx`
- `src/pages/Today.jsx`
- `src/pages/Overview.jsx`
- `src/pages/History.jsx`
- `src/pages/Resources.jsx`
- `src/App.routes.test.js`
- `PHASE_E_M2_REPORT.md`

**Updated**

- `src/App.jsx` — routes
- `src/components/Layout.jsx` — nav
- `src/components/StorageBootstrap.jsx` — migrate with `dailyPlanByDate`
- `src/pages/NotFound.jsx` — known links
- `public/sitemap.xml`
- `README.md`, `RESOURCES_REVIEW.md` (light updates)

## Features implemented

1. **Today** — countdown, motivator, day checklist, mark-all/reset, daily note, empty-out-of-range state  
2. **Overview** — completed days, streak, % progress, 34-day dot map, upcoming incomplete  
3. **History** — day selector + prev/next, task toggles, phases list, `?day=` deep link  
4. **Resources** — courses, important links (incl. Drive answer keys), full HTML link accounting UI with filters  

English Study Desk routes unchanged: `/`, `/timetable`, `/info`, `/plan`, `/quiz`, `/notes`, `/videos`.

## Resource counts (traceable)

| Metric | Count |
|---|---|
| Plan days | 34 |
| Plan tasks | 139 |
| Courses | 6 |
| Important links | 5 |
| Inventory rows (every sourced link occurrence) | 89 |
| Unique planner URLs | 71 |
| Unique URLs **not** in English `videoData` | **43** |
| Inventory rows flagged duplicate-in-planner | 30 |
| Rows with `u_id` query flag | 40 |

Notes:

- Phase D’s “38” counted unique `link:` attrs from HTML vs videos; M2 also imports `importantLinks` and accounts **every** occurrence → unique-not-in-videos is **43**. None discarded.
- Duplicate video pairs in English seed remain visible on `/videos` (unchanged) and are still listed in `RESOURCES_REVIEW.md`.
- URLs copied from HTML source as-is (including i-test `u_id` where present in source). Flagged in Resources UI; not silently stripped in this seed (preserve-exactly requirement for M2).

## Tests executed

| Command | Result |
|---|---|
| `npm test` | **22/22 passed** (6 files) |
| `npm run lint` | **clean** |
| `npm run build` | **success** |

## Known limitations / blockers

- Timetable generator (`Timetable.jsx`) is still a **second** schedule source (M3).  
- Personal `u_id` remains in imported i-test URLs (flagged; policy decision for later sanitization vs exact preserve).  
- No E2E browser suite yet.  
- Not deployed; no production data changes.  

## Next

Await approval before **M3** (unify timetable + dailyPlan source of truth).

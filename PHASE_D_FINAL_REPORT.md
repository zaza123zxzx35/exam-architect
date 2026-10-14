# Phase D — Final Audit, Testing & Production Readiness

**Date:** 2026-10-14  
**Branch:** `main` @ after M1 + NotFound hardening  
**Method:** Source inspection of unified workspace vs both upstream GitHub repos; executed `npm test`, `npm run lint`, `npm run build`; HTTP probes of local Vite server; resource/URL diff scripts. No production deploy. No production data mutation. Secret values not printed.

---

## Executive verdict

**The platform is not production-ready for the full Phase B/C feature set.**

Only **Milestone M1** (exam calendar, localStorage migration scaffold, Vitest) was implemented in Phase C. Smart Planner, NL constraints, scheduling engine, AI assistant, HTML planner page port, advanced video library, and authentication were **not built**. Claiming they “work” would be false.

What *does* run today is the vendored **English Study Desk** SPA plus M1 foundations, with one audit fix: unknown routes now show **NotFound** instead of silently rendering the Dashboard.

---

## 1. Features verified as working

Verified by code path + local server HTTP 200 + unit tests where noted.

| Feature | Status | Evidence |
|---|---|---|
| Dashboard `/` | **Working** (English feature) | Route + page present; server 200 |
| Timetable `/timetable` | **Working** | Route + large generator page |
| Plan `/plan` + mock tracker | **Working** | Route + `useLocalStorage` |
| Quiz `/quiz` | **Working** | 7 quizzes / 35 questions seeded |
| Notes `/notes` | **Working** | CRUD + filters |
| Videos `/videos` | **Working (basic)** | Category filter, add/edit/watched; **no** pagination/bulk-import/tags schema from blueprint |
| Info / HRMS `/info` | **Working** | Static snapshot |
| Theme toggle | **Working** | `app_theme_v1` |
| Competition widget | **Working** | localStorage rates |
| Exam countdown | **Working (M1)** | `examCalendar` + `useExamCountdown` tests |
| Unified LS migration | **Working (M1)** | `migrateFromLegacy` tests; backups; no legacy delete |
| URL sanitize (`u_id` strip) | **Working (M1)** | sanitize + migrate tests |
| Unknown routes | **Fixed in D** | `/today` etc. → `NotFound` (was silent Dashboard) |

### Features required but **not implemented** (cannot verify as working)

| Feature | Status |
|---|---|
| Smart Planner + NL study requests | **Missing** (no `/planner`, no constraint schema runtime) |
| Auto scheduling engine + conflict detection | **Missing** (no `src/lib/schedule/`) |
| Reschedule unfinished with preview/confirm | **Missing** |
| AI Assistant + server-side provider adapter | **Missing** (no API routes, no keys) |
| HTML Today / Overview / History / Resources | **Missing** (planned M2) |
| Video pagination, bulk import, subject/topic tags model | **Missing** (partial basic CRUD only) |
| Auth / user isolation | **Missing** (device-local only; `authProvider: 'local'` placeholder) |
| Server database + migrations | **N/A** — none exists (Phase A verified) |

### Feature preservation vs original repos

| Source | Preserved in unified SPA? |
|---|---|
| English Study Desk pages & seed data | **Yes** — video URL diff 0 missing / 0 extra |
| HTML planner Today checklist UX | **No** — not ported |
| HTML Overview streak/dot-map | **No** |
| HTML History day browser | **No** |
| HTML Resources (courses + Drive answer keys) | **No** — listed in [RESOURCES_REVIEW.md](./RESOURCES_REVIEW.md) |
| HTML i-test task links | **No** in SPA seed; exist only in upstream HTML (with `u_id`) |

---

## 2. Tests executed and actual results

| Command | Result |
|---|---|
| `npm test` (Vitest) | **Pass** — 3 files, **13/13** tests |
| `npm run lint` (oxlint) | **Pass** — clean |
| `npm run build` (Vite) | **Pass** |
| HTTP probe `127.0.0.1:43123` known routes | **200** (SPA shell) for `/`, `/timetable`, `/info`, `/plan`, `/quiz`, `/notes`, `/videos` |
| HTTP probe planned-but-missing routes `/today`, `/overview`, `/history`, `/resources`, `/planner` | **200 shell** — client now renders **NotFound** (after fix); previously Dashboard |
| E2E / Playwright | **Not present** — not run |
| TypeScript typecheck | **N/A** — project is JS |
| Smart Planner / Scheduler / AI tests | **N/A** — modules absent |
| Auth isolation tests | **N/A** — no auth |
| Manual browser smoke | Delegated to computerUse subagent (async); do not claim pass until result arrives |

**There is no test coverage for critical user flows** beyond calendar/sanitize/migrate unit tests.

---

## 3. Bugs found and fixes applied

| Bug | Severity | Action |
|---|---|---|
| `path="*"` rendered Dashboard, masking missing routes | Medium | **Fixed:** `src/pages/NotFound.jsx` + `App.jsx` catch-all |
| Phase C claimed scope vs delivery | Process | **Documented:** only M1 shipped |
| Dual schedule sources still diverge (Timetable generator vs unported HTML `dailyPlan`) | High (product) | **Not fixed** — requires M2/M3 |
| Catch-all / incomplete HTML import | High (parity) | Tracked in Resources review |
| Duplicate video URLs (2 pairs) | Low | **Not deleted** — listed for review |
| `App.css` / unused template assets | Low | Dead/unused template leftovers; left untouched (non-blocking) |
| npm audit reports vulnerabilities in deps | Medium (supply chain) | **Not force-fixed** (could be breaking); report only |

No risky data migrations performed.

---

## 4. Resources imported, duplicates, incomplete links

See **[RESOURCES_REVIEW.md](./RESOURCES_REVIEW.md)** for the full review list.

Summary:

- English videos: **39/39 preserved**, 0 malformed.
- Duplicates: **2 URLs** shared by multiple video IDs (kept).
- HTML unique links: **66**; **38 unmatched** in video library (i-test, FB task links, Drive keys, Vercel deep links).
- Drive answer keys from HTML **not yet in SPA UI**.
- English Major grouping: labeled **ภาค ข** in data (matches exam structure); **not** under ภาค ก. Confirm product intent before changing.

---

## 5. Security and data-integrity findings

| Finding | Severity | Notes |
|---|---|---|
| No committed `.env` / API keys in workspace | OK | None present |
| Upstream HTML still contains personal `u_id` on i-test links | High (upstream) | Not vendored into SPA seed; sanitizer strips on migrate when imported |
| Test fixtures intentionally include sample `u_id` strings | Low | Used to assert stripping |
| Client-only storage; no auth isolation | High for multi-user | Acceptable only for single-device Stage 1 |
| External VIP/FB/Drive links in public repo | Medium | Pre-existing; legal/access policy outside code |
| Thumbnail host `coresg-normal.trae.ai` | Medium | Third-party dependency / privacy |
| `innerHTML` not used in React app | OK | HTML planner (unported) used `innerHTML` |
| DB migrations / rollback | N/A server | Client: `kru_backup_*` + retained legacy keys |
| Production backup | N/A | No cloud DB; browser data only |

---

## 6. Deployment status and remaining blockers

| Item | Status |
|---|---|
| `vercel.json` SPA rewrite | Present (unchanged) |
| Env vars in repo | None required for Stage 1; no `.env` files |
| This workspace production deploy | **Not deployed** (per instructions) |
| Upstream English production | Still at `kru-phuchuay-english-2569.vercel.app` (pre-M1 feature set) |
| HTML planner hosting | Still unknown / not redirected |
| Database connectivity | None |
| External AI integration | None |

### Blockers to call this “production ready”

1. Complete M2–M5 (HTML parity, unified schedule, planner, scheduler tests).  
2. Confirm official exam datetimes with announcements.  
3. Port Resources (including Drive answer keys) without inventing URLs.  
4. Decide English-major taxonomy (ข vs requested ก filter).  
5. Strip/anonymize `u_id` in any future HTML content port.  
6. Add E2E smoke + expand unit tests for planner/scheduler before enablement.  
7. Explicit deploy approval + Vercel project wiring for this unified repo.  
8. Optional M6/M7 only after Stage 1 parity.

---

## 7. Prioritized recommended next steps

1. **P0 — Continue M2:** Port `/today`, `/overview`, `/history`, `/resources` + `dailyPlan.js`; surface Drive answer keys from HTML `importantLinks` unchanged.  
2. **P0 — Confirm exam dates** with official source; keep `examCalendar.js` as sole writer.  
3. **P0 — Clarify English Major grouping** (official ภาค ข vs product filter request).  
4. **P1 — M3:** Single schedule source of truth (collapse Timetable generator vs dailyPlan).  
5. **P1 — M4/M5:** Video library upgrades + deterministic scheduler + NL mock with preview/confirm.  
6. **P1 — Human review** of `RESOURCES_REVIEW.md` duplicates and unmatched HTML links.  
7. **P2 — E2E smoke** (Playwright) for routes + localStorage persistence.  
8. **P2 — npm audit** remediation with non-breaking upgrades.  
9. **P3 — M6/M7** AI server adapter + auth only when multi-device needed.  
10. **Deploy** only after M2 parity checklist signed and explicit approval.

---

## Requirement coverage matrix (honest)

| Phase C core feature | Implemented? | Tested as working? |
|---|---|---|
| 1. Smart Planner | No | No |
| 2. Video Library (full) | Partial (basic CRUD) | Basic page only |
| 3. Auto Scheduling Engine | No | No |
| 4. AI Assistant | No | No |
| 5. Progress Tracking | Partial (legacy LS) | Unit migrate only |
| 6. Integration/reliability | Partial (M1 migrate + NotFound) | Lint/test/build pass |

---

## Changes made during Phase D

1. Added `src/pages/NotFound.jsx`  
2. Wired `App.jsx` catch-all to NotFound  
3. Added `RESOURCES_REVIEW.md`  
4. Added this report  

No production data touched. No deploy. No destructive migrations.

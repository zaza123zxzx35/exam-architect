# Kru Exam Planner (unified)

Unified exam planning platform based on the English Study Desk SPA, integrating content and UX from the static HTML planner.

Planning docs:

- [PHASE_A_AUDIT_REPORT.md](./PHASE_A_AUDIT_REPORT.md)
- [PHASE_B_INTEGRATION_BLUEPRINT.md](./PHASE_B_INTEGRATION_BLUEPRINT.md)

## Stack

- Vite 8 + React 19 + React Router 7 + Tailwind 3
- Client-first persistence (`localStorage`)
- Vitest for unit tests

## Run locally

```bash
npm install
npm run dev
```

Dev server defaults to [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test      # unit tests
npm run lint  # oxlint
npm run build # production bundle
```

## Milestone status

| Milestone | Status |
|---|---|
| M1 Foundations (calendar, storage migrate, Vitest) | Done |
| Phase D audit | [PHASE_D_FINAL_REPORT.md](./PHASE_D_FINAL_REPORT.md) |
| M2 HTML parity (Today / Overview / History / Resources) | Done — [PHASE_E_M2_REPORT.md](./PHASE_E_M2_REPORT.md) |
| Resource review list | [RESOURCES_REVIEW.md](./RESOURCES_REVIEW.md) |
| M3 Unified schedule engine | Done — [PHASE_F_M3_REPORT.md](./PHASE_F_M3_REPORT.md) |
| M4 Smart Planner | Done — [PHASE_G_M4_REPORT.md](./PHASE_G_M4_REPORT.md) |
| M5 Study assistant | Done — [PHASE_H_M5_REPORT.md](./PHASE_H_M5_REPORT.md) |
| Phase I production readiness | [PHASE_I_PRODUCTION_READINESS_REPORT.md](./PHASE_I_PRODUCTION_READINESS_REPORT.md) — deploy only after approval |
| UI foundation + Study Resource Hub | Done — shared `PageHeader` / `FilterChips` / `EmptyState` / `StatusBanner`; `/resources` hub with taxonomy filters (default `all`) |
| Smart Tutor hub lookup | Done — assistant `find_resources` uses classify-on-read hub; keeps `english-skills-a` ≠ `english-major` |
| Smart Tutor weakness engine | Done — rule-based `quiz_results` analysis via `src/lib/study/weakness.js`; intent `show_weakness` / “ดูจุดอ่อน”; never writes storage or invents scores |
| District intelligence | Done — user-local competition records on Dashboard; HRMS on `/info` stays cited national stats only |
| Master Phase 0–7 release prep | [MASTER_PHASE_0_7_RELEASE.md](./MASTER_PHASE_0_7_RELEASE.md) — local release candidate; **no deploy / no push** until explicit approval |

## Data notes

- On first load, `StorageBootstrap` migrates legacy keys into `kru_unified_v1` and writes `kru_backup_*` snapshots.
- Runtime schedule SSOT is `kru_schedule_v1` (tasks + sessions + notes). Legacy `kru_thp_69_v1` and `daily_timetable_v8` are dual-written and never deleted (dual-write failures do not wipe SSOT).
- External links render through `safeResourceUrl` / `sanitizeUrl` (http/https only).
- Sensitive query params such as `u_id` are stripped at render (`safeResourceUrl`) and removed from HTML planner seed URLs (Phase 8). Authenticated i-test deep-link behavior without account params is not verified against a live login.
- Study taxonomy (`src/lib/study/taxonomy.js`, version `2b.1`) classifies on read. Never use `scheduleExamId` as a content filter.
- Exam datetimes come only from `src/data/examCalendar.js` (default: ภาค ก 14 พ.ย. 2569 09:00 +07:00, ภาค ข 15 พ.ย. 2569 09:00 +07:00).

## Deploy

Existing pattern: static Vite build on Vercel (`vercel.json` SPA rewrite). Do not commit API keys. No LLM / paid API credentials in this slice — assistant stays rule-based. Deploy only after explicit approval.

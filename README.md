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
| M1 Foundations (calendar, storage migrate, Vitest) | In progress / this branch |
| M2+ Smart Planner, Video Library, Scheduler, AI | Not started |

## Data notes

- On first load, `StorageBootstrap` migrates legacy keys into `kru_unified_v1` and writes `kru_backup_*` snapshots.
- Legacy keys are **not** deleted (rollback / coexistence with existing hooks).
- Sensitive query params such as `u_id` are stripped during import.
- Exam datetimes come only from `src/data/examCalendar.js` (default: ภาค ก 14 พ.ย. 2569 09:00 +07:00, ภาค ข 15 พ.ย. 2569 09:00 +07:00).

## Deploy

Existing pattern: static Vite build on Vercel (`vercel.json` SPA rewrite). Do not commit API keys. AI provider credentials (future M6) must stay in server env only.

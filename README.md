# Kru Exam Planner (unified)

Unified exam planning platform based on the English Study Desk SPA, integrating content and UX from the static HTML planner.

Planning docs:

- [PHASE_A_AUDIT_REPORT.md](./PHASE_A_AUDIT_REPORT.md)
- [PHASE_B_INTEGRATION_BLUEPRINT.md](./PHASE_B_INTEGRATION_BLUEPRINT.md)

## Stack

- Vite 8 + React 19 + React Router 7 + Tailwind 3
- Client-first persistence (`localStorage`)
- Vitest for unit tests
- Optional OpenAI via **server-only** `/api/assistant` (Vercel serverless + Vite middleware for local)

## Run locally

```bash
npm install
cp .env.example .env   # optional — add OPENAI_API_KEY for AI path
npm run dev
```

Dev server defaults to [http://127.0.0.1:43123](http://127.0.0.1:43123).  
Local AI endpoint: `POST /api/assistant` (same handler as Vercel). Without `OPENAI_API_KEY`, the assistant falls back to the rule-based engine.

```bash
npm test      # unit tests (OpenAI calls are mocked)
npm run lint  # oxlint
npm run build # production bundle
```

### OpenAI env (server only)

| Variable | Where | Notes |
|---|---|---|
| `OPENAI_API_KEY` | `.env` / Vercel Project Settings | **Never** `VITE_OPENAI_API_KEY` |
| `OPENAI_MODEL` | same | e.g. `gpt-4o-mini` — must be allowed on your account |
| `OPENAI_TIMEOUT_MS` | same | default `20000` |

**Vercel:** Project → Settings → Environment Variables → set the three vars for Production/Preview/Development. Redeploy after changing. Do not paste keys into chat or client code.

**Security:** API key is read only in `api/assistant.js` / Vite server middleware. Client calls `/api/assistant` and never sees the key. AI may only **propose** schedule changes; user must type ยืนยัน/confirm. Incomplete URLs stay `needs_full_url` / `unchecked` — never claimed openable.

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
| Unified curated library (ก+ข) | `/library` — **v14** เลดี้เก๋เก๋ English + อ.นนท์ การศึกษา/กฎหมาย + คณิต/เหตุผล (YT must · Gab supplement); incomplete stubs → `needs_full_url` |
| Smart exam prioritization | Score-first planner (`priorityScoring.js`) with must / if-time / defer tiers; modes เน้นคะแนนสูงสุด · สมดุล · ทบทวนจุดอ่อน; no invented frequency stats; does not require scheduling the whole catalog |
| Part ข 29-day forced pack | `/library` — major + education + law core; slim Part ก หมาหอน + YouTube math Ep.1–5; add-only merge |
| Live tutor schedule + Today/Overview | Lady Kaekae VIP flyer lives (Sep–Nov 2026); Today/Overview read curated schedule only |

## Data notes

- On first load, `StorageBootstrap` migrates legacy keys into `kru_unified_v1` and writes `kru_backup_*` snapshots.
- Runtime schedule SSOT is `kru_schedule_v1` (tasks + sessions + notes). Legacy `kru_thp_69_v1` and `daily_timetable_v8` are dual-written and never deleted (dual-write failures do not wipe SSOT).
- External links render through `safeResourceUrl` / `sanitizeUrl` (http/https only).
- Sensitive query params such as `u_id` are stripped at render (`safeResourceUrl`) and removed from HTML planner seed URLs (Phase 8). Authenticated i-test deep-link behavior without account params is not verified against a live login.
- Study taxonomy (`src/lib/study/taxonomy.js`, version `2b.2`) classifies on read. Never use `scheduleExamId` as a content filter. education/law = ภาค ข per official scope.
- Exam datetimes come only from `src/data/examCalendar.js` (default: ภาค ก 14 พ.ย. 2569 09:00 +07:00, ภาค ข 15 พ.ย. 2569 09:00 +07:00).

## Deploy

Vercel: Vite static build + `/api/assistant` serverless. `vercel.json` SPA rewrite excludes `/api/*`. Set `OPENAI_*` in Vercel env (not in the repo). Without those vars, `/assistant` still works via rule-based fallback. Deploy only after explicit approval.

Study taxonomy version `2b.2`: education + law = ภาค ข (ก.ค.ศ. ว14/2566).

# Phase I — Production Readiness Audit

**Date:** 2026-10-14  
**Branch:** `main` @ `4b7eea7` (clean working tree, synced with `origin/main`)  
**Method:** Read phase reports D–H; inspect live source; run `npm test` / `npm run lint` / `npm run build`; HTTP probe all routes; isolated journey script (`scripts/phase-i-journey-audit.mjs`); headless Chrome screenshots; security/config review.  
**Deploy status:** **Not deployed.** No production data changes. Awaiting explicit approval.

---

## Executive recommendation

### **CONDITIONAL GO** — static Vercel SPA (personal / single-device use)

The application has completed M1–M5: HTML planner parity, unified schedule SSOT, Smart Planner, and deterministic Assistant. Automated unit/integration tests are green (64/64), lint is clean, and production build succeeds. Critical schedule journeys were verified in an isolated in-memory environment (32/32 assertions).

**Do not claim** multi-device sync, accounts, server persistence, or generative LLM AI. Those are not implemented.

Approve deploy only if you accept the residual risks in §4 (notably client-side `u_id` query params still present in the Resources seed inventory, and localStorage-only persistence).

---

## 1. Verified features and routes

### Routes registered (code + nav + sitemap)

| Route | Page | Nav | HTTP (dev `43123`) | Notes |
|---|---|---|---|---|
| `/` | Dashboard | ภาพรวม | 200 | English Study Desk |
| `/today` | Today | วันนี้ | 200 | 34-day plan day view |
| `/overview` | Overview | แผนภาพรวม | 200 | streak / 34-day map |
| `/history` | History | ย้อนดูวัน | 200 | `?day=` deep link |
| `/resources` | Resources | คลังเรียน | 200 | courses + inventory filters |
| `/timetable` | Timetable | ตารางติว | 200 | schedule sessions SSOT |
| `/planner` | Smart Planner | Smart Planner | 200 | M4 |
| `/assistant` | Assistant | ผู้ช่วยติว | 200 | M5 |
| `/plan` | Plan | แผนการอ่าน | 200 | English plan + mocks |
| `/quiz` | Quiz | แบบทดสอบ | 200 | |
| `/notes` | Notes | โน้ต | 200 | |
| `/videos` | Videos | วิดีโอ | 200 | 39 videos |
| `/info` | Info | ข้อมูลและสถิติ | 200 | HRMS snapshot |
| `*` unknown | NotFound | — | 200 shell → client 404 UI | Verified screenshot |

SPA rewrite (`vercel.json` + Vite preview): deep links return `index.html` (expected).

### Feature status vs Phase D (superseded)

| Capability | Phase D | Phase I (now) |
|---|---|---|
| Today / Overview / History / Resources | Missing | **Present (M2)** |
| Unified schedule engine | Missing | **Present (M3)** `kru_schedule_v1` |
| Smart Planner | Missing | **Present (M4)** `/planner` |
| AI Assistant | Missing | **Present (M5)** rule-based `/assistant` |
| Auth / DB / paid LLM | Missing | **Still absent** (by design Stage 1) |

### Data preservation counts (verified)

| Metric | Count |
|---|---|
| Plan days | **34** |
| HTML plan tasks | **139** |
| Link inventory rows | **89** |
| Unique planner URLs | **71** |
| Important links | **5** |
| Courses | **6** |
| Video seed | **39** |

---

## 2. Test commands and actual results

| Command | Result |
|---|---|
| `npm test` | **64/64 passed** (11 files) |
| `npm run lint` | **clean** (0 warnings) |
| `npm run build` | **success** — Vite 8.3.2, `dist/` written |
| `node scripts/phase-i-journey-audit.mjs` | **32/32 PASS** (journeys A–H logic) |
| Playwright / Cypress E2E suite | **Not present** — not run |
| TypeScript `tsc` | **N/A** (JS project) |

Headless screenshots saved under `/opt/cursor/artifacts/screenshots/phase-i/` (`today`, `resources`, `planner`, `assistant`, NotFound, mobile today).

A browser smoke subagent was also launched for interactive route checks; unit/journey evidence above does **not** depend on that subagent completing.

---

## 3. End-to-end journeys

| Journey | How tested | Outcome |
|---|---|---|
| **A** Resources search + open existing resource | Automated (catalog filter + `https?` URL check); UI screenshot of `/resources` | **PASS** — 30 subject-related hits with http(s) URLs |
| **B** Smart Planner preview → cancel → no mutation | Automated (`generatePlanPreview` + `cancelPlanPreview` + deep equality) | **PASS** |
| **C** Valid plan → confirm → persist + dual-write | Automated (`applyPlanPreview` + `saveSchedule` + reload) | **PASS** — fixed session kept; smart sessions added; completed task preserved; `kru_schedule_v1` + legacy keys written |
| **D** Assistant today + exams read-only | Automated (`processAssistantTurn`) | **PASS** — `scheduleChanged === false` |
| **E** Assistant create → cancel → unchanged | Automated | **PASS** |
| **F** Confirm change + progress consistency / no overlaps | Automated (`progressSnapshot`, `detectConflicts`) | **PASS** — 139 tasks; projection consistent; 0 overlaps |
| **G** Reschedule unfinished — no dup IDs / overlaps | Automated (`rescheduleUnfinished`) | **PASS** |
| **H** 34/139 + inventory accounting | Automated | **PASS** |

**Browser UI journeys:** headless Chrome screenshots for Today, Resources, Planner, Assistant, NotFound, mobile Today (~390px). Interactive click-through of Apply/Cancel in a real browser was **not** fully executed as a recorded Playwright suite; logic paths for B–G were covered by the isolated script.

**Refresh / back / deep links:** HTTP deep links return SPA shell (dev + preview). Client router handles unknown paths via `NotFound`. Full browser history back/forward was requested of the computerUse smoke (async); not claimed here as verified until that pass returns.

---

## 4. Security and data-integrity findings

### Secrets / credentials

| Check | Result |
|---|---|
| `.env*` in repo | **None** |
| API keys / OpenAI / Anthropic / private keys in `src` or `dist` | **None found** |
| Client bundle dependencies | React, Router, Lucide only — **no AI SDK** |
| Required env vars for Stage 1 | **None** |

### XSS / unsafe HTML

| Check | Result |
|---|---|
| `dangerouslySetInnerHTML` / `innerHTML` / `eval` in `src` | **None** |
| External links | Prefer `rel="noopener noreferrer"` on Resources/Timetable; some legacy pages use `rel="noreferrer"` only |

### URL / PII handling

| Finding | Severity | Notes |
|---|---|---|
| **`u_id` still present in HTML planner seed URLs** shown on `/resources` | **Medium** | ~40 inventory rows flagged `contains-u_id`. M2 preserved source URLs intentionally. Unified import **strips** `u_id` via `sanitizeUrl`, but Resources page links to raw seed. For a **public** deploy, strip or redact before click. |
| `sanitizeUrl` rejects non-`http(s)` | OK | Blocks `javascript:` |
| User-added Timetable links require `https?://` | OK | Client-side check |

### Storage / migration

| Finding | Severity | Notes |
|---|---|---|
| Persistence is **browser localStorage / sessionStorage only** | Expected | No account sync / multi-device backup |
| `useLocalStorage` catches read/write errors | OK | Logs to console; no user toast |
| Schedule malformed recovery + legacy dual-write | OK (tested) | Legacy keys never deleted |
| **Dual-write not atomic under quota failure** | **Low–Medium** | If `setItem` throws on 2nd key, `kru_schedule_v1` may write while legacy lags (reproduced in audit harness). Runtime SSOT remains schedule key. |
| Assistant history in `sessionStorage` | OK | Tab-scoped; no account PII schema |

### Schedule integrity

| Check | Result |
|---|---|
| Overlap detection / adjacent allowed | Covered by M3 tests + journey F/G |
| Cancel leaves data unchanged | Journey B/E |
| Completed tasks not unmarked on apply | Journey C |
| Progress projection consistent | Journey F |

### Architecture honesty

- **No** server database, auth, or multi-user isolation.  
- Assistant is **rule-based**, not a hosted LLM.  
- Dashboard/`plan_progress` English checklist remains a separate legacy key (not the HTML 139-task SSOT).

---

## 5. Deployment configuration and blockers

### Existing config

| Item | Value |
|---|---|
| Build | `npm run build` → `dist/` |
| Framework | Vite SPA |
| `vercel.json` | `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` |
| Env vars required | **None** for current Stage 1 |
| `.vercel` linked project in workspace | **Not present** (deploy from Git integration or CLI) |
| Sitemap / robots | Present in `public/` → copied to `dist/` |

### Blockers to “enterprise / multi-user production”

1. No authentication or per-user server.  
2. No server backup / sync.  
3. Residual personal query params in Resources seed (privacy).  

### Blockers to “static personal Vercel deploy”

**None hard-blocking** if residual risks above are accepted.

---

## 6. Backup and rollback recommendations

**Before deploy**

1. Tag git: `git tag phase-i-ready && git push origin phase-i-ready` (or equivalent).  
2. Keep `main` at known-good SHA `4b7eea7` (or newer audit commit).  
3. Export a local backup of browser data if upgrading an existing production domain users already use: DevTools → Application → Local Storage → export `kru_schedule_v1`, `kru_thp_69_v1`, `daily_timetable_v8`, `kru_unified_v1`, and any `kru_backup_*` keys.

**After deploy / rollback**

1. Vercel Instant Rollback to previous deployment.  
2. Git revert / redeploy previous tag.  
3. App-level: migrations never delete legacy keys; `kru_backup_*` from M1 migrate remain available for manual restore.  
4. Users can clear only `kru_schedule_v1` to force remigration from legacy (document carefully).

---

## 7. GO / NO-GO

| Question | Answer |
|---|---|
| Ready for static Vercel SPA deploy (personal exam prep)? | **CONDITIONAL GO** |
| Ready to claim full AI / multi-device / auth platform? | **NO-GO** |
| Deployed in this audit? | **No** — stopped pending your approval |

### Pre-deploy checklist (recommended)

- [ ] Accept localStorage-only persistence  
- [ ] Decide: strip `u_id` from Resources links before public traffic, or keep flagged  
- [ ] Confirm Vercel project domain / Git integration  
- [ ] Optional: smoke `/assistant` and `/planner` once on the preview URL after deploy  

---

## 8. Exact deployment steps (after you approve)

Do **not** run these until explicitly approved.

### Option A — Vercel Git integration (preferred if repo is connected)

1. Ensure `main` contains this audit commit and tests still pass locally.  
2. In Vercel project settings: Framework **Vite**, Build `npm run build`, Output **`dist`**, Install `npm install`.  
3. Confirm `vercel.json` rewrite is present (already in repo).  
4. Deploy Production from `main` (Vercel dashboard → Deploy).  
5. Open production URL; spot-check `/`, `/today`, `/planner`, `/assistant`, and an unknown path (404 UI).  
6. Soft-navigate and hard-refresh a deep link (`/history?day=3`).

### Option B — Vercel CLI

```bash
npm ci
npm test && npm run lint && npm run build
npx vercel@latest --prod
# Follow prompts; do not paste secrets into the repo
```

### Option C — Any static host

Upload/serve `dist/` with SPA fallback to `index.html` for all paths.

### Post-deploy verification (manual)

1. `/resources` filters load; important Drive links open.  
2. `/planner` preview → cancel → Timetable counts unchanged.  
3. `/assistant` “แผนวันนี้” / “วันสอบ” read-only.  
4. Confirm one plan apply on a **throwaway browser profile** first.

---

## Appendix — Phase report cross-check

| Report | Claimed | Codebase now |
|---|---|---|
| D | Only M1; NO-GO | Superseded by M2–M5 |
| E M2 | Today/Overview/History/Resources | Present |
| F M3 | `kru_schedule_v1` + engine | Present |
| G M4 | `/planner` deterministic | Present |
| H M5 | `/assistant` rule-based | Present |
| Resources review | 43 unique not-in-videos; Drive keys | Inventory UI accounts for them |

---

## Stop

**Audit complete. No deployment performed.**  
Awaiting your review of this report and an explicit deploy approval.

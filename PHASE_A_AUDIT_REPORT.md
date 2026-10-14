# Phase A — Full Source Code Audit

**Status:** Complete — awaiting approval before any integration work  
**Audit date:** 2026-10-14  
**Method:** Read-only inspection of cloned `main` branches; no package installs; no file modifications in either source repository; no production data changes; environment file contents not printed (none present).

| Repository | Clone path (audit only) | Default branch | Last commit inspected |
|---|---|---|---|
| Exam planning | `/tmp/audit-repos/exam-planning` | `main` (`47fa475`) | “Add files via upload” — single `index.html` |
| English timetable | `/tmp/audit-repos/english-timetable` | `main` (`c6eef3d`) | “Improve exam dashboard UX and trust signals” |

**Evidence standard:** Items marked **Verified** were observed in source or public GitHub/Vercel responses. Items marked **Hypothesis** are inferences that still need confirmation.

---

## 1. Verified architecture of each repository

### 1.1 Exam planning — `Deployment-kru-phuchuay-plan-2569`

| Aspect | Finding | Evidence |
|---|---|---|
| Stack | Single static HTML document (vanilla JS + inline CSS) | Repo contains only `index.html` (956 lines) |
| Language | HTML / CSS / JavaScript (no build step) | No `package.json`, no bundler |
| Package manager | None | No lockfile |
| Framework | None (DOM + `onclick` / `innerHTML`) | Script block in `index.html` |
| Routing | In-page view switcher (`showView`) | Views: `today`, `overview`, `history`, `plan`, `resources` |
| API / server | None | No `fetch`, no backend |
| Persistence | Browser `localStorage` key `kru_thp_69_v1` | `LS_KEY` in `index.html` |
| Auth | None | No auth code |
| Database | None | Client-only |
| Tests | None | No test files |
| Build / test commands | N/A | Static file only |
| Deployment config in repo | **Missing** | No `vercel.json`, no GitHub Pages config; `has_pages: false` via GitHub API |
| Deployed URL | **Unknown from repo** | Homepage null; GitHub Pages 404; repo name suggests deployment intent |

**UI surface (Verified):** Mobile-narrow shell (`max-width: 560px`), Thai typography via Google Fonts (`Noto Serif Thai`, `IBM Plex Sans Thai`, `IBM Plex Mono`).

**Core data (Verified):** Hard-coded `dailyPlan` array — 34 days starting `2026-10-12`, each day a list of tasks `{ text, pri, link? }`; 5 study phases; course catalog; important links (including deep links into the English Vercel app).

### 1.2 English timetable — `kru-phuchuay-english-2569`

| Aspect | Finding | Evidence |
|---|---|---|
| Stack | Vite 8 + React 19 + React Router 7 + Tailwind 3 | `package.json`, `vite.config.js`, `tailwind.config.js` |
| Language | JavaScript (JSX), not TypeScript | `.jsx` / `.js` sources; `@types/*` present but unused for app code |
| Package manager | npm (`package-lock.json` lockfileVersion 3) | Lockfile present |
| Scripts | `dev` → vite; `build` → vite build; `lint` → oxlint; `preview` → vite preview | `package.json` |
| Test command | **None defined** | No `test` script; no Vitest/Jest/Cypress files |
| Routing | Client SPA (`BrowserRouter`) | `/`, `/timetable`, `/info`, `/plan`, `/quiz`, `/notes`, `/videos`; `*` → Dashboard |
| API / server | None in-app | No Route Handlers / Express / serverless functions |
| Persistence | Multiple `localStorage` keys via `useLocalStorage` | See §4 |
| Auth | None | No auth provider |
| Database | None | Client-only seeded JSON modules under `src/data/` |
| Deployment | Vercel SPA rewrite | `vercel.json` rewrite `/(.*)` → `/index.html`; homepage `https://kru-phuchuay-english-2569.vercel.app` (HTTP 200 verified) |
| Env vars | **None referenced in source** | No `.env*` files in tree; no `import.meta.env` / `process.env` usage found |

**Dependencies (Verified runtime):** `react`, `react-dom`, `react-router-dom`, `lucide-react`.  
**Dev tooling:** Vite, `@vitejs/plugin-react`, Tailwind/PostCSS/Autoprefixer, Oxlint.

**Source scale (Verified):** 22 JS/JSX modules under `src/` (~3.8k LOC); seed data includes 5 plan priorities, 12 mock exams, quizzes, 4 notes, 39 videos, HRMS stats snapshot, generated ~39-day timetable (`2026-10-06` → `2026-11-13`).

---

## 2. Existing feature inventory

### Exam planning (preserve)

1. **Today checklist** — day-indexed tasks with priority chips and external links  
2. **Task completion** — per-task toggle; mark-all / reset day  
3. **Daily notes** — free-text note per calendar day  
4. **Countdown** — days/hours/minutes to exam target  
5. **Overview** — completed-day count, streak, progress %, 34-day dot map  
6. **History** — browse/edit any plan day  
7. **Plan overview** — 5 phases + score structure copy  
8. **Resources** — course list + important links  
9. **Motivational tips** — rotating copy by day index  
10. **Deep links** to Facebook media and **i-test.kruphuchuay.com** quizzes  

### English timetable / Study Desk (preserve)

1. **Dashboard** — progress summary, HRMS snapshot, competition widget, next-focus plan, key dates  
2. **Daily timetable** — generated slots, done toggles, notes, add/delete slots, deep links to FB / in-app routes  
3. **Info / HRMS stats** — national teacher demand snapshot + interpretation copy  
4. **Study plan** — priority cards, checklist progress, mock exam score tracker  
5. **Quiz** — take quizzes, score history, add custom quizzes  
6. **Notes** — CRUD study notes with category filter/search  
7. **Videos** — catalog, watched flags, notes, YouTube embed / FB group handling  
8. **Competition rates** — user-entered district vacancies/applicants (local only)  
9. **Theme toggle** — light/dark (`app_theme_v1`)  
10. **Responsive shell** — desktop sidebar + mobile nav  

**Cross-link (Verified):** Exam planning already links to English production URLs for `/timetable` and `/`.

---

## 3. Database and authentication findings

### Databases

| Question | Answer | Certainty |
|---|---|---|
| Shared server database? | **No evidence of any server database in either repo** | Verified (no DB clients, schemas, migrations, or API) |
| Separate databases? | Each app uses **its own browser `localStorage` namespace** on the client | Verified for storage keys; they do not share keys |
| Same origin sync? | Only if both apps are served from the **same origin** could storage collide — currently they appear as separate deployments | Hypothesis (exam planning deploy origin unknown) |

**English localStorage keys (Verified):**  
`daily_timetable_v8`, `study_plan`, `plan_progress`, `mock_exams`, `study_quizzes`, `quiz_results`, `study_notes`, `study_videos`, `competition_rates_v1`, `app_theme_v1`

**Exam planning localStorage (Verified):**  
`kru_thp_69_v1` → shape `{ days: { [YYYY-MM-DD]: { [taskIndex]: boolean } }, notes: { [YYYY-MM-DD]: string } }`

**Data models (client-side, Verified):**

| Domain | Exam planning | English app |
|---|---|---|
| Timetable / daily tasks | `dailyPlan[dayIndex][]` hard-coded | Generated `seedTimetable` + editable slots in LS |
| Exam dates | Constants + day labels (internally inconsistent — see risks) | `useExamCountdown` + dashboard copy |
| Subjects / plan | 5 phases + score structure text | `initialStudyPlan` priorities P1–P5 |
| Tasks / progress | Day-keyed completion map | `plan_progress`, slot `done`, video `isWatched` |
| Videos | Links inside tasks + resources | `initialVideos` + LS |
| Quiz / i-test | External i-test URLs only | In-app quizzes + `quiz_results` |
| Notes | Per-day textarea | Structured notes collection |
| Mock / scores | Not tracked | `mock_exams` tracker |
| HRMS / competition | Link out to HRMS | Embedded snapshot + competition widget |

### Authentication / authorization

- **Verified:** No authentication, no user roles, no session management, no OAuth/JWT/cookies beyond default browser storage.  
- All progress is **device-local** and not multi-user.

---

## 4. Current deployment architecture

### English app (Verified)

- Host: **Vercel** (`server: Vercel`, homepage set, sitemap/robots point to `https://kru-phuchuay-english-2569.vercel.app`)  
- SPA fallback via `vercel.json` rewrites  
- `.vercelignore` excludes `node_modules`, `dist`, `.git`, `.trae`, logs, `.figma`  
- `.gitignore` includes `.vercel`  
- **Environment variable names:** none found in source or committed config  

### Exam planning (Verified gaps)

- Repo is a raw HTML upload (created 2026-10-14)  
- No Vercel/Netlify/Pages config in tree  
- GitHub Pages not enabled (`has_pages: false`)  
- **Missing information:** actual hosting URL, project settings, custom domain, whether static hosting is intended  

### Safe checks performed

- GitHub API metadata for both repos  
- HTTP HEAD/GET to English Vercel homepage → 200  
- Grep for env/auth/DB patterns  
- Confirmed no `.env*` files present  
- Confirmed no test suite files  
- **Not done (per rules):** `npm install`, builds, deploys, lockfile changes, production writes  

---

## 5. Shared and conflicting components

### Shared / overlapping (Verified)

| Overlap | Notes |
|---|---|
| Same product goal | Assistant-teacher exam prep (สพฐ. รอบทั่วไป 2569, English major) |
| Countdown to exam | Both implement countdown UI |
| Daily study schedule | Overlapping content (Lady VIP VODs, อ.นนท์ lives, mock finals, registration tasks) |
| Progress checklists | Different models (day tasks vs plan/slots) |
| External FB / Drive links | Shared publishers and many overlapping URLs |
| Exam planning → English deep links | Explicit coupling already exists |

### Conflicts / incompatibilities (Verified)

| Conflict | Detail |
|---|---|
| **Stack mismatch** | Static HTML vs Vite/React — cannot “merge” without rewriting one side |
| **Exam date inconsistency** | See Critical risk below — dates disagree within and across apps |
| **Plan date windows** | Exam planning: 34 days from 12 Oct; English timetable: ~39 days from 6 Oct to 13 Nov |
| **Storage schemas** | Different keys and shapes; progress will not transfer automatically |
| **UI/UX language** | Narrow mobile sage/blush static UI vs teal “Study Desk” dashboard SPA |
| **Route/nav model** | Tab views vs React Router paths |
| **Dependency set** | Exam planning has zero npm deps; English pins React 19 / Vite 8 |

### Route conflicts (for a merged SPA)

Proposed unified routes can absorb both without path collision if exam-planning views become routes such as `/today` (or remain under `/` as a mode). Current English routes are free of overlap with each other; wildcards currently dump unknown paths to Dashboard (may hide 404s).

---

## 6. Missing information and unresolved questions

1. **Where is exam planning hosted today?** (Vercel project? Netlify? GitHub raw? Unhosted?)  
2. **Which exam dates are authoritative?** Official announcement vs app copy — English says ก 14 / ข 15 พ.ย.; exam-planning calendar treats 13–14 as exam days while its own score text says 14–15.  
3. **Is the hard-coded `u_id` on i-test links intentional personal account binding?** (PII / account leakage risk)  
4. **Should progress sync across devices?** Current architecture cannot; product intent unknown.  
5. **Target users:** single personal tool vs multi-user product?  
6. **Preferred brand/name:** “Study Desk” vs “แผนติว ครูผู้ช่วย…”.  
7. **Are Facebook VIP group links acceptable to ship publicly?** (access control is on FB side; links are in public repos)  
8. **Thumbnail CDN dependency** on `coresg-normal.trae.ai` — ownership/longevity unknown.  
9. **Any CI/CD secrets or Vercel env vars** outside the repo? Not inspectable from source alone.  
10. **Legal/compliance** for redistributing quiz content and course schedules.

---

## 7. Risks ranked by severity

### Critical

1. **Exam date contradictions** — Exam planning `EXAM1 = 2026-11-13` and Day 33/34 label exam days as 13–14 พ.ย., while countdown text, score structure, top-bar, and English app say **14–15 พ.ย.** Users may study or travel on the wrong day.  
2. **Hard-coded personal `u_id` in 40 public i-test URLs** — Appears to embed a personal identifier in a public GitHub repository (privacy / account exposure). Values not reproduced here.

### High

3. **No automated tests** — Merge/regression risk for timetable generation and progress logic.  
4. **Dual sources of truth for daily schedules** — Divergent edits already possible between `dailyPlan` and `Timetable.jsx` generators.  
5. **localStorage-only progress** — Easy data loss (clear site data / new device / privacy mode); quota risk for large timetable JSON.  
6. **Public exposure of VIP / course deep links** — May violate publisher terms or leak gated content URLs.

### Medium

7. **`innerHTML` rendering in exam planning** — Currently fed from hard-coded data (lower risk today); pattern is unsafe if data becomes user-editable.  
8. **SPA catch-all `*` → Dashboard** — Masks broken links; weak accessibility for not-found states.  
9. **External thumbnail host** (`trae.ai`) — Availability/performance/privacy third-party dependency.  
10. **README is Vite boilerplate** — Ops/run instructions incomplete for contributors.  
11. **No TypeScript** despite `@types` packages — Weaker maintainability for a merge.  
12. **Accessibility gaps** — Exam planning relies heavily on emoji and clickable `div`s; English has some ARIA but mixed button labeling.

### Low

13. **Package name `"-"`** in English `package.json`.  
14. **Incompatible visual systems** — Brand/UX unification needed but not a functional blocker.  
15. **Performance:** English ships large seed arrays (timetable + videos) into the main bundle; mitigated somewhat by `React.lazy` routes.

---

## 8. Recommended integration architecture

**Recommendation (architecture, not yet implemented):** Use the **English Vite/React app as the integration host**. Port exam-planning capabilities into it as first-class routes/components. Treat exam-planning HTML as a **content + UX reference**, not as a runtime dependency.

```
┌─────────────────────────────────────────────────────────┐
│  Unified SPA (Vite + React + React Router)              │
│  Brand: decide one product name                         │
├──────────────┬──────────────────────────┬───────────────┤
│ /today       │ Existing Study Desk      │ Shared core   │
│ (from exam   │ / /timetable /plan       │ - examDates.ts│
│  planning)   │ /quiz /notes /videos     │ - storage.ts  │
│ + i-test     │ /info                    │ - migration   │
│   deep links │                          │ - theme       │
└──────────────┴──────────────────────────┴───────────────┘
        │
        ▼
  localStorage (versioned schema)  →  optional later: backend sync
        │
        ▼
  Vercel static deploy (single project)
```

**Why this host:** Already deployed, richer feature set, router, lint, component structure, and exam planning already deep-links into it.

**What not to do initially:** Introduce auth/DB/monorepo unless product requires multi-device sync. Keep client-first until requirements demand a backend.

**Data strategy:**

1. Create a single versioned storage schema (e.g. `kru_unified_v1`).  
2. On first load, migrate from `kru_thp_69_v1` and English keys when present.  
3. Canonicalize **one** daily schedule generator; derive “today checklist” and “timetable” from the same day records.  
4. Externalize exam dates to one module consumed by countdown, dashboard, and plan seed.

---

## 9. Files likely to require changes (Phase B+)

### English host (primary)

- `src/App.jsx` — routes for today/overview/history/resources if added  
- `src/components/Layout.jsx` — nav items, branding, countdown source  
- `src/hooks/useExamCountdown.js` — single source of exam datetime  
- `src/pages/Timetable.jsx` — align generator with canonical daily plan  
- `src/pages/Dashboard.jsx` — surface today-checklist + unified progress  
- `src/pages/Plan.jsx` — reconcile with phases from exam planning  
- `src/data/planData.js`, `videoData.js`, `quizData.js` — dedupe content  
- `src/hooks/useLocalStorage.js` — versioning/migration helpers (new module likely)  
- `vercel.json`, `public/sitemap.xml`, `public/robots.txt` — routes/SEO  
- `package.json` — name/scripts; optionally add tests  
- `README.md` — real product docs  

### New modules (expected)

- `src/data/examCalendar.js` (or similar) — exam dates + registration windows  
- `src/data/dailyPlan.js` — port of exam-planning `dailyPlan` / phases / courses / links  
- `src/pages/Today.jsx` (or Dashboard section) — checklist UX from exam planning  
- `src/lib/storageMigration.js` — LS migration  

### Exam planning repo

- Either **archive** after content port, or replace with redirect page to unified app  
- Remove or anonymize personal `u_id` query params before any further publish  

### Out of scope until approved

- Auth provider, database, server APIs, monorepo tooling, redesign-from-scratch  

---

## 10. Phased implementation plan with acceptance criteria

### Phase A — Audit (this document)

- [x] Inspect both repositories from source  
- [x] Document architecture, features, risks, plan  
- [ ] **Gate:** Stakeholder approval to proceed  

### Phase B — Foundations (no user-visible merge yet)

1. Pin **authoritative exam dates** in writing (product decision).  
2. Add `examCalendar` module and wire countdown/dashboard to it.  
3. Strip or parameterize personal `u_id` from any ported i-test links.  
4. Add storage version + migration scaffold (read both legacy schemas).  
5. Expand README with run/build/deploy instructions.  

**Acceptance:**

- One module exports exam datetime(s); all UI countdown labels match.  
- No personal identifiers committed in link templates.  
- Migration unit tests (once test runner added) cover empty, English-only, exam-only, and both-present LS states.  

### Phase C — Content unification

1. Port `dailyPlan`, phases, courses, important links into typed/JS modules.  
2. Refactor timetable generator to consume the same day records (or generate checklist from timetable).  
3. Deduplicate overlapping VOD/LIVE entries between `Timetable.jsx` and `videoData.js`.  

**Acceptance:**

- Changing a day’s tasks in one data module updates both Today and Timetable views.  
- Side-by-side content review checklist signed off for Oct 12–Nov 15 window.  

### Phase D — UX integration

1. Add Today / Overview / History behaviors into the React shell (or fold into Dashboard + Timetable).  
2. Preserve English features: Quiz, Notes, Videos, Info, Competition, Mock tracker.  
3. Unify navigation labels and empty/loading/error states.  

**Acceptance:**

- Manual QA script passes on desktop and mobile for all former features of both apps.  
- Existing English localStorage progress still loads after upgrade.  
- Exam-planning progress migrates when legacy key present.  

### Phase E — Deploy cutover

1. Deploy unified app to the existing Vercel project (or new project if preferred).  
2. Point exam-planning hosting (once known) to redirect → unified URL.  
3. Update sitemaps and internal important-links.  

**Acceptance:**

- Single production URL serves all features.  
- Old deep links either redirect or remain documented.  
- No production data stores to migrate (client-only).  

### Phase F — Hardening (optional follow-on)

- Add Vitest for calendar/storage/timetable pure functions  
- Accessibility pass (keyboard, labels, reduced motion)  
- Decide on backend sync only if multi-device is required  

---

## 11. Evidence appendix (selected)

| Claim | Source |
|---|---|
| Exam repo file set | `git ls-tree -r HEAD` → `index.html` only |
| English routes | `src/App.jsx` |
| English deploy | `vercel.json`, GitHub `homepage`, live HTTP 200 |
| Exam LS key | `const LS_KEY = 'kru_thp_69_v1'` |
| English LS keys | `useLocalStorage('…')` call sites |
| Cross-link | `importantLinks` → `kru-phuchuay-english-2569.vercel.app` |
| Date bug | `EXAM1 = new Date(2026, 10, 13)` vs countdown/score text “14 พ.ย.” vs English `2026-11-14T09:00:00+07:00` |
| No tests | No `*test*`/`*spec*` files; no `test` npm script |
| No auth/DB | Repo-wide grep; no matches for firebase/supabase/prisma/auth frameworks |

---

## Decision required

Please approve **Phase B** (or request adjustments to the recommended host architecture / exam dates / privacy handling) before any code changes to either product repository or this new project workspace beyond audit artifacts.

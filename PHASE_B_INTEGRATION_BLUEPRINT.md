# Phase B — Integration Blueprint

**Status:** Design complete — awaiting explicit approval before implementation  
**Based on:** [PHASE_A_AUDIT_REPORT.md](./PHASE_A_AUDIT_REPORT.md) (verified 2026-10-14)  
**Constraints honored:** No production data changes, no deploys, no irreversible migrations in this phase.

**Evidence rule:** Architecture must follow what Phase A verified. Neither repository contains a server database, ORM, migrations folder, or authentication provider. Persistence today is **browser `localStorage` only**, with **different keys and shapes**. This blueprint does **not** assume database compatibility.

---

## 1. Primary application recommendation

### Decision

**Primary host: `kru-phuchuay-english-2569` (Vite + React “Study Desk”).**  
**Secondary content source: `Deployment-kru-phuchuay-plan-2569` (static HTML planner).**

### Evidence-based reasoning

| Criterion | Exam planning (HTML) | English Study Desk | Winner |
|---|---|---|---|
| Runtime platform | Single `index.html`, no bundler | Vite 8 + React 19 + Router + Tailwind | English |
| Feature breadth | Today checklist, overview, history, phases, resources | Dashboard, timetable, plan, quiz, notes, videos, HRMS, competition, theme | English |
| Already deployed | Hosting URL unknown; no deploy config in repo | Live Vercel SPA with rewrite + sitemap | English |
| Extensibility for AI / scheduling | Would require rewriting into a framework first | Component + hook structure ready for modules | English |
| Coupling already exists | Deep-links **into** English `/` and `/timetable` | Linked **from** exam planning as “full” app | English |
| Maintainability | 956-line monolith with `innerHTML` | Modular `src/pages`, `src/data`, `src/hooks` | English |
| Testability path | No module boundaries | Pure functions extractable (calendar, storage, schedule) | English |

**Conclusion:** Consolidating into the English app preserves the larger feature set and the live production URL. The HTML repo is treated as a **content + UX reference** (34-day `dailyPlan`, phases, i-test deep links, streak/dot-map overview), not as the runtime host.

---

## 2. Architecture decision and trade-offs

### Decision: **Single consolidated SPA** (Option A)

| Option | Description | Trade-offs | Verdict |
|---|---|---|---|
| **A. Consolidate into one SPA** | Port HTML features into English React app; one Vercel project | One codebase, one deploy, shared state; requires content port + LS migration | **Selected** |
| B. Two frontends + shared services | Keep both UIs; add API/DB later | No shared services exist today; doubles UI maintenance; invents backend prematurely | Rejected for v1 |
| C. Monorepo / micro-frontends | Packages for planner + desk | Over-engineered for ~4k LOC + one HTML file; no team-scale need proven | Rejected for v1 |

### Target architecture (phased)

```
┌──────────────────────────────────────────────────────────────┐
│ Stage 1 (Milestones M1–M5) — Client-first unified SPA        │
│  Vite + React + React Router                                 │
│  Canonical in-memory model ↔ versioned localStorage          │
│  Deterministic scheduling engine (no AI required)            │
│  NL command → validated JSON (AI optional, mocked locally)   │
└──────────────────────────────────────────────────────────────┘
                          │ when multi-device / multi-user required
                          ▼
┌──────────────────────────────────────────────────────────────┐
│ Stage 2 (Milestones M6–M7) — Optional backend                │
│  Auth (identity provider) + per-user row isolation           │
│  Postgres (or equivalent) mirroring canonical schema         │
│  API contracts below; LS becomes cache / offline fallback    │
└──────────────────────────────────────────────────────────────┘
```

**Why Stage 1 first:** Phase A proved there is nothing to “merge” at the database layer. Inventing two compatible DBs would be fiction. Client consolidation delivers user value and a real schema before any cloud data plane.

---

## 3. Canonical data model

Adapted from **verified** local shapes, not a greenfield invent-everything schema.

### 3.1 Mapping from existing storage

| Existing source | Existing shape (verified) | Canonical entity |
|---|---|---|
| English `study_plan[]` | `{ id, priority, title, subtitle, details[], timePerDay, targetScore, color }` | `StudyTopic` + `Task` children |
| English `plan_progress` | `{ [planId_index]: boolean }` | `ProgressEvent` / `Task.completedAt` |
| English `mock_exams[]` | `{ id, name, part, totalScore, userScore, date, note }` | `ExamAttempt` |
| English `daily_timetable_v8[]` | `{ id, date, label, tag, slots[{ id, time, zone, title, note, done, _link? }] }` | `StudySession` (+ optional `Task` link) |
| English `study_videos[]` | `{ id, category, title, description, url, thumbnail, schedule, isLive, isWatched, note }` | `VideoResource` + `VideoProgress` |
| English `study_notes[]` | `{ id, category, subject, title, content, createdAt }` | `Note` |
| English `study_quizzes` / `quiz_results` | quiz defs + score map | `Quiz` / `QuizAttempt` (keep; out of core schedule path) |
| English `competition_rates_v1[]` | district vacancy rows | `CompetitionSnapshot` (keep as-is) |
| English `app_theme_v1` | `'light' \| 'dark'` | `UserPrefs.theme` |
| Exam `kru_thp_69_v1.days` | `{ [YYYY-MM-DD]: { [taskIndex]: boolean } }` | migrate → `Task` completion on that date |
| Exam `kru_thp_69_v1.notes` | `{ [YYYY-MM-DD]: string }` | migrate → `Note` with `kind: 'daily'` |
| Exam `dailyPlan` (hard-coded) | `tasks[{ text, pri, link? }]` per day index | seed → `Task` + optional `VideoResource` link |
| Exam `phases[]` | `{ name, range, desc }` | `StudyPhase` |
| *(none today)* | no user accounts | `UserProfile` (local anonymous first; auth later) |
| *(none today)* | dates duplicated in many files | `Exam` + `ExamCalendar` single module |

### 3.2 Canonical schema (Stage 1 — local document)

Stored as one versioned document: **`kru_unified_v1`**.

```ts
// Conceptual TypeScript — implementation language may remain JS initially

type ISODate = string;      // YYYY-MM-DD (Asia/Bangkok calendar date)
type ISODateTime = string;  // ISO-8601 with offset

interface UnifiedStoreV1 {
  schemaVersion: 1;
  profile: UserProfile;
  exams: Exam[];
  subjects: Subject[];
  phases: StudyPhase[];
  topics: StudyTopic[];
  tasks: Task[];
  sessions: StudySession[];
  videos: VideoResource[];
  videoProgress: Record<string /* videoId */, VideoProgress>;
  notes: Note[];
  examAttempts: ExamAttempt[];
  prefs: UserPrefs;
  scheduleMeta: ScheduleMeta;
}

interface UserProfile {
  id: string;                 // local uuid; later = auth subject
  displayName?: string;
  createdAt: ISODateTime;
  authProvider?: 'local' | 'clerk' | 'supabase' | 'authjs';
  authSubject?: string;       // set only after Stage 2 login
}

interface Exam {
  id: string;                 // e.g. 'exam-part-a-2569'
  title: string;
  part: 'ก' | 'ข' | 'ค' | 'other';
  startsAt: ISODateTime;      // SINGLE SOURCE OF TRUTH for countdown
  endsAt?: ISODateTime;
  totalScore?: number;
  weight?: number;            // scheduling priority weight
}

interface Subject {
  id: string;                 // 'english-major' | 'general-a' | ...
  name: string;
  examPart: Exam['part'];
}

interface StudyPhase {
  id: string;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  description: string;
}

interface StudyTopic {
  id: string;                 // from study_plan.id where possible
  subjectId: string;
  title: string;
  subtitle?: string;
  priority: number;           // 1 = highest (maps plan.priority)
  targetScore?: string;
  color?: string;
}

interface Task {
  id: string;
  topicId?: string;
  subjectId?: string;
  title: string;
  priority: 'high' | 'med' | 'low';
  plannedDate?: ISODate;      // from exam dailyPlan day
  estimatedMinutes?: number;
  sourceUrl?: string;         // i-test / FB (no personal u_id in templates)
  status: 'pending' | 'done' | 'skipped' | 'deferred';
  completedAt?: ISODateTime;
  deferredTo?: ISODate;
  origin: 'seed-exam-html' | 'seed-english' | 'scheduler' | 'user' | 'nl-command';
}

interface StudySession {
  id: string;
  date: ISODate;
  startTime: string;          // '20.00' or '20:00' — normalize to HH:mm
  endTime: string;
  zone: 'เช้า' | 'กลางวัน' | 'บ่าย' | 'คืน' | 'other';
  title: string;
  note?: string;
  taskIds: string[];
  videoId?: string;
  status: 'planned' | 'done' | 'cancelled';
  breakAfterMinutes?: number;
  origin: 'seed' | 'scheduler' | 'user' | 'nl-command';
}

interface VideoResource {
  id: string;
  title: string;
  subjectId?: string;
  topicId?: string;
  tags: string[];
  sourceUrl: string;
  thumbnailUrl?: string;
  category?: string;          // preserve English category strings initially
  isLiveCapable?: boolean;
  durationMinutes?: number;
}

interface VideoProgress {
  watched: boolean;
  watchedSeconds?: number;
  lastOpenedAt?: ISODateTime;
  note?: string;
}

interface Note {
  id: string;
  kind: 'study' | 'daily';
  date?: ISODate;             // for daily notes
  category?: string;
  subjectId?: string;
  title: string;
  content: string;
  createdAt: ISODateTime;
  updatedAt?: ISODateTime;
}

interface ExamAttempt {
  id: string;
  examId?: string;
  name: string;
  part: string;
  totalScore: number;
  userScore: number | null;
  date: ISODate | null;
  note?: string;
}

interface UserPrefs {
  theme: 'light' | 'dark';
  timezone: 'Asia/Bangkok';
  defaultSessionMinutes: number;
  defaultBreakMinutes: number;
  studyWindows: AvailabilityWindow[];  // used by scheduler
}

interface AvailabilityWindow {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // JS weekday
  startTime: string; // HH:mm
  endTime: string;
}

interface ScheduleMeta {
  lastScheduledAt?: ISODateTime;
  engineVersion: string;
  unresolvedConflicts: ScheduleConflict[];
}

interface ScheduleConflict {
  id: string;
  sessionIds: string[];
  reason: 'overlap' | 'outside-availability' | 'past-exam' | 'break-duration';
  severity: 'error' | 'warning';
}
```

### 3.3 Stage 2 relational projection (only if auth/sync approved)

When a real database is introduced, mirror the same entities as tables with:

- `user_id` on every row (RLS / query filter)
- FK: `tasks.topic_id → topics.id`, `sessions` ↔ `tasks` M2M, `videos.subject_id`, etc.
- **No claim** that any existing cloud DB must be merged — none was found.

---

## 4. Authentication and authorization

### Current state (Verified)

No auth in either app. All data is device-local and world-readable if the device is unlocked.

### Plan

| Stage | Auth model | Authorization |
|---|---|---|
| **Stage 1 (default)** | Anonymous local profile (`UserProfile.id` uuid in LS) | Single-device; all local data belongs to that profile |
| **Stage 2 (optional)** | Add Auth.js / Clerk / Supabase Auth behind feature flag | Server enforces `user_id = auth.uid()`; never trust client filters alone |

**Authorization rules (Stage 2):**

1. Every API read/write scoped by authenticated `user_id`.  
2. Seed/catalog content (exam definitions, default video library metadata) may be global read-only.  
3. Progress, notes, custom videos, sessions, attempts are private.  
4. No shared “admin” role required for v1 personal study use; add roles only if multi-tenant teaching use appears.

**Explicit non-goal for Stage 1:** Do not block consolidation on choosing an IdP. Auth is required only when cloud sync ships.

---

## 5. Migration and data reconciliation

### Important correction from Phase A

**There are not multiple server databases to reconcile.** Migration is:

1. **Content migration** (repo → seed modules)  
2. **Client storage migration** (legacy LS keys → `kru_unified_v1`)  
3. Later optional **LS → cloud DB** export for logged-in users  

### 5.1 Client migration algorithm (safe, reversible)

```
on app boot:
  if localStorage has kru_unified_v1 → load it
  else:
    store = emptyCanonical()
    if study_* / daily_timetable_v8 present → importEnglish(store)
    if kru_thp_69_v1 present → importExamHtml(store)
    reconcile(store)  // merge duplicate day tasks by date+normalized title
    backup legacy keys to kru_backup_<timestamp> (same origin)
    write kru_unified_v1
    keep legacy keys readable until M5 acceptance (do not delete in v1)
```

**Reconciliation rules:**

| Conflict | Rule |
|---|---|
| Same calendar day has English slots + HTML task completions | Keep sessions from English; map HTML completion onto tasks with matching `sourceUrl` or normalized title; else attach orphan completions as done tasks on that date |
| Theme | Prefer `app_theme_v1` |
| Videos | Prefer English `study_videos`; enrich tags from HTML links where URL matches |
| Exam dates | Prefer `ExamCalendar` module (product-decided constants), **not** whichever LS blob wins |
| Personal `u_id` in imported HTML links | Strip query param during import; never persist raw personal ids |

**Rollback:** Restore from `kru_backup_*` or re-read untouched legacy keys (v1 never deletes them).

### 5.2 Server DB migration

**N/A until Stage 2.** When added: one-way export `UnifiedStoreV1 → SQL` per user; no dual-write between two legacy DBs because they do not exist.

---

## 6. Routes and compatibility

### Preserve English routes (production URLs already public)

| Route | Status |
|---|---|
| `/` | Keep — Dashboard (enhanced with Today summary) |
| `/timetable` | Keep |
| `/info` | Keep |
| `/plan` | Keep |
| `/quiz` | Keep |
| `/notes` | Keep |
| `/videos` | Keep — expand into full video library |
| `*` | Change from silent Dashboard fallback → dedicated NotFound (compat: log + link home) |

### Add routes for HTML-app parity

| New route | Purpose | HTML view equivalent |
|---|---|---|
| `/today` | Day checklist + motivator + daily note | `view-today` |
| `/overview` | Streak / dot-map / incomplete upcoming | `view-overview` |
| `/history` | Browse any plan day | `view-history` |
| `/resources` | Courses + important links | `view-resources` |
| `/planner` | NL command + schedule regenerate UI | *(new)* |

### Redirects / compatibility

| From | To |
|---|---|
| Exam-planning hosting URL (when known) | `https://kru-phuchuay-english-2569.vercel.app/today` (301/meta refresh) |
| Bookmarks to HTML tab-only UX | Covered by new routes above |
| English deep links in HTML `importantLinks` | Remain valid (same host) |

Nav: extend `src/components/Layout.jsx` `navItems` — group “ติววันนี้ / ตาราง / แผน” vs secondary.

---

## 7. Video library design

### Goals

Store many links with title, subject, topic, tags, source URL, and progress — extending verified `study_videos` fields.

### Model

Use `VideoResource` + `VideoProgress` from §3. UI at `/videos`:

- Filters: subject, topic, tag, watched/unwatched, live-capable  
- CRUD for user-added links (already partially present)  
- Import from seed + URL match against timetable/task links  
- Progress: `watched` boolean (existing) + optional `watchedSeconds`  
- **Do not** depend on `coresg-normal.trae.ai` for new entries; use local placeholder or Open Graph optional fetch later  

### API contract (Stage 1 local; Stage 2 HTTP)

```
listVideos({ subjectId?, tag?, q? }) -> VideoResource[]
upsertVideo(input) -> VideoResource
setVideoProgress(videoId, patch) -> VideoProgress
deleteVideo(videoId) -> void  // user-origin only; seed soft-hide
```

---

## 8. Natural-language command workflow

### Purpose

Convert requests like *“เลื่อนงานที่ยังไม่เสร็จไปหลังสอบภาค ก และติว Grammar 90 นาทีทุกเย็น”* into **validated structured constraints** before the scheduler runs.

### Pipeline

```
User text
  → NL Parser (AI or local rules)
  → ConstraintDraft (untrusted JSON)
  → Zod/JSON-schema validator (trusted gate)
  → ConstraintSet (accepted)
  → SchedulingEngine.generate(ConstraintSet)
  → Preview diff (sessions add/move/cancel)
  → User confirm
  → Persist
```

### Constraint schema (validated)

```ts
interface ConstraintSet {
  version: 1;
  examDeadlineIds?: string[];          // must finish before these exams
  availability?: AvailabilityWindow[]; // overrides prefs temporarily
  priorities?: { topicId: string; priority: number }[];
  sessionDurationMinutes?: { min: number; max: number; default: number };
  breakMinutes?: number;
  includeTaskIds?: string[];
  excludeTaskIds?: string[];
  deferUnfinished?: { mode: 'next-open-slot' | 'after-date'; afterDate?: ISODate };
  avoidDates?: ISODate[];
  hardStopAt?: ISODateTime;            // never schedule past exam
}

// Parser output MUST pass validation; on failure → show errors, do not schedule
```

### AI vs non-AI

| Step | Needs external AI API? |
|---|---|
| Parse free text → ConstraintDraft | **Yes** (optional); Stage 1 ships rule-based templates + manual form |
| Validate ConstraintDraft | **No** |
| Schedule generation | **No** (deterministic engine) |
| Explain schedule in Thai prose | Optional AI |

Stage 1 acceptance does **not** require a live AI key; include a `MockNlParser` and a structured form that emits the same `ConstraintSet`.

---

## 9. Scheduling engine

### Inputs

- `Exam[]` deadlines  
- `UserPrefs.studyWindows` + ConstraintSet availability  
- Open `Task[]` (`pending` / `deferred`) with priority + estimate  
- Existing `StudySession[]` (treat user-locked sessions as immovable)  
- Breaks: `defaultBreakMinutes` between sessions  
- Conflicting events: overlapping sessions, sessions after `hardStopAt`

### Algorithm (deterministic, testable)

1. Build time grid from availability between `today` and earliest relevant exam.  
2. Subtract immovable sessions and `avoidDates`.  
3. Sort open tasks by `(priority ASC, exam weight DESC, estimatedMinutes DESC)`.  
4. Pack tasks into sessions respecting duration min/max; insert breaks.  
5. Emit `ScheduleConflict[]` for anything that cannot fit before deadline.  
6. Never auto-delete user `origin:'user'` sessions without confirmation.

### Outputs

- Proposed `StudySession[]` patch  
- Leftover `Task[]` marked with conflict reasons  
- Preview for UI confirmation  

---

## 10. Progress tracking and safe reschedule

### Progress model

- Task status: `pending | done | skipped | deferred`  
- Session status: `planned | done | cancelled`  
- Aggregates: % tasks done, streak (from HTML overview), mock averages (existing Dashboard)  

### Safe reschedule of unfinished work

1. Identify unfinished: `task.status === 'pending' && plannedDate < today` (or session planned & past & not done).  
2. User action or NL `deferUnfinished`.  
3. Engine assigns `deferredTo` / new sessions **only in a preview**.  
4. Persist on confirm; write `ProgressEvent`-equivalent via status fields.  
5. Never clear completion history.

---

## 11. External AI API usage and cost (separate from Cursor)

### Features that need an external AI API

| Feature | AI required? | Notes |
|---|---|---|
| NL → ConstraintDraft | Optional → Yes for free-text UX | Largest token use |
| Thai explanation of schedule diff | Optional | Small completions |
| Auto-tagging video titles | Optional | Batch, infrequent |
| Deterministic scheduler | **No** | Local |
| Quiz scoring, CRUD, countdown | **No** | Local |
| Cursor agent development | **N/A** | Billed to Cursor, not app ops |

### Operational cost estimate (app runtime, **not Cursor**)

Assumptions (hypothesis — tune after measuring): personal use, ~20 NL commands/day, ~800 tokens in + 400 out each, provider ~$0.50 / 1M input and ~$1.50 / 1M output (order-of-magnitude; pick actual model at implementation).

| Item | Monthly estimate |
|---|---|
| NL parse 20/day × 30 | ~480k in + 240k out tokens → **≈ $0.60** |
| Optional explanations 20/day | similar → **≈ $0.40** |
| Safety margin / retries | **≈ $1–2** |
| **Personal-scale total** | **≈ $2–5 / month** |
| Class of 50 active users × same habit | **≈ $100–250 / month** |

**Controls:** daily quota, cache identical prompts, default to form/templates when no API key, never send full notes vault—only command text + compact task titles.

---

## 12. Testing, security, backup, rollback, deployment, monitoring

### Testing strategy

| Layer | What | Tooling (to add) |
|---|---|---|
| Unit | examCalendar, migration, constraint validate, scheduler packer | Vitest |
| Integration | LS migrate English-only / HTML-only / both / neither | Vitest + jsdom |
| Component | Today checklist, Videos filters, Planner preview confirm | Vitest + Testing Library |
| E2E smoke | Critical routes load; toggle task persists | Playwright (optional M5+) |
| Lint | Existing Oxlint | `npm run lint` |
| Manual QA | Feature parity checklist from Phase A inventories | Spreadsheet / markdown |

**No tests exist today** — M1 adds Vitest without blocking UI port.

### Security

1. Strip personal `u_id` from any ported i-test URL templates.  
2. Validate NL JSON; never `eval`; scheduler only accepts `ConstraintSet`.  
3. `rel="noopener noreferrer"` on external links (already used in places).  
4. Avoid persisting secrets; Stage 2 AI keys only in server env.  
5. Stage 2: RLS / server-side user scoping.  
6. Reduce `innerHTML` patterns — React text binding only.  
7. CSP headers on Vercel when feasible.

### Backup

- Stage 1: `kru_backup_*` snapshots + in-app JSON export/import.  
- Stage 2: managed DB automated backups (provider default) + point-in-time if offered.

### Rollback

- App: Vercel instant rollback to previous deployment.  
- Data: rehydrate from `kru_backup_*` or legacy keys (retained through M5).  
- Feature flags: `enableNlAi`, `enableSchedulerWrite`, `enableCloudSync` default off until acceptance.

### Deployment

- Continue English Vercel project; SPA rewrite unchanged.  
- Exam HTML site → redirect when host known.  
- Env (Stage 1): none required. Stage 2 names only (no values here): `AUTH_*`, `DATABASE_URL`, `AI_API_KEY`, `AI_MODEL`.

### Monitoring

- Stage 1: Vercel Analytics / error free console; optional Sentry DSN later.  
- Track client metrics: migration success, scheduler conflict counts, NL validation failure rate (privacy-safe).  
- Stage 2: API latency, auth failure rate, AI token usage gauge + budget alert.

---

## 13. UI changes (summary)

| Area | Change |
|---|---|
| `Layout` nav | Add Today, Overview, History, Resources, Planner |
| Dashboard `/` | Embed today’s top tasks + migration banner if legacy imported |
| New `/today` | Port HTML checklist UX into React |
| `/videos` | Filters, tags, subject/topic fields |
| `/planner` | Constraint form + NL box + schedule preview |
| Countdown | Read only from `examCalendar` |
| NotFound | Replace silent `*` → Dashboard |

Visual system: keep English Study Desk design system for cohesion; selectively reuse HTML planner interaction patterns (priority chips, mark-all).

---

## 14. API contracts

### Stage 1 — in-process modules (not HTTP)

```
storage.load(): UnifiedStoreV1
storage.save(store): void
storage.migrateFromLegacy(): MigrateReport

calendar.getExams(): Exam[]
calendar.countdown(now): { days, hours, minutes, isPast }

nl.parse(text): ConstraintDraft        // AI or mock
constraints.validate(draft): ConstraintSet | ValidationError[]

scheduler.preview(store, constraints): SchedulePreview
scheduler.apply(store, preview): UnifiedStoreV1

videos.list / upsert / setProgress / remove
tasks.toggle / defer
sessions.toggleDone
```

### Stage 2 — HTTP (future)

```
POST /api/auth/*          # IdP handlers
GET  /api/me
GET  /api/store           # or resource-scoped CRUD
PUT  /api/store
POST /api/nl/parse        # server-side AI key
POST /api/schedule/preview
POST /api/schedule/apply
```

All Stage 2 routes require auth; body schemas match Stage 1 modules.

---

## 15. Milestones (small, with real paths)

Paths refer to the **English repo** as integration host:  
`https://github.com/zaza123zxzx35/kru-phuchuay-english-2569`  
(Audit clone layout: `src/...` as inspected.)

Content sourced from exam HTML:  
`https://github.com/zaza123zxzx35/Deployment-kru-phuchuay-plan-2569/index.html`

### M0 — Product decisions (blocking)

- [ ] Authoritative exam datetimes (resolve 13–14 vs 14–15 contradiction)  
- [ ] Confirm Stage 1 client-only (no IdP yet)  
- [ ] Confirm AI: mock-first vs live key  

**Files:** none (decision record in this blueprint / issue tracker)  
**Acceptance:** Written answers recorded before M1 code merges.

### M1 — Foundations: calendar, storage, tests scaffold

**Modules expected to change/add:**

- `package.json` — add `vitest`, `test` script  
- `vite.config.js` — test config if needed  
- `src/data/examCalendar.js` **(new)**  
- `src/lib/storage/schema.js` **(new)**  
- `src/lib/storage/migrate.js` **(new)**  
- `src/lib/storage/backup.js` **(new)**  
- `src/hooks/useLocalStorage.js` — delegate to versioned store or coexist briefly  
- `src/hooks/useExamCountdown.js` — import from `examCalendar`  
- `src/lib/storage/*.test.js` **(new)**  

**Acceptance:**

- Countdown + Dashboard date labels match `examCalendar` only.  
- Migration unit tests cover empty / English-only / HTML-only / both.  
- Legacy keys retained after migrate.  
- No personal `u_id` written into `kru_unified_v1`.

### M2 — Content port: daily plan, phases, resources

**Add/change:**

- `src/data/dailyPlan.js` **(new)** — port from HTML `dailyPlan` / `phases` / `courses` / `importantLinks`  
- `src/data/planData.js` — align priorities with phases  
- `src/pages/Today.jsx` **(new)**  
- `src/pages/Overview.jsx` **(new)**  
- `src/pages/History.jsx` **(new)**  
- `src/pages/Resources.jsx` **(new)**  
- `src/App.jsx` — register routes  
- `src/components/Layout.jsx` — nav items  
- `public/sitemap.xml` — new routes  

**Acceptance:**

- `/today` shows correct day tasks for Bangkok today.  
- Completing a task persists and reflects on Overview streak/dot-map.  
- i-test links work without embedded personal ids.

### M3 — Unify timetable + tasks (single source of truth)

**Change:**

- `src/pages/Timetable.jsx` — consume canonical tasks/sessions; shrink inline generators  
- `src/data/dailyPlan.js` / `src/lib/schedule/seedSessions.js` **(new)**  
- `src/pages/Dashboard.jsx` — read unified progress  
- `src/pages/Plan.jsx` — bind to `topics` / `tasks`  

**Acceptance:**

- Editing task title/date in data module updates Today + Timetable.  
- No dual divergent hard-coded Oct–Nov calendars remain in UI code.

### M4 — Video library upgrade

**Change:**

- `src/data/videoData.js` — add `subjectId`, `topicId`, `tags[]`  
- `src/pages/Videos.jsx` — filters, tag editor, progress  
- `src/lib/videos/catalog.js` **(new)** optional helpers  

**Acceptance:**

- Can store ≥100 links with title/subject/topic/tags/url/progress without schema break.  
- Watched state survives reload via unified store.

### M5 — Planner: constraints + scheduling engine + NL mock

**Add/change:**

- `src/lib/nl/constraintSchema.js` **(new)**  
- `src/lib/nl/mockParser.js` **(new)**  
- `src/lib/nl/validate.js` **(new)**  
- `src/lib/schedule/engine.js` **(new)**  
- `src/lib/schedule/reschedule.js` **(new)**  
- `src/pages/Planner.jsx` **(new)**  
- `src/App.jsx` / `Layout.jsx` — wire `/planner`  
- tests under `src/lib/nl/*.test.js`, `src/lib/schedule/*.test.js`  

**Acceptance:**

- Invalid NL JSON never mutates sessions.  
- Preview → confirm required before write.  
- Unfinished tasks reschedule only into available windows before exam hard stop.  
- Conflicts listed when work cannot fit.

### M6 — (Optional) Live AI parse

**Add/change:**

- Serverless route **or** vetted client proxy pattern (prefer server): e.g. `api/nl-parse.js` if Vercel functions added  
- Env names: `AI_API_KEY`, `AI_MODEL` (values not committed)  
- Feature flag in prefs  

**Acceptance:**

- Without key, UI falls back to mock/form.  
- With key, parse → validate → same scheduler path.  
- Token usage loggable; daily cap enforced.

### M7 — (Optional) Auth + cloud sync

**Add/change:**

- Auth provider wiring + `UserProfile.authSubject`  
- DB schema migration files (new; none exist today)  
- API routes per §14  
- RLS / server checks  

**Acceptance:**

- User A cannot read User B progress (automated test).  
- Export/import from Stage 1 store succeeds.  
- Rollback path documented and rehearsed on staging.

### M8 — Cutover + HTML redirect

**Change:**

- Exam planning repo: replace or add redirect `index.html` → unified `/today`  
- English `README.md` — real product docs (replace Vite boilerplate)  
- `package.json` name field (currently `"-"`)  

**Acceptance:**

- Single production entrypoint serves all preserved features.  
- Manual parity checklist signed off.  
- Vercel rollback verified.

---

## 16. Risks (blueprint-level)

| Risk | Mitigation |
|---|---|
| Exam date still undecided | **Hard gate on M0** |
| LS quota / large timetable JSON | Compact sessions; periodic backup prune |
| Content drift during port | One seed module; delete duplicate generators in M3 |
| AI cost spikes | Mock-first; quotas; Stage 1 no AI key |
| Users lose progress on migrate | Backups + retain legacy keys + export button |
| VIP link policy | Keep as external URLs; add disclaimer; no scraping |

---

## 17. Measurable acceptance criteria (program-level)

1. **Parity:** 100% of Phase A feature inventory items reachable in the unified SPA (mapped in QA sheet).  
2. **Dates:** Zero UI surfaces showing conflicting exam days after M1.  
3. **Privacy:** Zero committed personal `u_id` query params in seed data after M2.  
4. **Migration:** All four legacy LS fixtures migrate with automated tests green.  
5. **Scheduler:** Given a fixed fixture, engine output is deterministic (hash-stable) and never places sessions after `hardStopAt`.  
6. **NL safety:** 100% of invalid drafts rejected in tests; no persistence.  
7. **Deploy:** Production rollback < 5 minutes via Vercel previous deployment.  
8. **AI ops:** If M6 enabled, monthly spend stays under agreed budget (default suggest $5 personal / configurable).  

---

## 18. Explicit non-actions (this phase)

- No implementation commits to product repos  
- No `npm install` / lockfile changes required for blueprint delivery  
- No production deploys  
- No deletion of legacy localStorage keys in user browsers  
- No irreversible DB migrations (no DB exists to migrate)

---

## Decision required to proceed

Please approve **implementation starting at M0→M1**, and answer:

1. **Exam datetimes:** Are official ภาค ก / ภาค ข moments **14 & 15 พ.ย. 2569 09:00 +07:00** (English app), or another source of truth?  
2. **Stage 1 scope:** Client-only unified SPA first — confirm?  
3. **AI:** Mock/form first (M5) before live API (M6) — confirm?  
4. **Auth:** Defer to M7 until multi-device sync is needed — confirm?

After explicit approval, implementation can begin on the English host repository (or this workspace as the consolidation target, if you prefer to vendor the code here).

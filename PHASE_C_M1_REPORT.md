# Phase C — Milestone M1 Report

**Status:** Complete  
**Date:** 2026-10-14  
**Scope:** Foundations only (exam calendar, versioned storage migration, Vitest). Smart Planner / Video Library upgrades / Scheduler / AI deferred to later milestones.

## M0 defaults applied

| Question | Choice used |
|---|---|
| Exam datetimes | ภาค ก `2026-11-14T09:00:00+07:00`, ภาค ข `2026-11-15T09:00:00+07:00` |
| Stage 1 | Client-only unified SPA |
| AI | Not in M1 (mock/live later) |
| Auth | Deferred |

## Intended changes (executed)

| File | Change |
|---|---|
| Vendored English SPA into workspace | Base app from `kru-phuchuay-english-2569` |
| `src/data/examCalendar.js` | **New** single source of exam dates |
| `src/lib/storage/*` | **New** schema, migrate, backup, sanitize, constants |
| `src/components/StorageBootstrap.jsx` | **New** boot-time migration |
| `src/hooks/useExamCountdown.js` | Uses `examCalendar` |
| `src/components/Layout.jsx` | Date label from calendar |
| `src/pages/Dashboard.jsx` | Key dates from calendar |
| `src/App.jsx` | Wraps app with `StorageBootstrap` |
| `package.json` | Name `kru-exam-planner`; `test` script; Vitest deps |
| `vite.config.js` | Dev port `43123`; Vitest config |
| `*.test.js` | Calendar, sanitize, migrate fixtures |
| `README.md` | Run/test/deploy docs |

## Test results (actually run)

```
npm test   → 3 files, 13 tests passed
npm run lint → clean (0 warnings after StorageBootstrap fix)
npm run build → success
```

## Remaining risks

- Existing pages still read legacy `useLocalStorage` keys (intentional M1 coexistence). Dual-write not yet unified.
- HTML `dailyPlan` seed not ported as a data module yet (M2); exam-html import accepts `dailyPlanByDate` option for tests/future.
- No E2E tests yet.
- Official exam dates still should be confirmed against announcements.

## Next recommended step

**M2 — Content port:** `dailyPlan.js`, `/today`, `/overview`, `/history`, `/resources` routes from the HTML planner, with i-test links sanitized at seed time.

# Phase G — M4 Smart Planner Report

**Status:** Complete  
**Date:** 2026-10-14  
**Scope:** User-facing Smart Planner on top of M3 schedule SSOT (M5 not started)

## Approach

No LLM or paid API exists in this repository. M4 ships a **deterministic** planner:

1. Natural-language keyword/rule interpreter → structured request  
2. Strict schema validation (rejects unknown fields)  
3. Preview via M3 `proposeSessionsForTasks` (overlap-aware packing)  
4. Explicit **Apply** / **Cancel** — no silent writes  

Limitation documented in UI and below: full generative AI interpretation is deferred to M5+.

## Route

| Path | Page |
|---|---|
| `/planner` | Smart Planner |

Nav label: **Smart Planner**. Writes only through `kru_schedule_v1` (+ M3 legacy dual-write).

## Modules

| Path | Role |
|---|---|
| `src/lib/smartPlanner/schema.js` | Request IR + strict validation |
| `src/lib/smartPlanner/interpret.js` | Deterministic NL → form fields |
| `src/lib/smartPlanner/subjects.js` | Subjects + resource matching (existing URLs only) |
| `src/lib/smartPlanner/generate.js` | Preview generation |
| `src/lib/smartPlanner/apply.js` | Apply / cancel (cancel = no-op on storage) |
| `src/lib/schedule/engine.js` | Added `proposeSessionsForTasks` |
| `src/pages/SmartPlanner.jsx` | UI |

## Safety guarantees

- Preview never mutates storage.  
- Apply adds `smart_*` tasks/sessions only; skips duplicates; re-checks overlaps.  
- Existing sessions preserved; completed tasks never unmarked.  
- Confirm dialog before Apply.  
- Resource URLs come only from `importantLinks` / planner inventory — never invented.

## Tests executed

| Command | Result |
|---|---|
| `npm test` | **51/51 passed** (10 files) |
| `npm run lint` | **clean** |
| `npm run build` | **success** |

Coverage includes: valid/invalid NL, missing exam/availability, schema rejection, conflict avoidance, session preservation, duplicate prevention, cancel no-op, apply persistence, unschedulable explanations, missing resources.

## Known limitations

- NL parsing is rule-based (Thai/English keywords), not an LLM.  
- Smart tasks are subject/topic templates + optional pull-in of matching unfinished HTML tasks — not a full rewrite of the 139-task plan.  
- Course names without URLs surface as incomplete resource hints.  
- M5 AI assist not started.  
- No deploy performed.

## Stop point

**M4 complete. Waiting for approval before M5.**

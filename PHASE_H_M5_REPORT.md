# Phase H — M5 Context-Aware Study Assistant Report

**Status:** Complete  
**Date:** 2026-10-14  
**Scope:** Deterministic conversational assistant on M3/M4 (no external LLM)

## Approach

No LLM API or paid dependency was added. The assistant uses:

1. Deterministic intent classification (Thai + English)  
2. M4 `interpretNaturalLanguage` + strict planner schema  
3. M3 `proposeSessionsForTasks` / `rescheduleUnfinished` / `applyPlanPreview` for mutations  
4. Explicit preview → confirm / cancel for every schedule change  

## Route

| Path | Label |
|---|---|
| `/assistant` | ผู้ช่วยติว |

Conversation history is stored in **`sessionStorage`** key `kru_assistant_v1` (messages + draft request only; cleared when the tab session ends). No account PII is collected.

## Supported intents (implemented + tested)

| Intent | Mutates schedule? |
|---|---|
| Create study plan | Preview → confirm |
| Revise proposed plan | Preview → confirm |
| Add task | Preview → confirm |
| Remove task | Preview → confirm |
| Reschedule unfinished work | Preview → confirm |
| Change session duration | Preview → confirm |
| Change daily study limit | Preview → confirm |
| Change priority | Preview → confirm |
| Show today's plan | Read-only |
| Show exam dates | Read-only |
| Summarize progress | Read-only |
| Find resources by subject | Read-only |
| Help | Read-only |
| Confirm / Cancel | Apply or discard pending |

Unsupported or ambiguous commands ask for clarification instead of guessing.

## Safe change workflow

1. Interpret → validate  
2. Build preview with M3/M4 engine  
3. Show summary; keep `pendingChange` in context  
4. User says confirm/cancel  
5. Apply atomically via existing store update, or discard with no writes  

Relative dates use an injectable `createDateProvider({ todayIso })` (Asia/Bangkok calendar via existing helpers). Tests never depend on wall-clock time.

## Modules

- `src/lib/assistant/` — dateProvider, relativeDates, intents, context, handlers, dialogue  
- `src/pages/Assistant.jsx` — chat UI  
- Nav / NotFound / sitemap / routes updated  

## Tests executed

| Command | Result |
|---|---|
| `npm test` | **64/64 passed** (11 files) |
| `npm run lint` | **clean** |
| `npm run build` | **success** |

Coverage includes TH/EN intents, multi-turn revise/cancel, ambiguous/unsupported, relative dates + timezone boundaries via fixed provider, schema validation, preview/cancel, confirm + persistence, conflict/duplicate protection, read-only non-mutation, plus existing M3/M4 suites.

## Known limitations

- Rule-based assistant, not a generative LLM.  
- Task removal matches by title/id substring (may need clarification when many matches).  
- Pending confirmations are session-scoped.  
- No deploy performed.

## Stop point

**M5 complete. Ready for approval.** Existing Smart Planner, Timetable, Today, Overview, History, and Resources remain in place.

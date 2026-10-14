# Intelligent Exam Planning Platform — Phase A

This workspace currently holds the **Phase A source-code audit** for merging:

1. [Deployment-kru-phuchuay-plan-2569](https://github.com/zaza123zxzx35/Deployment-kru-phuchuay-plan-2569) (static HTML exam planner)
2. [kru-phuchuay-english-2569](https://github.com/zaza123zxzx35/kru-phuchuay-english-2569) (Vite/React Study Desk — live on Vercel)

## Deliverable

- **[PHASE_A_AUDIT_REPORT.md](./PHASE_A_AUDIT_REPORT.md)** — full evidence-based audit (architecture, features, storage, deployment, risks, integration plan)

**No integration code has been implemented.** Approval is required before Phase B.

## Quick verdict

| Topic | Finding |
|---|---|
| Shared server DB | None found in either repo |
| Auth | None |
| English app | Vite + React 19 + Tailwind; deployed to Vercel |
| Exam planning | Single `index.html`; deploy config not in repo |
| Top risks | Exam-date contradictions; hard-coded personal `u_id` in public i-test links |

## Next step

Review the audit report, confirm authoritative exam dates and privacy handling, then approve Phase B (foundations) before any merge work.

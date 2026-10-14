# Intelligent Exam Planning Platform

Planning workspace for merging:

1. [Deployment-kru-phuchuay-plan-2569](https://github.com/zaza123zxzx35/Deployment-kru-phuchuay-plan-2569) (static HTML exam planner)
2. [kru-phuchuay-english-2569](https://github.com/zaza123zxzx35/kru-phuchuay-english-2569) (Vite/React Study Desk — live on Vercel)

## Deliverables

| Phase | Document | Status |
|---|---|---|
| A | [PHASE_A_AUDIT_REPORT.md](./PHASE_A_AUDIT_REPORT.md) | Complete |
| B | [PHASE_B_INTEGRATION_BLUEPRINT.md](./PHASE_B_INTEGRATION_BLUEPRINT.md) | Blueprint complete — awaiting approval |

**No product integration code has been implemented.** Explicit approval is required before M1 implementation.

## Blueprint summary

- **Primary host:** English Vite/React SPA (evidence: live Vercel deploy, broader features, modular `src/`)
- **Architecture:** Single consolidated SPA (Stage 1 client `localStorage`); optional auth/DB only in later milestones
- **No server DB merge:** Phase A found none — migration is content + legacy LS → `kru_unified_v1`
- **Top gates:** Resolve exam dates; strip personal `u_id` from i-test templates; mock NL before live AI

## Next step

Answer the M0 questions in the Phase B blueprint, then approve implementation starting at M1.

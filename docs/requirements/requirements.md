# Requirements Tracker

Source of truth: `docs/requirements/requirements-checklist.csv`

## How to Use

Tracking fields:
- `Status`: `Planned`, `In Progress`, `Done`, `Blocked`
- `Priority`: `High`, `Medium`, `Low`
- `Owner`: person accountable for next action
- `Last Reviewed`: last date the row was reviewed (`YYYY-MM-DD`)
- `Evidence/Link`: PR, migration, screenshot, or log reference

Update rules:
1. Any requirement status change must be updated in this file and in `requirements-checklist.csv`.
2. On every weekly ops review, update `Last Reviewed` for all active rows (`Planned` or `In Progress`).
3. If a row is marked `Done`, add evidence.

## Requirement Checklist

| ID | Area | Requirement | Status | Priority | Owner | Last Reviewed | Evidence/Link | Notes |
|---|---|---|---|---|---|---|---|---|
| R-D1 | Data | Candidate records | In Progress | High | Unassigned | 2026-04-27 | `pb_migrations/1774000000_candidates_documents_production_hardening.js` | Core profile fields are present; continue normalizing document handling. |
| R-D2 | Data | Employer/company records | In Progress | High | Unassigned | 2026-04-27 | `pb_migrations/1774000000_candidates_documents_production_hardening.js` | Core metadata available; review optional finance fields. |
| R-D3 | Data | Job order management | In Progress | High | Unassigned | 2026-04-27 | `docs/requirements/pocketbase-alignment.md` | Schema covers key fields; validate workflows in UI. |
| R-D4 | Data | Placement/hiring records | In Progress | High | Unassigned | 2026-04-27 | `docs/requirements/pocketbase-alignment.md` | Core placement tracking exists; verify reporting readiness. |
| R-D5 | Data | Document tracking | In Progress | High | Unassigned | 2026-04-27 | `pb_migrations/1774000000_candidates_documents_production_hardening.js` | `documents` collection exists; finish migration from legacy fixed fields. |
| R-D6 | Data | Interview and assessment tracking | In Progress | Medium | Unassigned | 2026-04-27 | `docs/requirements/pocketbase-alignment.md` | Interview records exist; scoring/reporting depth can expand. |
| R-F1 | Functional | Search and filtering | In Progress | High | Unassigned | 2026-04-27 | `docs/requirements/pocketbase-alignment.md` | Base querying exists; optimize indexes/UX filters as data grows. |
| R-F2 | Functional | Matching engine | Planned | Medium | Unassigned | 2026-04-27 |  | Define scoring model and explainability rules. |
| R-F3 | Functional | Reporting and analytics | Planned | High | Unassigned | 2026-04-27 |  | Define KPI dashboard and aggregation strategy. |
| R-F4 | Functional | Status tracking pipeline | In Progress | High | Unassigned | 2026-04-27 | `docs/requirements/pocketbase-alignment.md` | Status fields exist; align stage definitions across modules. |
| R-F5 | Functional | Bulk actions | Planned | Medium | Unassigned | 2026-04-27 |  | Implement safe bulk update and audit safeguards. |
| R-F6 | Functional | User roles and access | In Progress | High | Unassigned | 2026-04-27 | `pb_migrations/1772779312_updated_users_roles_staff.js` | Standard role set is `administrator`, `manager`, `staff`; finalize permission rules. |
| R-C1 | Compliance | Data privacy controls | Planned | High | Unassigned | 2026-04-27 |  | Add consent lifecycle and data deletion workflow. |
| R-C2 | Compliance | Security controls | In Progress | High | Unassigned | 2026-04-27 | `scripts/serve-production.ps1` | Encryption key enforcement exists; continue hardening auth/transport/storage. |
| R-C3 | Compliance | Audit trails | In Progress | High | Unassigned | 2026-04-27 | `pb_hooks/main.pb.js` | Audit logs are present; validate event coverage by collection. |
| R-C4 | Compliance | Backup and recovery | In Progress | High | Unassigned | 2026-04-27 | `scripts/pb-backup.ps1`, `scripts/pb-restore.ps1` | Weekly restore drills must be logged consistently. |
| R-T1 | Technical | Scalability | Planned | Medium | Unassigned | 2026-04-27 |  | Add index and performance test plan for target growth. |
| R-T2 | Technical | Reliability/uptime | In Progress | High | Unassigned | 2026-04-27 | `scripts/pb-healthcheck.ps1` | Define SLA and alert thresholds with owners/escalation. |
| R-T3 | Technical | Ease of use (UI/UX) | In Progress | Medium | Unassigned | 2026-04-27 | `skillstrader-frontend/src/components/custom/Login.tsx` | Continue role-specific flow simplification. |
| R-T4 | Technical | Integrations | Planned | Low | Unassigned | 2026-04-27 |  | Email/SMS/accounting integration discovery is pending. |
| R-T5 | Technical | Data migration plan | Planned | Medium | Unassigned | 2026-04-27 |  | Define source-to-target mapping and validation checks. |

## Current Focus (Next 2 Sprints)

1. Complete document tracking migration and deprecate legacy candidate file fields safely.
2. Finalize role-based access rules per collection (`administrator`, `manager`, `staff`).
3. Ship minimum analytics/reporting for placements and pipeline health.
4. Operationalize weekly restore drill evidence and monthly requirements review cadence.
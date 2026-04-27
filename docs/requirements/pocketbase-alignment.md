# PocketBase Alignment to Requirements

This document maps the current PocketBase implementation to the requirements tracker.

Related docs:
- `docs/requirements/requirements.md`
- `docs/requirements/requirements-checklist.csv`

## Current Collections (high level)

- `employer`: company/contact metadata and contracts
- `candidates`: candidate profile data and legacy document fields
- `job_orders`: job definition, employer relation, status and salary details
- `placements`: candidate/job relationship and placement lifecycle fields
- `interviews`: interview records and assessment notes/scores
- `documents`: canonical typed document records (candidate/employer linked)
- `audit_logs`: append-only audit trail from hooks
- `_pb_users_auth_`: auth users with role (`administrator`, `manager`, `staff`)

## Alignment Matrix

| Requirement ID | Status | PocketBase Alignment | Gaps / Next Actions |
|---|---|---|---|
| R-D1 | In Progress | Candidate profile fields exist, including files and consent metadata | Continue migration from legacy document fields to `documents` |
| R-D2 | In Progress | Employer metadata and contract file support exists | Review and finalize billing data completeness |
| R-D3 | In Progress | Job order core schema implemented (`status`, openings, salary fields, employer link) | Validate query/index strategy for larger datasets |
| R-D4 | In Progress | Placement relation and fee/timeline fields are implemented | Add reporting views/queries for operational KPIs |
| R-D5 | In Progress | `documents` collection implemented for typed document tracking | Complete backfill and retire legacy candidate document fields |
| R-D6 | In Progress | Interview records exist with notes/results and optional scoring | Expand structured assessment/reporting model if needed |
| R-F1 | In Progress | PocketBase filtering/querying supports baseline search | Improve UX filters and indexing |
| R-F2 | Planned | No matching engine model in schema yet | Define ranking/scoring model and implementation path |
| R-F3 | Planned | No full analytics/reporting layer yet | Define KPI outputs and materialized query strategy |
| R-F4 | In Progress | Status fields exist across major collections | Standardize stage vocabulary and transitions |
| R-F5 | Planned | No explicit bulk workflow schema/policies | Add app-layer bulk actions with audit safeguards |
| R-F6 | In Progress | Role field standardized to `administrator|manager|staff` | Finalize and verify per-collection role rules |
| R-C1 | Planned | Some consent fields present | Add full data privacy workflow (access/delete lifecycle) |
| R-C2 | In Progress | Encryption key enforcement via startup script is present | Continue hardening transport/storage and auth policies |
| R-C3 | In Progress | `audit_logs` + hook-based write behavior are implemented | Verify all critical collections/events are covered |
| R-C4 | In Progress | Backup/restore/drill scripts are present | Enforce cadence and evidence logging discipline |
| R-T1 | Planned | No dedicated scale benchmark/index plan documented | Define load targets and indexing roadmap |
| R-T2 | In Progress | Healthcheck script exists | Define SLA and escalation ownership |
| R-T3 | In Progress | UX improvements are actively implemented in frontend | Add usability acceptance criteria per role |
| R-T4 | Planned | Integration schema/workflows not yet implemented | Prioritize integration targets (email/SMS/accounting) |
| R-T5 | Planned | No formal migration execution scripts finalized | Create source mapping and data validation process |

## Change Rule

When migrations or role/access rules change:
1. Update this file.
2. Update `docs/requirements/requirements.md` and `requirements-checklist.csv`.
3. Link evidence (migration file, PR, or script) in the tracker rows.
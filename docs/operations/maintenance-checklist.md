# Operations and Documentation Maintenance Checklist

Use this file as the recurring tracker for weekly/monthly maintenance work.

## Recurring Checklist

### Weekly

- [ ] Run restore drill and log it in `docs/operations/restore-drill-log.md`
- [ ] Review backup output and confirm latest backup integrity
- [ ] Review healthcheck failures and close any unresolved alerts
- [ ] Update active requirement rows (`Planned` / `In Progress`) last-reviewed dates

### Monthly

- [ ] Review production runbook accuracy (`docs/operations/production-runbook.md`)
- [ ] Review command reference accuracy (`docs/operations/pocketbase.md`)
- [ ] Review requirements priority/order (`docs/requirements/requirements.md`)
- [ ] Confirm role terminology consistency across docs (`administrator`, `manager`, `staff`)

## Maintenance Log

| Date (UTC+8) | Type (Weekly/Monthly) | Owner | Scope Reviewed | Result | Follow-up Actions | Evidence |
|---|---|---|---|---|---|---|
| 2026-04-27 | Monthly | Codex | README + requirements + operations docs restructure | PASS | Assign real owners for open requirement/ops tasks | `README.md`, `docs/requirements/requirements.md`, `docs/operations/*.md` |

## Open Follow-ups

| ID | Item | Owner | Target Date | Status | Notes |
|---|---|---|---|---|---|
| M-001 | Assign owners for all High-priority requirements (`R-*`) | Unassigned |  | Open | Currently all tracker rows use `Unassigned` placeholder. |
| M-002 | Define SLA/threshold values for healthcheck alerts | Unassigned |  | Open | Required for actionable alerting runbooks. |
| M-003 | Finalize legacy candidate-doc migration plan | Unassigned |  | Open | Needed before legacy document fields can be retired. |
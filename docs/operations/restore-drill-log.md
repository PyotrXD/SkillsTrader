# Restore Drill Log

Use this log for every restore drill run. Keep newest entries at the top.

## Status Values
- `PASS`: restore drill completed and validation checks passed
- `PARTIAL`: restore completed with non-blocking issues
- `FAIL`: restore or validation failed

## Drill Records

| Date (UTC+8) | Operator | Backup Zip | Status | RTO (min) | Validation Checks | Evidence/Logs | Corrective Actions | Next Drill Due |
|---|---|---|---|---:|---|---|---|---|
|  |  |  |  |  | Health endpoint, login, sample CRUD, audit log write |  |  |  |

## Validation Checklist (minimum)

- [ ] PocketBase starts from restored data
- [ ] `/api/health` responds successfully
- [ ] At least one test user can authenticate
- [ ] One create/update/delete action works for a core collection
- [ ] Corresponding `audit_logs` entry is present

## Follow-up Rules

1. If `Status=FAIL`, open a corrective task on the same day.
2. If `Status=PARTIAL`, schedule remediation before next weekly drill.
3. If 2 consecutive non-`PASS` results occur, pause production changes until fixed.
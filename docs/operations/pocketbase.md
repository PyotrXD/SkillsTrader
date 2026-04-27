# PocketBase Operations

Operational reference for running, securing, backing up, and monitoring PocketBase in SkillsTrader.

## Standard Environment

Required:
- `PB_ENCRYPTION_KEY` with exactly 32 characters

Optional but recommended:
- Dedicated service account for running production process
- Reverse proxy with TLS termination

## Start Commands

Production startup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1
```

Manual start (reference only):

```powershell
.\pocketbase.exe serve --dir pb_data --hooksDir pb_hooks --publicDir skillstrader-frontend/dist --encryptionEnv PB_ENCRYPTION_KEY
```

## Backup and Restore Commands

Backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

Restore:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Restore drill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore-drill.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Drill evidence log:
- `docs/operations/restore-drill-log.md`

## Monitoring Command

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-healthcheck.ps1
```

## Recurring Cadence Tracker

| Task | Cadence | Owner | Proof Artifact |
|---|---|---|---|
| Backup | Daily | Unassigned | Backup zip in `backups/` |
| Healthcheck review | Daily | Unassigned | Scheduler/job log |
| Restore drill | Weekly | Unassigned | Row in `docs/operations/restore-drill-log.md` |
| Runbook/doc review | Monthly | Unassigned | Row in `docs/operations/maintenance-checklist.md` |

## Git-Tracked Data Snapshot (cross-device dev)

This repository intentionally tracks `pb_data/`:
- `pb_data/data.db`
- `pb_data/auxiliary.db`
- `pb_data/storage/`

Before committing database updates:
1. Stop PocketBase.
2. Run `git add pb_data`.
3. Commit and push.

Ignored runtime artifacts:
- `pb_data/*.db-wal`
- `pb_data/*.db-shm`
- `pb_data/*.db-journal`
- `pb_data/.lock`

## Audit Logging

- `audit_logs` collection is created via migrations.
- `pb_hooks/main.pb.js` writes audit entries on create/update/delete.

Validation tip:
- Include one audit verification check in each weekly restore drill.

## Document Update Rule

When scripts/ops flow changes, update these together:
- `docs/operations/pocketbase.md`
- `docs/operations/production-runbook.md`
- `docs/operations/maintenance-checklist.md`
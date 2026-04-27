# SkillsTrader

## Overview

SkillsTrader is a PocketBase-backed recruiting operations system with a React frontend.

Core stacks:
- Backend/data/auth: PocketBase (`pocketbase.exe`, `pb_data/`, `pb_migrations/`, `pb_hooks/`)
- Frontend: Vite + React (`skillstrader-frontend/`)
- Operations tooling: PowerShell scripts in `scripts/`

## Quick Start (Local)

```powershell
npm run dev
```

Default local URLs:
- Frontend: `http://127.0.0.1:5173/dashboard`
- PocketBase Admin: `http://127.0.0.1:8091/_/`

## Documentation Map

| Doc | Purpose | Update When |
|---|---|---|
| `README.md` | Entry point and navigation | Commands, architecture, or doc paths change |
| `docs/requirements/requirements.md` | Human-readable requirements tracker | Requirement status/owner/priority changes |
| `docs/requirements/requirements-checklist.csv` | Spreadsheet-friendly requirement tracker | Same updates as `requirements.md` |
| `docs/requirements/pocketbase-alignment.md` | Mapping between requirements and PocketBase schema | Migrations or model decisions change |
| `docs/operations/pocketbase.md` | Command reference and operating standards | Script behavior or ops cadence changes |
| `docs/operations/production-runbook.md` | Step-by-step production startup/verification | Deployment workflow changes |
| `docs/operations/restore-drill-log.md` | Weekly restore drill evidence log | Every drill |
| `docs/operations/maintenance-checklist.md` | Recurring operations + docs maintenance tracker | Weekly/monthly review |

## Production Commands

Install/bootstrap on a target Windows server:

```powershell
npm run install:local-server
```

Start production mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1
```

Backup data:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

Restore from backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Run weekly restore drill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore-drill.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Health check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-healthcheck.ps1
```

## Documentation Maintenance Workflow

Use this lightweight routine to keep docs trackable:
1. Update requirement status in both trackers:
   - `docs/requirements/requirements.md`
   - `docs/requirements/requirements-checklist.csv`
2. If schema/permissions changed, update:
   - `docs/requirements/pocketbase-alignment.md`
3. If deployment/backup/monitoring changed, update:
   - `docs/operations/pocketbase.md`
   - `docs/operations/production-runbook.md`
4. Log operational proof:
   - Add weekly restore drill row to `docs/operations/restore-drill-log.md`
5. Mark recurring tasks in:
   - `docs/operations/maintenance-checklist.md`

Definition of done for any infra/requirements change:
- Tracker status and owner updated
- Relevant runbook/reference docs updated
- Evidence link or note added in the applicable log/checklist

## PocketBase Data Sync Across Devices

This repo intentionally tracks `pb_data/` for cross-device development:
- `pb_data/data.db`
- `pb_data/auxiliary.db`
- `pb_data/storage/`

Recommended workflow before committing DB changes:
1. Stop PocketBase.
2. Stage DB changes: `git add pb_data`
3. Commit and push.

Important:
- Treat committed `pb_data/` as sensitive data.
- Runtime temp files (`*.db-wal`, `*.db-shm`, `*.db-journal`, `.lock`) remain ignored.
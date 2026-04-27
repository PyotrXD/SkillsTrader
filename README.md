# SkillsTrader

## Overview

SkillsTrader is a PocketBase-backed recruiting operations system with a React frontend.

Core stacks:
- Backend/data/auth: PocketBase (`pocketbase.exe`, `pb_data/`, `pb_migrations/`, `pb_hooks/`)
- Frontend: Vite + React (`skillstrader-frontend/`)
- Operations tooling: PowerShell scripts in `scripts/`

## Quick Start (Local)

```powershell
npm run setup
npm run dev
```

Default local URLs:
- Frontend: `http://127.0.0.1:5173/dashboard`
- PocketBase Dashboard: `http://127.0.0.1:8091/_/`

Optional local-only override:
- `PB_HTTP=127.0.0.1:8091`
- `VITE_DEV_HOST=127.0.0.1`

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

## PocketBase Data Sync Across Devices

This repo is configured to commit the PocketBase data snapshot in `pb_data/`:
- `pb_data/data.db`
- `pb_data/auxiliary.db`
- uploaded files in `pb_data/storage/`

Recommended workflow before committing DB changes:
1. Stop PocketBase (`Ctrl+C` if running via `npm run dev`).
2. Stage DB changes: `git add pb_data`
3. Commit and push.

On another device:
1. Pull latest changes.
2. Run `npm ci`.
3. Start with `npm run dev`.

Important:
- Treat committed `pb_data/` as sensitive data (it can contain real records and auth-related data).
- Runtime temp files (`*.db-wal`, `*.db-shm`, `*.db-journal`, `.lock`) remain ignored.

## Deployment (Production)

### Portable Release Bundles (Windows + Linux)

Generate both deployment zip bundles from repository root:

```powershell
npm run package:all
```

Output files:
- `release/dist/skillstrader-win-x64.zip`
- `release/dist/skillstrader-linux-x64.zip`

Per-target commands:
- `npm run package:win`
- `npm run package:linux`

Detailed install/run steps for extracted bundles:
- `release/README-deploy.md`

### 1) Prerequisites

- OS: Windows Server or Linux VM.
- Node.js 20+ and npm.
- `pocketbase` binary (or `pocketbase.exe`) in the repo root.
- Open ports:
  - Public HTTPS: `443` (reverse proxy)
  - PocketBase/API: `8091`
- If exposing the app on LAN, allow inbound TCP on your PocketBase port.

### 2) Required Environment Variables

- PocketBase:
  - `PB_ENCRYPTION_KEY=<exactly 32 chars>`
  - Optional `PB_HTTP=0.0.0.0:8091` for LAN binding, or `127.0.0.1:8091` for local-only binding
- Frontend:
  - `VITE_POCKETBASE_URL=https://<your-domain>` for single-host public deployments

Reference files:
- `.env.example`
- `skillstrader-frontend/.env.example`

### 3) Build Frontend

From repository root:

```powershell
npm ci
npm run build
```

This produces static assets at `skillstrader-frontend/dist`.

### 4) Run PocketBase With Hooks and Built Frontend

Recommended:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1
```

Manual reference command:

```powershell
.\pocketbase.exe serve `
  --http 127.0.0.1:8091 `
  --dir pb_data `
  --hooksDir pb_hooks `
  --publicDir skillstrader-frontend/dist `
  --encryptionEnv PB_ENCRYPTION_KEY
```

Notes:
- `--hooksDir pb_hooks` is required for session invalidation and audit logging hooks.
- Migrations in `pb_migrations/` are applied automatically on startup.
- Because of `pb_hooks/main.pb.js`, every PocketBase restart logs out all existing users.

### 5) Create/Update Superuser (First Deploy)

```powershell
.\pocketbase.exe superuser upsert admin@example.com StrongPassword123! --dir pb_data
```

Then open:
- `http://127.0.0.1:8091/_/`

### 6) Reverse Proxy + TLS (Recommended)

Put Nginx/Caddy/Traefik in front and terminate TLS there.
Proxy all traffic to `http://127.0.0.1:8091` and keep websocket upgrade headers enabled.

If your public URL is `https://app.example.com`, set:
- `VITE_POCKETBASE_URL=https://app.example.com`

### 7) Process Management

Run PocketBase as a long-running service:
- Linux: `systemd`
- Windows: NSSM / Task Scheduler / service wrapper

At minimum, ensure the service restarts automatically on failure.

### 8) Backups and Restore

Backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

Restore:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Weekly restore drill:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore-drill.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

Health check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-healthcheck.ps1
```

More details:
- `docs/operations/pocketbase.md`

### 9) Post-Deploy Verification

- Open app URL and log in.
- Confirm dashboard loads by role (`administrator`, `manager`, `staff`).
- In PocketBase dashboard, create a test `users` record with required fields including `role`.
- Confirm `audit_logs` receives create/update/delete entries.

### 10) Upgrade Procedure

1. Backup `pb_data`.
2. Pull latest code.
3. Rebuild frontend (`npm ci && npm run build`).
4. Restart PocketBase service.
5. Re-test login, record create/update/delete, and audit logs.

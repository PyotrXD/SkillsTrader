# SkillsTrader

## Session Rules

- Frontend auto-logs out a signed-in user after **3 hours of inactivity**.
- PocketBase invalidates all existing auth tokens on **server start** and on **graceful shutdown** via `pb_hooks/main.pb.js`.
- Requirements checklist: `docs/requirements/requirements.md`.
- PocketBase operations (backup/encryption/audit logs): `docs/operations/pocketbase.md`.

## Session Progress (March 9, 2026)

- Implemented a redesigned login page (`skillstrader-frontend/src/pages/Login.tsx`, `skillstrader-frontend/src/pages/login.css`) with responsive split layout, improved visual hierarchy, loading state, and inline auth feedback.
- Updated authentication flow to support both regular users (`users`) and PocketBase superuser fallback (`_superusers`) during sign-in.
- Centralized auth role handling in `skillstrader-frontend/src/pb.ts`, including:
  - role typing (`administrator`, `manager`, `staff`)
  - superuser-to-administrator role mapping
  - collection detection helpers for auth-aware UI/logic
- Confirmed route behavior in `skillstrader-frontend/src/App.tsx` and router bootstrap in `skillstrader-frontend/src/main.tsx` for:
  - authenticated redirect to `/dashboard`
  - protected admin create-user route
  - fallback redirects for unknown paths

## Local Development

```powershell
npm run dev
```

- Frontend: `http://127.0.0.1:5173/dashboard`
- PocketBase Dashboard: `http://127.0.0.1:8091/_/`

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
  - Internal PocketBase: `8091` (bind to localhost only)

### 2) Required Environment Variables

- Frontend:
  - `VITE_POCKETBASE_URL=https://<your-domain>`
  - For single-host deploys, point this to your public HTTPS domain.
- PocketBase:
  - `PB_ENCRYPTION_KEY=<exactly 32 chars>`

Reference files:
- `.env.example`
- `skillstrader-frontend/.env.example`

### 3) Build Frontend

From repository root:

```powershell
npm ci
npm run build
```

This produces static assets at:
- `skillstrader-frontend/dist`

### 4) Run PocketBase With Hooks and Built Frontend

From repository root:

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

Use provided scripts:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
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

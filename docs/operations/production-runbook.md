+# SkillsTrader Production Runbook

This runbook is for production startup, verification, and recurring operations.

## Run Record (fill for each production change/startup)

| Field | Value |
|---|---|
| Date (UTC+8) |  |
| Operator |  |
| Environment |  |
| Trigger |  |
| Change Reference (PR/commit/ticket) |  |
| Result |  |
| Follow-ups |  |

## 1) One-Time Install (Windows local server)

After cloning or pulling on the target machine:

```powershell
npm run install:local-server
```

What this script does:
- Validates Node.js and npm (Node.js 20+)
- Confirms `pocketbase.exe` exists in repo root
- Writes `skillstrader-frontend/.env.production` with `VITE_POCKETBASE_URL`
- Creates `PB_ENCRYPTION_KEY` if missing (32 chars)
- Runs dependency install and frontend production build

Optional flags:
- `-PocketBaseUrl "http://192.168.1.50:8091"`
- `-SkipBuild`
- `-SetMachineEncryptionKey`

## 2) Pre-Startup Checklist

Mark each item before startup/restart.

- [ ] `PB_ENCRYPTION_KEY` exists and is exactly 32 chars
- [ ] Frontend build exists at `skillstrader-frontend/dist`
- [ ] Latest backup exists in `backups/`
- [ ] Pending migrations reviewed
- [ ] Planned maintenance window communicated (if needed)

## 3) Startup (enforced encryption)

Use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/serve-production.ps1
```

Requirements enforced by script:
- `PB_ENCRYPTION_KEY` is present and valid length
- Frontend build directory exists

## 4) Post-Startup Verification Checklist

- [ ] API health returns OK (`/api/health`)
- [ ] Login works for expected roles (`administrator`, `manager`, `staff`)
- [ ] Core CRUD path works for at least one key collection
- [ ] Audit logs are written for create/update/delete test actions
- [ ] Reverse proxy and TLS route traffic correctly

Verification commands:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-healthcheck.ps1
```

## 5) Service Management

### Windows (NSSM)

1. Install NSSM.
2. Configure service:
   - Application: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File C:\path\to\repo\scripts\serve-production.ps1`
   - Startup directory: repo root
3. Configure restart-on-failure.
4. Start service and verify health endpoint.

### Linux (systemd)

```ini
[Unit]
Description=SkillsTrader PocketBase
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/skillstrader
Environment=PB_ENCRYPTION_KEY=REPLACE_WITH_32_CHARS
ExecStart=/opt/skillstrader/pocketbase serve --http 127.0.0.1:8091 --dir pb_data --hooksDir pb_hooks --publicDir skillstrader-frontend/dist --encryptionEnv PB_ENCRYPTION_KEY
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 6) Reverse Proxy and TLS

Use Nginx/Caddy/Traefik in front of PocketBase and terminate TLS there.

Nginx baseline:

```nginx
server {
  listen 443 ssl;
  server_name app.example.com;

  ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:8091;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 7) Backups and Restore Drills

Daily backup:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

Weekly restore drill (non-destructive validation):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore-drill.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

After each drill, add a row in:
- `docs/operations/restore-drill-log.md`

## 8) Monitoring and Alerts

Healthcheck:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-healthcheck.ps1
```

Alert conditions:
- 2 or more consecutive healthcheck failures
- Service restart loops or stop state
- Backup job failure
- Restore drill failure

## 9) Incident Tracking Template

| Field | Value |
|---|---|
| Incident ID |  |
| Start (UTC+8) |  |
| End (UTC+8) |  |
| Impact |  |
| Root Cause |  |
| Mitigation |  |
| Preventive Action |  |
| Owner |  |
| Linked Logs/Proof |  |

## 10) Document Upkeep

After any deployment or ops process change, update:
- `docs/operations/pocketbase.md`
- `docs/operations/production-runbook.md`
- `docs/operations/maintenance-checklist.md`
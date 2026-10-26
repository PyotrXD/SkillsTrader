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

## 11) Updating the Live VPS from `ady/development`

`ady/live` is the production ref (docs/system-improvements.md S1). `origin/ady/live` is a strict
ancestor of `origin/ady/development`, so the update is a fast-forward — no merge, no conflicts. The
git operation is not the risk. Three things the pull does to a live server are.

`pb_data/*.db` is gitignored on both branches, so a pull never rewrites the live database. What it
does do:

1. It deletes tracked files under `pb_data/storage/`. `ady/live` tracks 4 applicant PDFs and their 4
   `.attrs` sidecars under `pb_data/storage/pbc_3332084752/`; `ady/development` tracks only
   `pb_data/storage/.gitkeep` (8388b96, with `.gitignore` now covering `pb_data/storage/**`). A
   fast-forward removes those 8 files from the working tree, and that directory is where the live
   PocketBase serves uploads from, so records end up naming files that are gone.
2. Four migrations apply themselves at the next start. PocketBase automigrates on `serve`, so
   `1792627200` through `1794000000` run unattended: they create `candidate_history_entries`, then
   tighten `deleteRule` on interviews, placements, job orders, candidates_legacy, employer, positions,
   candidates and audit_logs, and open `users` reads to `manager`. If a collection a migration names
   does not exist in this database, `findCollectionByNameOrId()` throws and the service never starts.
   The applied-migration log lives inside `data.db`, so reverting the checkout does not revert the
   schema or the rules.
3. `dist` is not tracked. The frontend has to be rebuilt, or the old UI runs against the new rules.

### Sequence

Open a maintenance window. Stop the service before touching `pb_data` — a copy of a live SQLite
file is not a backup.

```bash
cd /opt/skillstrader
git fetch origin
git rev-parse --abbrev-ref HEAD   # confirm ady/live, not deployment/linux (see below)
git status --porcelain            # any local edit here is yours to reconcile first
```

1. Back up, including `.env`:

```bash
sudo systemctl stop skillstrader
OLD=$(git rev-parse HEAD)
mkdir -p backups
tar czf "backups/pre-deploy-$(date +%Y%m%d-%H%M%S).tar.gz" pb_data .env
```

`PB_ENCRYPTION_KEY` must survive untouched. A changed key makes the existing encrypted fields
unreadable, which is data loss rather than a misconfiguration.

2. Pre-flight against the real database, read-only. `scripts/check-live-db.mjs` ships on
`ady/development`, so run it out of the fetched object without checking anything out. It copies
`data.db` and its WAL sidecars to a temp directory and reads the copy.

```bash
git show origin/ady/development:scripts/check-live-db.mjs > /tmp/c.mjs
node /tmp/c.mjs --db "$PWD/pb_data" --base "$OLD" --head origin/ady/development
```

Add `--experimental-sqlite` after `node` on Node below 24; if `node:sqlite` is absent the script says
so and prints the equivalent `sqlite3` statements. It exits 1 on any FAIL. A FAIL for "a collection a
pending migration touches" means the restart in step 5 dies, so fix the chain before pulling.

3. Snapshot the storage directory, since step 4 deletes it:

```bash
cp -a pb_data/storage /root/storage-pre
```

Use `--show-names` only if you need the filenames the FAIL rows reference; that output names
applicants and does not go in a ticket, a chat, or a commit.

4. Fast-forward, then put back what git removed:

```bash
git merge --ff-only origin/ady/development
cp -an /root/storage-pre/. pb_data/storage/
git status --porcelain      # clean: the restored files are gitignored, not staged
```

`--ff-only` is the safety rather than a style choice — if this server has a commit of its own the
merge refuses instead of inventing one.

5. Rebuild and start:

```bash
(cd skillstrader-frontend && npm ci && npm run build)   # Node 22; vite 7 needs >=22.12
sudo systemctl start skillstrader
journalctl -u skillstrader -f
```

Read the journal for the migration lines and for a `panic:` naming a collection. On a panic go
straight to rollback; the service is not serving.

6. Verify before treating the branch as updated (§4 and docs/operations/verifying-access-controls.md):

- [ ] Health endpoint answers and a login works for each role
- [ ] A **staff** session attempts a delete on a placement or job order and is refused. These
      migrations tighten delete to manager+, so a staff user who could delete yesterday cannot today.
      That is the intended change — say so before it surprises anyone.
- [ ] An existing candidate resume and CV still download (what step 3 protects)
- [ ] `node scripts/check-api-rules.mjs --live` passes; on Linux it needs
      `POCKETBASE_BIN=/opt/skillstrader/pocketbase`

7. Only now advance the production ref:

```bash
git push origin ady/development:ady/live
```

No `--force`; it is a fast-forward by construction.

### Rollback

`git checkout "$OLD"` restores the code but not the four migrations, whose state is recorded in
`data.db`. Restore the snapshot instead:

```bash
sudo systemctl stop skillstrader
rm -rf pb_data && tar xzf backups/pre-deploy-<stamp>.tar.gz
git checkout "$OLD"
(cd skillstrader-frontend && npm ci && npm run build)
sudo systemctl start skillstrader
```

If step 7 was already pushed, move the ref back with
`git push --force origin "$OLD:ady/live"` and open an incident record under §9.

### Do not deploy from `deployment/linux`

`origin/deployment/linux` (0284dac) is a retired fork, not a descendant of `ady/live`: merge-base
`1d5cda0`, with `ady/live` 41 commits ahead of it. It commits `pb_data/data.db` and `auxiliary.db`,
the runtime data S1 exists to keep out of git; it deletes the docs, scripts, `release/` tooling and
several migrations `ady/live` has already applied; and it replaces the frontend with a diverged
"custom version". Checking the server onto it, or merging it forward, overwrites live schema state
with stale files. It is slated for deletion under remediation 6 in docs/system-improvements.md and is
not a deploy source until then.
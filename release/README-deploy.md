# SkillsTrader Portable Deployment

This package is a clean install bundle for SkillsTrader.

## Bundle Contents

- PocketBase binary (`pocketbase.exe` on Windows or `pocketbase` on Linux)
- Built frontend (`skillstrader-frontend/dist`)
- Hooks (`pb_hooks`) and migrations (`pb_migrations`)
- Environment templates (`.env.example`, `skillstrader-frontend/.env.example`)
- Start/install scripts (`install.*`, `start.*`)
- Backup/restore scripts (`pb-backup.ps1`, `pb-restore.ps1`)

`pb_data` is intentionally not included.

## Build Release Zips (from source repo)

```powershell
npm run package:all
```

Outputs:

- `release/dist/skillstrader-win-x64.zip`
- `release/dist/skillstrader-linux-x64.zip`

## Windows Install

1. Extract `skillstrader-win-x64.zip`.
2. Open PowerShell in the extracted `skillstrader` folder.
3. Initialize folder structure:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -InitializeEnv
```

4. Edit `.env` and set:
- `PB_HTTP=0.0.0.0:8091` (LAN-accessible default; use `127.0.0.1:8091` for local-only binding)
- `PB_ENCRYPTION_KEY=<exactly 32 chars>`
- Optional when frontend/API are on different origins: `VITE_POCKETBASE_URL=https://<your-domain>`

5. Start server:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

App/Dashboard URLs after start:
- Local machine: `http://127.0.0.1:8091`
- LAN devices: `http://<server-lan-ip>:8091`
- Ensure Windows Defender Firewall allows inbound TCP on your configured PocketBase port (default `8091`).

6. Create a first superuser:

```powershell
.\pocketbase.exe superuser upsert admin@example.com StrongPassword123! --dir pb_data
```

## Linux Install

1. Extract `skillstrader-linux-x64.zip` into `/opt/skillstrader`.
2. Run installer:

```bash
cd /opt/skillstrader
./install.sh --init-env
```

3. Edit `.env` and set:
- `PB_HTTP=0.0.0.0:8091` (LAN-accessible default; use `127.0.0.1:8091` for local-only binding)
- `PB_ENCRYPTION_KEY=<exactly 32 chars>`
- Optional when frontend/API are on different origins: `VITE_POCKETBASE_URL=https://<your-domain>`

4. Start manually:

```bash
./start.sh
```

App/Dashboard URLs after start:
- Local machine: `http://127.0.0.1:8091`
- LAN devices: `http://<server-lan-ip>:8091`
- Ensure Linux firewall (`ufw`/`firewalld`/cloud security group) allows inbound TCP on your configured PocketBase port (default `8091`).

5. Optional `systemd` service:

```bash
sudo cp skillstrader.service /etc/systemd/system/skillstrader.service
sudo systemctl daemon-reload
sudo systemctl enable --now skillstrader
sudo systemctl status skillstrader
```

6. Create first superuser:

```bash
./pocketbase superuser upsert admin@example.com StrongPassword123! --dir pb_data
```

## Reverse Proxy / TLS

Use Nginx, Caddy, or Traefik to terminate TLS on `443`, then proxy to `http://127.0.0.1:8091`.
When using a local reverse proxy, set `PB_HTTP=127.0.0.1:8091` in `.env`.

## Optional Data Migration

If you are migrating existing data:

- Copy your backup zip to the new host.
- On Windows, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

For Linux, restore your `pb_data` directory manually from your trusted backup source while PocketBase is stopped.

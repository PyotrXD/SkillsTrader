# PocketBase Operations

## Running with an app settings encryption key

PocketBase supports encrypting sensitive app settings via the `--encryptionEnv` flag.

1. Create an env var named `PB_ENCRYPTION_KEY` with **exactly 32 characters**.
2. Start PocketBase with:

```powershell
.\pocketbase.exe serve --dir pb_data --hooksDir pb_hooks --encryptionEnv PB_ENCRYPTION_KEY
```

If you use `npm run dev`, `scripts/dev.mjs` will automatically pass `--encryptionEnv PB_ENCRYPTION_KEY` when the env var is set and valid.

## Backups (local)

Backups are stored in `backups/` (gitignored).

- Create a backup (recommended with PocketBase stopped):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-backup.ps1
```

- Restore from a backup zip:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/pb-restore.ps1 -BackupZip backups\pb_data-YYYYMMDD-HHMMSS.zip
```

## Git-tracked data snapshot (cross-device dev)

For this project, `pb_data/` is intentionally tracked so pulls on another device include:
- `data.db`
- `auxiliary.db`
- uploaded files in `storage/`

Before committing DB updates:
1. Stop PocketBase.
2. Run `git add pb_data`.
3. Commit and push.

Ignored runtime artifacts:
- `pb_data/*.db-wal`
- `pb_data/*.db-shm`
- `pb_data/*.db-journal`
- `pb_data/.lock`

## Audit logs

Schema:
- `audit_logs` collection is created via migrations.

Hooks:
- `pb_hooks/main.pb.js` writes audit entries on create/update/delete requests.


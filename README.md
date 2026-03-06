# SkillsTrader

## Session rules

- Frontend auto-logs out a signed-in user after **3 hours of inactivity**.
- PocketBase invalidates all existing auth tokens on **server start** and on **graceful shutdown** via `pb_hooks/main.pb.js`.
- Requirements checklist: `docs/requirements/requirements.md`.

## Running PocketBase (with hooks enabled)

```powershell
.\pocketbase.exe serve --dir pb_data --hooksDir pb_hooks
```

## Dev (frontend + PocketBase)

```powershell
npm run dev
```

- Frontend: `http://127.0.0.1:5173/dashboard`
- PocketBase: `http://127.0.0.1:8090/_/`

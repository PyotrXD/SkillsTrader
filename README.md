# SkillsTrader

## Session rules

- Frontend auto-logs out a signed-in user after **3 hours of inactivity**.
- PocketBase invalidates all existing auth tokens on **server start** and on **graceful shutdown** via `pb_hooks/main.pb.js`.

## Running PocketBase (with hooks enabled)

```powershell
.\pocketbase.exe serve --dir pb_data --hooksDir pb_hooks
```


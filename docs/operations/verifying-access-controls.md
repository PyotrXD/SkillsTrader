# Verifying access controls and data containment

Runbook for the controls that guard S1 (runtime data in git), S3 (PocketBase API rules) and S5
(schema drift). Every command here is read-only against a live system: they replay migrations into a
throwaway directory and never open `pb_data/`, so they are safe to run at any time and need no
superuser.

Prerequisites: Node 22+ with `node:sqlite` (these were written against v26.9.0, so pass
`--experimental-sqlite`), and a PocketBase executable at the repo root or `POCKETBASE_BIN` set.

## 1. Runtime data must never be tracked (S1)

```powershell
node scripts/check-pb-data-tracked.mjs
```

Expected:

```
pb_data containment OK - 150 tracked files, no runtime data among them
```

It fails (exit 1) if anything under `pb_data/` other than `storage/.gitkeep` is in the index, or if
any `.attrs` sidecar or `data.db`/`auxiliary.db` is tracked anywhere. This is the check that would
have caught the applicant-document commit.

Prove it fails without touching this repository's index — build a scratch repo instead:

```powershell
$repo = "C:\Users\Adrielle\Documents\GitHub\SkillsTrader"
$scratch = Join-Path $env:TEMP "scratch-guard"
Remove-Item -Recurse -Force $scratch -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "$scratch\pb_data\storage\pbc_3332084752\rec123" -Force | Out-Null
New-Item -ItemType Directory -Path "$scratch\scripts" -Force | Out-Null
Set-Location $scratch
git init -q
New-Item -ItemType File "pb_data\storage\.gitkeep"
"fake" | Out-File "pb_data\storage\pbc_3332084752\rec123\someone_cv.pdf"
Copy-Item "$repo\scripts\check-pb-data-tracked.mjs" "scripts\" -Force
git add -A
node scripts/check-pb-data-tracked.mjs   # exits 1 and lists the pdf
Set-Location $repo
Remove-Item -Recurse -Force $scratch
```

Never demonstrate it by staging a real file from `pb_data/` into this repo's index. That was tried
once here: `git add -f` of a database copy was staged and unstaged within one command, and it is one
interrupted command away from being committed.

## 2. API authorization rules (S3)

```powershell
node --experimental-sqlite scripts/check-api-rules.mjs
```

Expected:

```
replaying pb_migrations/ into a throwaway directory...
  OK  applied rules match the expected tiers
  OK  rollback restores the recorded prior state exactly
  OK  re-apply is idempotent
RESULT: PASS
```

Three things to know about this script:

- **The rollback assertion is the point.** S3 found that the down-migration of `1774000000` rewrites
  `candidates.deleteRule` to plain `@request.auth.id != ''`, so rolling back silently widens delete to
  every staff account. This script proves the newest migration's down path restores the recorded prior
  state instead of opening anything up.
- **`migrate down` prompts `y/N` and has no `--force` flag.** Feeding it a closed stdin does not error:
  it reads EOF as "no", exits 0, and reverts nothing. The first version of this script reported 23
  rollback failures caused by exactly that. A check that silently no-ops its rollback is worse than one
  that fails.
- It exits 2 rather than skipping when the binary is missing, so a green run always means assertions
  actually ran.

Compare the expectations against the database the app really uses:

```powershell
node --experimental-sqlite scripts/check-api-rules.mjs --live
```

Any `difference(s)` listed means the live DB has not run the newest migrations yet — PocketBase
automigrates on `serve`, so `npm run dev` (or a production restart) applies them, and this then clears.

### Current tiers after `1793000000_unify_transactional_record_rules.js`

| Collection | Read | Create / update | Delete |
|---|---|---|---|
| `candidates`, `documents` | admin/manager/staff | admin/manager/staff | administrator |
| `candidate_work_experiences`, `candidate_educations` | admin/manager/staff | admin/manager | admin/manager |
| `interviews`, `placements` | admin/manager/staff | admin/manager | admin/manager |
| `job_orders` | admin/manager/staff | admin/manager/staff | admin/manager |
| `candidates_legacy` | admin/manager/staff | admin/manager/staff | administrator |
| `employer` | admin/manager/staff | admin/manager/staff | admin/manager |
| `positions` | **still public** | admin/manager/staff | admin/manager |
| `audit_logs` | administrator | hook-only (`null`) | hook-only (`null`) |

`job_orders` write stays at the staff tier because `JobOrders.tsx` has no role gate on create/edit —
tightening the API there would hand staff a form that 403s. `positions` read is untouched on purpose:
whether the catalogue should be anonymous is an open product decision in S3.

### Testing the role behaviour in the app

This needs a real login, which no script above can substitute for.

1. Start the stack: `npm run dev`. PocketBase automigrates on boot.
2. Sign in as a `staff` user. On **Employers**, **Job Orders** and **Positions**, the Delete button is
   now disabled with a "Staff cannot delete …" tooltip; on **Interviews** and **Placements** the
   Edit/Delete controls stay hidden as before.
3. Confirm the API agrees with the button. Using a staff token:

   ```powershell
   $t = (Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8091/api/collections/users/auth-with-password `
     -ContentType 'application/json' -Body '{"identity":"<staff-email>","password":"<password>"}').token
   Invoke-WebRequest -Method Delete -Uri "http://127.0.0.1:8091/api/collections/employer/records/<any-id>" `
     -Headers @{ Authorization = $t }
   ```

   Expect **403**, not 204. A 204 means the rule did not apply — check that the migration ran
   (`node --experimental-sqlite scripts/check-api-rules.mjs --live`).
4. Repeat with a `manager` token and expect 204.

## 3. Write payload must match the schema (S5)

```powershell
npm --prefix skillstrader-frontend run test
```

`src/lib/pocketbase/schema-snapshot.test.ts` asserts every key `buildCandidatePayload` returns is a
real `candidates` column. PocketBase discards unknown body fields silently, so an unsent-looking field
is really a lost field — that is how `school_other_name` survived a column removal.

The snapshot it compares against is generated, never hand-edited:

```powershell
node --experimental-sqlite scripts/export-schema-snapshot.mjs           # regenerate
node --experimental-sqlite scripts/export-schema-snapshot.mjs --verify  # fail if stale
```

Run `--verify` **before deploying**. The browser test cannot read the filesystem, so it cannot notice a
new migration landing without the snapshot being regenerated; `--verify` can. Regenerate it in the same
change as any migration that adds or drops a column.

## 4. Authentication throttling — not scriptable, read this before enabling

PocketBase's rate limiter already ships four tuned rules (`*:auth` 2 requests / 3s, `*:create` 20 / 5s,
`/api/batch` 3 / 1s, `/api/` 300 / 10s) and all of them are inert because `rateLimits.enabled` is
`false`. Verified in both the local `pb_data/data.db` and the snapshot published on
`origin/develop-pre-merge`. Today the only thing throttling logins is `src/utils/rateLimit.ts`, which
counts attempts in `localStorage` and is bypassed by any caller that is not that browser —
OWASP ASVS V2.2.1 puts login throttling on the server.

**A migration cannot enable it.** `pb_data/types.d.ts` for 0.36.2 exposes no `settings` member on
`CoreApp` and no `updateSettings`, and a probe migration failed on `app.settings` being undefined.
Settings live in the `_params` table per database, outside git, which is exactly why this drifted
unnoticed. Enable it in the admin UI (Settings → Rate limits) on **each** environment.

**Do not enable it before fixing the proxy header, or you will lock out the whole admin panel.**
`trustedProxy.headers` is currently `[]` while nginx sends `X-Forwarded-For`, so PocketBase sees every
request as coming from the proxy at `127.0.0.1`. With rate limits on, all users share one
2-logins-per-3-seconds bucket and the second person logging in behind nginx gets a 429.

Order, per environment:

1. Settings → Trusted proxies → add header `X-Forwarded-For` (nginx already sets it with
   `$proxy_add_x_forwarded_for`; leave "use left-most IP" off, since the left-most value is
   client-supplied and spoofable). Only safe because PocketBase binds `127.0.0.1` in production, so
   nginx is the only thing that can reach it — see `production-runbook.md`.
2. Then Settings → Rate limits → enable.
3. Verify: hammer the login endpoint 4 times in 3 seconds and expect a `429` on the last ones, and
   check that `audit_logs.details` starts recording real client IPs instead of `127.0.0.1`.

```powershell
1..5 | ForEach-Object { try { Invoke-WebRequest -Method Post -Uri http://127.0.0.1:8091/api/collections/users/auth-with-password -ContentType 'application/json' -Body '{"identity":"nope@example.com","password":"wrong"}' } catch { "$_ : $($_.Exception.Response.StatusCode)" } }
```

Rollback is the same two toggles in reverse, and it is per-database — nothing in git needs reverting.

## 5. CI position of these checks

`ci.yml` has a `repo-guards` job that runs check **1** as a blocking step and gitleaks as an advisory
one (it needs a `GITLEAKS_LICENSE` repository secret before it can pass). Checks **2** and **3**
deliberately are not in CI: **2** needs a PocketBase binary, and pinning a release version in the
workflow creates a second source of truth that can drift from the vendored `pocketbase.exe` and report
a confidently wrong green. PocketBase automigrates on `serve`, so the enforcement point is before
deploy — run 2 and 3 there. `maintenance-checklist.md` carries them on the weekly cadence.

# Rotating PocketBase credentials

Covers S1 step 1 in `docs/system-improvements.md`. **No password appears in this file** — real
values live only in `incident-private/credentials.local.md`, which is git-ignored.

## Where credentials live

| Location | Tracked in git? | Contains |
|---|---|---|
| `incident-private/credentials.local.md` | **No** (`.gitignore`, and enforced — see below) | rotated passwords + hash fingerprints |
| `pb_data/data.db` | **No** — only `pb_data/storage/.gitkeep` is tracked | bcrypt hashes, `tokenKey`s, candidate rows |
| `.env`, `skillstrader-frontend/.env` | **No** | local overrides |
| `.env.example` | Yes | placeholder `CHANGE_ME_32_CHARACTERS_LONG!!!!` only |

The tree is verified, not assumed: `node scripts/check-pb-data-tracked.mjs` fails the build if a
`pb_data` runtime file, an `.attrs` sidecar, a `data.db`, an `incident-private/` path, a real `.env`,
or any `credential`/`secret`/`password`-named file ever reaches the index. An ignore rule only stops
an accidental `git add`; this stops `git add -f` too.

## Local rotation

```powershell
node scripts/rotate-superuser.mjs <admin-email>     # the /_/ admin account
node scripts/verify-superuser-login.mjs <admin-email> 8093
node scripts/rotate-user-password.mjs <admin-email> <admin-email> 8094
```

What each one does and why it is shaped that way:

- **`rotate-superuser.mjs`** generates a password and applies it without ever printing it. The CLI
  takes the password as a positional argument, so typing the command yourself would put the secret
  into shell history and into any transcript of the session.
- **The result is verified, not trusted.** The stored bcrypt hash is fingerprinted (sha256 prefix)
  before and after; an unchanged fingerprint exits 1. `superuser update` returning 0 is not proof.
- **`verify-superuser-login.mjs`** proves the *new* password works. A changed hash only proves the old
  one is dead — being locked out of the local admin UI would be worse than the bug being fixed. It
  boots the server on a spare port with `--automigrate=false`.
- **`rotate-user-password.mjs`** exists because `pocketbase superuser update` reaches only
  `_superusers`. The **app login authenticates against the `users` collection first** and only then
  tries `_superusers` (`Login.tsx:59` and `:68`), so a leaked `users` hash is just as live. It patches
  through the API so PocketBase does the hashing, and **requires `passwordConfirm`** — a PATCH with
  only `password` returns `400` and silently changes nothing. On failure it prints the sanitized API
  error rather than guessing.

`--automigrate=false` is load-bearing on every one of these. It defaults to **true** on *all* CLI
commands, so a credential rotation would otherwise apply any pending migration to the live database
as a side effect. That is not hypothetical: the first version of `rotate-superuser.mjs` omitted it and
quietly applied `1793000000_unify_transactional_record_rules.js` to `pb_data` before anyone chose to.

## Production rotation — the one that actually matters

Rotating locally changes only `pb_data` on this machine. The published bcrypt hashes stay crackable
wherever the same password is still accepted. Over VS Code Remote SSH:

```bash
cd /opt/skillstrader
./pocketbase superuser update <admin-email> '<new-password>' --dir pb_data --automigrate=false
```

Then rotate the `users` rows in the admin UI (`/_/` → Users → select → new password), which is also
the only way that keeps PocketBase doing the hashing. Take a verified backup first — see
`docs/operations/maintenance-checklist.md`; `backups/` is still absent, so there is no proof a restore
works, and `pb_data` lives *inside* the production clone's working tree.

Rotation does not remove anything from git. `data.db` is an ancestor of **all eight non-`main` remote
branches**, so the hashes stay fetchable by revision until the history purge and GitHub's network GC
run — which is why rotation is sequenced *first*: a purge cannot uncrack an already-downloaded hash.

## After rotating

1. Confirm `incident-private/credentials.local.md` holds the new values, and that
   `node scripts/check-pb-data-tracked.mjs` passes.
2. Existing sessions are unaffected by a password change — PocketBase tokens stay valid until expiry.
   `pb_hooks/main.pb.js` rotates `refreshTokenKey` on graceful shutdown, so a clean restart does
   invalidate them; a crash or redeploy does not.
3. Re-check for reuse: any account sharing a rotated password (GitHub, email, hosting) needs its own
   rotation. Two of the published `_superusers` emails are real Gmail addresses.

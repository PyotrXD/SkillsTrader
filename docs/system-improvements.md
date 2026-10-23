# SkillsTrader — System Improvement Plan

Analysis date: 2026-10-22
Scope: `pb_migrations/`, `pb_hooks/`, `skillstrader-frontend/`, `.github/`, `scripts/`, `.gitignore`, git history.
Method: read-only inspection of tracked files and `git ls-files` / `git log` output. No production system was accessed and no data was modified.

> Applicant names and record IDs are deliberately redacted in this document. The repository is
> publicly readable, so restoring personal data inside a committed file would widen the exposure
> described in S1.

---

## S1. A committed database snapshot exposes admin credentials on the default branch — CRITICAL

> **Rewritten 2026-10-23.** The original version of this section asserted that four applicants'
> NBI clearance, police clearance, medical and DMW-OEC documents were published. Reading the
> committed data itself disproves that. The exposure is real and still CRITICAL, but it is a
> **credential and test-data** exposure, not a disclosure of migrant-worker government documents,
> and the remediation sequence changes with the diagnosis. Unredacted row-level detail is in the
> gitignored `incident-private/s1-exposure-details.md`; nothing identifying is repeated here.

**Evidence**

- `pb_data/data.db` and `pb_data/auxiliary.db` are tracked at the **tip** of five remote branches:
  `develop-pre-merge` (which is `origin/HEAD`, so it is what an anonymous visitor sees first),
  `sky_newupdate`, `ady_updates_m3d23y26`, `ryan_updates_m3d23y26` and `deployment/linux`. This is
  not merely history reachable by revision — it is the checked-out state of the default branch.
- That snapshot contains, in the clear:
  - 2 `_superusers` rows with bcrypt `$2a$10$` password hashes;
  - 6 `users` auth rows, each with a bcrypt hash **and** a `tokenKey`, across four `administrator`
    accounts plus one `manager` and one `staff`;
  - 77 `audit_logs` rows whose `entity_name` carries candidate full names, and whose `actor_email`
    carries the operators' real addresses;
  - 2 `candidates` rows (name, email, mobile number, barangay-level home address) and 1
    `candidates_legacy` row; 15 `_collections` rows, i.e. the entire schema.
- Bcrypt at cost factor 10 is offline-crackable. A password hash for an account that authenticates
  against the admin UI is the finding, not a detail.
- The repository is **public**. Re-verified 2026-10-23 with the credential helper disabled entirely:
  `git -c credential.helper= ls-remote https://github.com/PyotrXD/SkillsTrader.git` returned 10 refs
  and `HEAD = a961b58c` — full read access with no credential of any kind.
- The document blobs are far smaller than the original section claimed: 4 tracked PDFs under
  `pbc_3332084752` represent **2 unique files**, because three of the four share md5
  `KjZtCIJ0hM+6o5Id6Hnniw==` (one resume stored three times). Every `documents` row is
  `doc_type = resume`. The `nbi_clearance` / `police_clearance` / `medical_exam` / `dmw_oea` types
  named in the original analysis are only the *allowed values* of the `doc_type` select field;
  no document of any of those types exists in the committed data, and the earlier "confirm it is not
  reachable in production builds" style inference drew the conclusion from the schema instead of
  from the rows.
- The identifiable people in the committed data are the two developers who own this repository
  (one is an `_superuser` and a `users` administrator; the other has the `ryan_updates_m3d23y26`
  branch) plus rows whose names are `asd asd ads`, `fasdf asdf` and `rya bar`. The dataset reads as
  development test data seeded through the real UI, not as a client's applicant book.
- This was systemic, not accidental, and the policy that caused it is now gone: `.gitignore` opens
  "Runtime data is NOT committed", `pb_data/storage/**` is ignored wholesale with only
  `storage/.gitkeep` tracked, and the four PDFs plus the two `.db` files are untracked at `HEAD`
  (commit `8388b96`). **That containment is local and not yet pushed**, so the public branch tips
  still serve the files until it is.

**Why it matters**

Treat the credential exposure as the live incident: if any production PocketBase shares these
superuser or `users` credentials, a public repo now hands an attacker an admin login to a system
holding real Filipino migrant-worker records, which *would* be a reportable breach under RA 10173
(Sections 3(l) and 16) — the exposure that would trigger the NPC's 72-hour notification clock is
the production database, not this test snapshot. Containment therefore starts with rotating what
was published, not with a history rewrite.

The test data is personal data about real named individuals regardless (the two operators, and two
candidate rows with a mobile number and home address), so it still needs to come out of git; but
breach notification to applicants is **not** supported by this evidence and must not be sent on the
strength of the original analysis. Confirm against the production database first.

**Recommended actions, in order**

1. **Rotate the published credentials before anything else**: both `_superusers` passwords, all six
   `users` passwords, and `PB_ENCRYPTION_KEY` if a real value was ever committed (see C1). Rotation
   is what closes the crackable-hash window; a purge does not, because the hashes stay crackable
   offline after the blobs are deleted.
2. Determine whether production shares any of these credentials, and whether the real applicant
   database was ever committed to any branch. This decides whether steps 5 and 6 are an incident or
   a hygiene task.
3. Make the repository private (org settings). Stops new anonymous access; does not undo exposure.
4. Push the containment commit, then verify with `git ls-remote` — a non-TTY push can hang and still
   succeed, so check the remote ref rather than the exit code.
5. Purge the blobs from all history with `git filter-repo` or BFG, force-push, then ask GitHub to run
   a network GC so the orphaned objects and their commit SHAs stop resolving. Two blockers today:
   `git filter-repo`, `gh` and `docker` are all absent on this machine (Python 3.12.3 is present, so
   `pip install git-filter-repo` is the shortest path), and `backups/` does not exist, so no verified
   backup has ever been taken — see `docs/operations/` and the backup-tooling item below. A rewrite
   touches shared state and invalidates every open branch, so it needs your explicit go-ahead and
   coordination with anyone on `ryan_*`, `sky/*` and `develop-pre-merge`.
6. Only after step 2: notify affected individuals / the PIC-DPO and log it, if and only if real
   applicant data was exposed. Delete the retired `deployment/linux` branch as part of cleanup; it
   tracks the database and is a live overwrite hazard, not dead weight.
7. Pulling the containment commit onto the VPS deletes those four tracked PDFs from its working
   tree, so first confirm the production `documents` rows do not reference those record IDs.
   `pb_data` lives inside the production clone's working tree, so never recover with
   `git clean -fdx` or a blind `git pull` — re-clone and move `pb_data` aside.

---

## S2. The CI pipeline cannot pass as written — CRITICAL

**Evidence** — `.github/workflows/ci.yml`

- `cache-dependency-path` lists root `package-lock.json`, then step "Install Root Dependencies" runs
  `npm ci`, and "Build" runs `npm run build` at the repository root.
- Neither root `package.json` nor root `package-lock.json` is tracked (`git ls-files` returns nothing),
  and both are explicitly listed in `.gitignore`.
- On a clean runner `npm ci` has no manifest to resolve, so the job fails before the real build. If any
  badge currently reads green, it reflects a runner that still had those files, not a reproducible checkout.

**Consequences beyond a red X**

- Lint and tests never run in CI. `npm run lint` is not a step at all, and the Vitest suite added on
  `ady/development` (28 tests) is not wired into the pipeline. Nothing gates a merge.
- No secret scanning and no dependency audit, which is precisely how S1 and the S5 schema drift went
  unnoticed.
- The frontend build (`skillstrader-frontend`) is never built; `npm run build` at the root would need
  a workspace definition that does not exist.

**Recommended actions**

- Either commit a real root `package.json` with npm workspaces pointing at `skillstrader-frontend`, or
  drop the root steps and operate on the frontend directly with
  `npm --prefix skillstrader-frontend ci` and `npm --prefix skillstrader-frontend run build`. The second
  is the smaller change and matches how the repo is actually laid out.
- Add steps for `lint`, `test`, `npm audit --audit-level=high` and a secret scan
  (`gitleaks protect` or `trufflehog`) on push and PR. The secret-scan step is what prevents a repeat of S1.
- Decide whether the root `.gitignore` lines for `package.json` / `package-lock.json` are still wanted;
  they are the direct cause of this failure.

---

## S3. Authorization rules are inconsistent across collections — HIGH

Each collection was hardened in a different migration and the result is uneven. Rules below were
re-read from the live `_collections` table on 2026-10-23 rather than inferred from migration source:

| Collection | Read | Write | Source |
|---|---|---|---|
| `candidates` | admin/manager/staff | admin/manager/staff, delete admin-only | `1774000000:35-42` |
| `documents` | admin/manager/staff | admin/manager/staff, delete admin-only | `1774000000:44-48` |
| `employer` | admin/manager/staff | admin/manager/staff, **delete included at staff** | `1784348797:7-10` |
| `candidate_work_experiences` | admin/manager/staff | admin/manager (read tier wider than write, deliberately) | `1792700000` |
| `candidate_educations` | admin/manager/staff | admin/manager | `1792700000` |
| `interviews` | any authenticated | any authenticated, **including delete** | `1772779005:16-20` |
| `placements` | any authenticated | any authenticated, **including delete** | `1772779004:25-29` |
| `job_orders` | any authenticated | any authenticated, **including delete** | `1772779003:16-20` |
| `candidates_legacy` | any authenticated | any authenticated, **including delete** | not hardened |
| `positions` | **public — `listRule` and `viewRule` are both `""`** | any authenticated, including delete | `1773500003:102-108` |
| `users` | admin or self | create/delete admin-only | `1778000000:11-19` |
| `audit_logs` | admin only | no API writes (hook-only) | `1773600000:149-153` |

- **Asymmetry:** the most sensitive tables (candidates, documents) are role-gated, while `interviews`,
  `placements`, `job_orders` and `candidates_legacy` accept any authenticated principal — including a
  `staff` account whose job should not be to delete placement or interview records. Candidate
  interview assessments and placement fee data are reachable at a lower bar than the candidate record
  they belong to.
- **`candidates_legacy` was missed entirely.** It holds the same class of personal data as its
  successor and has the bare rule on all five operations. It currently has zero rows, so this is a
  latent rather than active exposure — which is exactly the state in which a legacy import or a
  restore can silently repopulate it.
- **`employer` lets a `staff` account delete an employer**, while `candidates` and `documents`
  restrict delete to administrator. Same UI, different destructive ceiling.
- **Public positions read** is intentional per the migration comment — the candidate form and
  positions page need it without a session. It is defensible for industry/title reference data, but
  it does mean the full position catalogue is scrapable, and `viewRule` being empty widens it from
  "the list" to "every record by id". Confirm that is acceptable, or gate the detail view and keep
  only the dropdown list public. Reachability is bounded by the bind address, so this is separate
  from the S1 committed-data issue.
- **Rollback paths loosen security.** The down-migration of `1774000000:83-94` rewrites
  `candidates.deleteRule` to plain `@request.auth.id != ''`, so a rollback silently widens delete to
  every staff account. Down-migrations deserve the same review as up-migrations.
- **Audit-log immutability is expressed as a contradiction**
  (`@request.auth.id != '' && @request.auth.id = ''`). It works — always false — but it reads like a bug.
  `null` states the same intent legibly.
- **A status code is not evidence here.** An unauthenticated list call returns `200` with
  `items: []` whether the rule filters everything or the table is simply empty; the six collections
  probed on 2026-10-22 all returned 200 while `data.db` genuinely held rows. Any rule assertion must
  compare `totalItems` against a real row count, or it will certify an open rule as closed.

**Recommended actions**

- Introduce one shared role-rule constant per tier (staff read/write, manager+, admin-only destructive)
  and apply it uniformly to `interviews`, `placements` and `job_orders` as they were applied to
  `candidates` and `documents`.
- Move delete on transactional collections to admin/manager.
- Add a test or CI check that asserts the expected rule per collection, so a future migration cannot
  widen access unnoticed. PocketBase API rules are the real authorization boundary in this system and
  nothing currently verifies them.

---

## S4. Frontend architecture and code health — MEDIUM

- **`Candidates.tsx` is 2,560 lines** (measured 2026-10-23; the original analysis said 2,420) and
  holds list, view, edit, create, archive, document upload and resume generation. It lives at
  `src/components/custom/Candidates.tsx`, not in `src/pages/` — worth stating because the `pages/`
  directory holds only three files. The Education and Work Experience blocks were duplicated across
  the view, edit and create modals; the history entries now render through the shared
  `CandidateHistoryFields` / `candidateHistory` components, so history fields no longer need
  triplicate edits, but the surrounding duplication remains.
- **14 pre-existing ESLint errors** (verified against the baseline config, so not caused by the
  tooling commit): unused vars and `no-explicit-any` in `AuditLog.tsx:7`, `Employers.tsx:197`,
  `JobOrders.tsx:263`, `Placements.tsx:92`, `Users.tsx:395`, `Tooltip.tsx:2`, `DashboardHome.tsx:6`;
  plus a `react-hooks/set-state-in-effect` at `AuditLog.tsx:114` that causes cascading renders.
  Re-measured 2026-10-23: `✖ 36 problems (14 errors, 22 warnings)`. `npm run lint` exits non-zero today.
- **`valueAtPath()` (`RecordsWorkspace.tsx:348-359`)** walked a dot-separated path with unchecked
  segments, so `__proto__` or `constructor` in a caller-supplied path traversed off the intended
  object. **Hardened** in `5ece019` with an own-property check per segment.
- **No error boundary anywhere** (`grep` for `componentDidCatch|ErrorBoundary` finds nothing —
  re-checked 2026-10-23) and no Suspense/lazy loading — every admin module and `react-router-dom` is
  in one eager bundle.
- **Test coverage is 5 files, not 3** (`candidateHistory.test.ts`, `CandidateHistoryFields.test.tsx`,
  `Pagination.test.tsx`, `candidateFlags.test.ts`, `rateLimit.test.ts`), against 38+ source files.
  The write path is still the gap: `candidates.utils.ts` and `auditLog.ts` are untested. The function
  is named **`buildCandidatePayload`** (`candidates.utils.ts:77`), not `mapFormToPayload` as this
  section originally claimed, which matters for anyone wiring the payload-vs-schema check in S5.
- `src/data/` carries six unreferenced mock datasets (`candidates`, `employers`, `job-orders`,
  `placements`, `positions`, `users` — all tracked). A search across `src/**/*.{ts,tsx}` for imports
  of any of them returns nothing, so they do not ship by accident; they are just dead tracked files
  whose Philippine institution names look like real data.

---

## S5. Schema drift silently discards form input — MEDIUM

`1784276050_updated_candidates.js` removes `school_other_name` (id `text2194057254`) from the
`candidates` collection, but the frontend still declares it in two types
(`types/Candidate.ts:36`, `:113`), initialises it (`candidates.utils.ts:28`), **sends it in the write
payload** (`candidates.utils.ts:108`), renders two live inputs for it (`Candidates.tsx:1771-1777`,
`:2207-2213`), displays it (`:1318`), diffs it for change detection (`:520`) and consumes it in the
resume generator (`resumeTemplate.ts:73`).

PocketBase drops body fields absent from the collection schema, so that input is a no-op: an operator
typing an alternate school name sees it accepted, then reads it back as empty. Note `Candidates.tsx:518-521`
lists `school_other_name` in the fields cleared on `school_other` change, so the diff logic can also
report an unsaved change that will never persist.

Related: `education` (plain text) and the structured `school_*` fields coexist, and
`work_history`/`certifications`/`notes` are `editor` (rich-text) columns while the form binds plain
`<textarea>` values to them. `hasChanges.ts` compares `File` and array fields by `JSON.stringify`.

**Recommended actions**

- Pick one: restore the column, or delete it from the frontend types, utils, both forms, the view and
  the resume template. If the resume generator needs an alternate name, keep the field.
- Add a CI check that diffs the keys in `mapFormToPayload` against the live collection schema, so any
  future dropped column fails loudly instead of dropping data quietly.

---

## S6. Network exposure defaults — HIGH

- `.env.example:4` ships `PB_HTTP=0.0.0.0:8091` and `skillstrader-frontend/.env.example` ships
  `VITE_DEV_HOST=0.0.0.0` and `VITE_PREVIEW_HOST=0.0.0.0`. `vite.config.ts` also falls back to
  `0.0.0.0` when unset, so the insecure value is the default in both the template and the code.
- `docs/operations/pocketbase.md:8-16` correctly tells operators to bind `127.0.0.1:8091` and tunnel
  the admin UI over SSH, and `serve-production.ps1` reads `PB_HTTP` from `.env`. The documented
  guidance and the shipped defaults contradict each other, so a fresh setup is LAN-exposed unless the
  operator reads the runbook.
- This compounds the Vite advisories in S7: the flagged dev-server issues are pre-authentication
  arbitrary file read and `server.fs.deny` bypass, which are only reachable because the server binds
  all interfaces.

**Recommended action**

Default all three to `127.0.0.1` in `.env.example` and in the `vite.config.ts` fallbacks, and require an
explicit override for LAN or container use. One-line changes, no dependency movement.

---

## S7. Unpatched dependency vulnerabilities — HIGH (report only; patching is your call)

Current `npm audit` in `skillstrader-frontend`: 14 findings (10 high, 2 moderate, 2 low). Verified
against how the app actually uses these packages, the risk is not uniform:

| Package (resolved) | Severity | Reachable in this app? |
|---|---|---|
| `react-router-dom@7.13.1` (range `7.0.0-pre.0 - 7.14.1`) | high | **Partly.** `main.tsx` uses plain `BrowserRouter`; no `createBrowserRouter`, no loaders/actions, no SSR/RSC. The turbo-stream RCE, `deserializeErrors` hydration, RSC CSRF/XSS, single-fetch and `__manifest` DoS items are not reachable. The open-redirect family is, and `useNavigate` is called in `Login.tsx`, `Users.tsx`, `Sidebar.tsx`. Patch to `> 7.14.1`. |
| `vite@7.3.1`, `esbuild` | high | **Yes, in dev**, given S6: dev-server arbitrary file read, `server.fs.deny` bypass, optimized-deps path traversal, plus `launch-editor` NTLMv2 disclosure and command-execution variants that are Windows-specific — this is a Windows dev environment. |
| `postcss@8.5.8`, `source-map-js@1.2.1`, `nanoid@3.3.11` | high | Build-time only; not shipped to a browser. Fix with the rest. |
| `brace-expansion`, `js-yaml`, `flatted`, `browserslist`, `@babel/core`, `@humanfs/node`, `baseline-browser-mapping` | low-mod-high | Toolchain transitive deps, largely pulled in by the test/lint devDependencies added 2026-10-22. Resolve on the next clean install. |

**Recommended action:** patch `react-router-dom` and `vite`/`esbuild` first (and apply S6 regardless,
since it neutralises the dev-server class on its own), then let `npm audit fix` handle the build-time
remainder. Add `npm audit --audit-level=high` to CI per S2 so new findings block merge rather than
accumulate. Dependency version decisions are yours; nothing here was patched by this analysis.

---

## S8. Backend logic is single-file and unverified — MEDIUM

> **Rewritten 2026-10-23.** The original version of this section cited `main.pb.js:192` for a
> `login rate limit exceeded` message, `:124` and `:163` for rate-limit log lines, `:233` for a
> `details` JSON string and `:224-227` for an `Object.keys(original)` merge. None of those exist in
> the current file. `main.pb.js` is 575 lines containing exactly four registrations —
> `onTerminate`, `onRecordCreateRequest`, `onRecordUpdateRequest`, `onRecordDeleteRequest` — and
> searches for `rate.?limit`, `baseUrl`, `8090`, `@request.env` and `test_smtp` all return nothing.
> The claims below are re-derived from the file as it stands.

- `pb_hooks/main.pb.js` carries every server-side hook in one file, with no split by domain and no
  lint or type coverage: `eslint.config.js` matches `files: ['**/*.{ts,tsx}']` only, so
  `**/*.pb.js` is outside the lint surface entirely, and `.gitignore` excludes
  `pb_data/types.d.ts`, so the `/// <reference path="../pb_data/types.d.ts" />` at
  `main.pb.js:1` has nothing checked against it in CI.
- **Authentication throttling is configured and switched off, not absent.** PocketBase's own
  rate limiter holds four rules in the settings blob — `*:auth` at 2 requests per 3 seconds,
  `*:create` at 20 per 5, `/api/batch` at 3 per 1 and `/api/` at 300 per 10 — but
  `rateLimits.enabled` is **`false`**, in the local `pb_data/data.db` *and* in the snapshot
  published on `origin/develop-pre-merge`. The only thing throttling logins today is
  `utils/rateLimit.ts`, which counts attempts in `localStorage` and is trivially bypassed by any
  caller that is not that browser (verified: `getAttemptsLS` / `setAttemptsLS` / `clearAttemptsLS`
  are the whole implementation, and the only test, `rateLimit.test.ts`, tests the storage helpers).
  The fix is therefore a settings change that turns on limits the product already ships, not new
  hook code — which also means the threshold lives in exactly one place, where it should.
- **The audit payload records field names, not field values.** Each of the three record hooks
  builds `details` from `record_id`, `ip`, `user_agent`, `request_method`, `request_url` and
  `changed_fields: Object.keys(body)`, then drops empty keys and `JSON.stringify`s the result. So
  the earlier worry that audit logs "can capture full record values, including the government-ID
  fields" is **not** what the code does. What it does leak is the `entity_name`: the update and
  create hooks resolve a record's `full_name` / `company_name` / `title` and write it in the clear
  (`main.pb.js:126-137`, `:258-290`), and the published snapshot's 77 `audit_logs` rows show
  candidate full names and real operator emails in those columns. `audit_logs` is
  administrator-readable today.
- `onTerminate` (`main.pb.js:7-21`) rotates `refreshTokenKey` on every auth record of every auth
  collection at shutdown. That is the right instinct for a leak like S1, but it runs only on clean
  shutdown, so a crash or a redeploy leaves every session token valid.
- File handling still uses `pb.files.getToken({ requestKey: null })` (`Candidates.tsx:157`, `:225`,
  with a bare `getToken()` at `:750`) to build document URLs. Whether a `null` request key yields a
  token scoped to the one requested file or to the whole collection is still unverified, and it
  needs an authenticated round trip to answer — see the verification caveat at the bottom of this
  document.

**Recommended actions**

- Set `rateLimits.enabled = true` and keep the shipped `*:auth` rule (OWASP ASVS V2.2.1 and V3.2.2
  put authentication throttling on the server; a product-provided control already tuned at 2 per 3s
  for `*:auth` is the defensible default). Record the intended threshold in
  `docs/operations/production-runbook.md` so it survives the next settings export.
- Move `pb_hooks/**/*.pb.js` onto the lint and type-check surface. A `files` glob plus committing
  the generated `types.d.ts` (or generating it in CI) is enough; there is no third option that
  actually catches a typo in a hook today.
- Strip `entity_name` down to the record id, or restrict `audit_logs` to a column allow-list, if
  audit rows are ever going to be readable below administrator.
- Split `main.pb.js` by domain only once it carries more than audit mirroring. At 575 lines of
  near-identical per-action hooks it is repetitive rather than architecturally wrong, so this is
  worth doing alongside the first real route, not before it.

---

## S9. Smaller items worth queueing — LOW

> **Refreshed 2026-10-23.** Two of the five items here were already resolved and one was never
> true; the line-number references below were re-checked against the current files.

- **Resolved, was never accurate as written.** `main.pb.js:100` / `:113` were cited for building URLs
  from `pb.config.baseUrl ?? "http://127.0.0.1:8090"`. There is no `baseUrl`, no `8090` and no
  `@request.env` reference anywhere in `pb_hooks/` today, and the `test_smtp` mention is gone too.
  The port question is real, but it lives in config, not in the hooks — see the next item.
- **The 8090/8091 split is the actual open item, and it is a live dev-breaking bug.**
  `docs/operations/production-runbook.md:96` and `:119` run and proxy PocketBase on **8091**, and
  `.env.example` plus the `scripts/dev.mjs` fallback bind `127.0.0.1:8091`. But the untracked local
  `skillstrader-frontend/.env` pins `VITE_POCKETBASE_URL=http://127.0.0.1:8090`, and the PocketBase
  settings blob still carries `meta.appURL = http://localhost:8090` (the product default, never
  changed). Because `pb.ts` returns `VITE_POCKETBASE_URL` before any auto-detection, and `dev.mjs`
  only injects `VITE_POCKETBASE_PORT` when that variable is *unset*, the pinned 8090 wins: a
  `npm run dev` start brings PocketBase up on 8091 while the frontend calls 8090. On this machine
  8090 is right now occupied by an unrelated third-party service (`WsToastNotification.exe`, bound
  `0.0.0.0:8090`), so the mismatch does not fail loudly — it sends API traffic to a non-PocketBase
  listener. Standardise on 8091 in the local `.env` and in `meta.appURL`, or none of the loopback
  hardening in S6 protects the developer from a service bound to all interfaces on the port the
  frontend is configured to trust.
- `debug_employer_creation.js` at the repo root was said to import
  `@atlassian/atlassian-navigation-mfe`. It never did — the file had no imports at all; it was 48 lines
  of `console.log` commentary plus a hard-coded sample payload, left over from
  `EMPLOYER_CREATION_FIX_SUMMARY.md`. **Deleted in this pass**, since the diagnosis it recorded is now
  encoded in the migrations and the frontend validation, and a root-level scratch file reads as project
  documentation. It is still recoverable with `git show HEAD~1:debug_employer_creation.js` if a
  reference is ever needed.
- `docs/operations/maintenance-checklist.md` tracks the restore drill and backup review, which is
  good practice, but has no line for verifying that `pb_data/` contains nothing that should not be
  committed — the S1 root cause. The checklist cited `:48` "Run database integrity check" and `:16`;
  the file is 33 lines and neither line reference is right, though the restore-drill and
  backup-integrity items are genuinely present in the Weekly section.
- Two root-level markdown files (`EMPLOYER_CREATION_FIX_SUMMARY.md`, `README.md`) sit outside `docs/`,
  which already holds runbooks, a maintenance checklist, a restore-drill log, a developer guide and a
  requirements checklist. Index page added at `docs/README.md`.
- `.gitignore` is now policy-only: the `docs/developer-guide.md` suppression that hid a real
  documentation file is gone (commit `de6e7de`) and the one-off per-file upload suppressions were
  removed with the `pb_data/storage/**` wholesale ignore. Two decisions are still open in it, both
  deliberate: root `package.json` / `package-lock.json` remain ignored (the direct cause of S2, kept
  because the repo has no root workspace manifest), and `pocketbase.exe` is tracked — a vendored
  ~40 MB binary in git, which is how `pb_data/types.d.ts` ended up needing an ignore rule at all.

---

## Suggested ordering

Rewritten 2026-10-23. The previous ordering led with "make repo private, then purge, then notify";
reading the committed data put a credential rotation ahead of both, because a published bcrypt hash
stays crackable offline after the blob is deleted.

| # | Item | Effort | Blocking? |
|---|---|---|---|
| 1 | Rotate the 2 `_superusers` and 6 `users` credentials published in `data.db` (S1) | Low | **Start here** — closes the crackable-hash window a purge cannot |
| 2 | Confirm whether production shares those credentials and whether the real applicant DB was ever committed (S1) | Low | Gates the legal decision in 4 |
| 3 | Make repo private; push the containment commit; verify with `ls-remote` (S1) | Low | No |
| 4 | Breach notification to applicants / PIC-DPO — **only if step 2 finds real applicant data** | Low, then coordination | Legal clock, conditional |
| 5 | Verified backup: fix `pb-backup.ps1` to take a consistent snapshot and make the drill prove integrity | Medium | **Blocks the purge** |
| 6 | History purge + GitHub network GC; delete retired `deployment/linux` (S1) | Medium + coordination | Invalidates every open branch |
| 7 | Enable `rateLimits` (S8) — config already shipped and tuned, just switched off | Low | No |
| 8 | Set CI to fail on lint + audit once the backlog clears (S2, S4, S7) | Low | No |
| 9 | Unify API rules incl. `candidates_legacy` and `employer` delete; assert them in CI (S3) | Medium | No |
| 10 | Reconcile the 8090/8091 split in local config and `meta.appURL` (S9) | Low | No |
| 11 | Move `pb_hooks` onto the lint surface; verify `getToken({ requestKey: null })` scope (S8) | Medium | No |
| 12 | Payload-vs-schema CI check; tests for `buildCandidatePayload` and `auditLog.ts` (S5, S4) | Medium | No |
| 13 | Fix the 14 lint errors; error boundary + lazy loading; extract duplicated Candidate sections (S4) | Medium | No |
| 14 | Patch `react-router-dom`, `vite`, `esbuild` (S7 — your call, report-only) | Medium | No |
| 15 | Remaining low-priority cleanups (S9) | Low | No |

Only item 4 has an external deadline, and whether it applies at all is decided by item 2. Items 1, 3
and 7 are low-effort and independent of everything else, so there is no reason to sequence them
behind the analysis.

---

## Remediation status — applied 2026-10-22/23 on `ady/development`

A follow-up pass applied the low-risk items. **No dependency version was changed.**

| Item | State | Change |
|---|---|---|
| S2 CI cannot run | Fixed | `.github/workflows/ci.yml` now operates on `skillstrader-frontend` directly (`defaults.run.working-directory`, `npm ci`, Node 22 per the installed vite engines `^20.19.0 \| >=22.12.0`). `cache-dependency-path` points only at the tracked frontend lockfile. Root `package.json` is still absent and still gitignored, so the root steps were dropped rather than recreated. |
| S6 bind defaults | Fixed | Loopback is now the default in `.env.example` (`PB_HTTP=127.0.0.1:8091`), `skillstrader-frontend/.env.example` (`VITE_DEV_HOST`, `VITE_PREVIEW_HOST`), the `vite.config.ts` fallbacks, and the `scripts/dev.mjs` fallbacks. LAN or container use now needs an explicit override, which is what `docs/operations/pocketbase.md` already told operators to expect. Ports were left as they are (see S9). |
| S5 `school_other_name` | Resolved by deletion | Removed from `types/Candidate.ts`, `candidates.utils.ts` (initial state and write payload), both candidate forms, the profile view, the change-detection list, and `resumeTemplate.ts`. The column is confirmed absent from the live `candidates` collection, so the control could only ever discard input. |
| S5 — related bug found mid-pass | Fixed | The change-detection list contained the dead `school_other_name` but **omitted the live `school_other`**. An operator editing only "Other School" was told "No changes detected" and the edit was silently discarded. `school_other` is watched now. |
| S4 `valueAtPath()` | Hardened | `RecordsWorkspace.tsx` checks `Object.prototype.hasOwnProperty` per path segment, so a `__proto__` or `constructor` segment can no longer read inherited values off the prototype chain. |
| S3 — new history collections only | Applied | `pb_migrations/1792700000_candidate_history_entry_rules.js` role-gates `candidate_work_experiences` and `candidate_educations`. Read tier matches the parent `candidates` (administrator/manager/staff); write tier matches the UI gate `canManageCandidates` (administrator/manager), so the API never permits an edit the interface already hides. The pre-existing `interviews` / `placements` / `job_orders` / `positions` asymmetry is **not** addressed. |
| S4 duplicated Candidate sections | Not done | The Education and Work Experience blocks are still duplicated across the view, edit and create modals. The new entry editors are shared components, so history fields no longer need triplicate edits. |

### Second pass — applied 2026-10-23 (verification and containment, `ady/development`)

A verification pass re-read every claim against the live files and the committed data rather than
against migration source. It corrected four stale claims, added two the original pass had missed,
and landed three changes. **No dependency version was changed and no frontend source was edited.**

| Item | State | Change |
|---|---|---|
| S1 diagnosis | **Reframed** | The committed `data.db` was read directly. The exposure is a **credential** exposure (2 superuser + 6 auth password hashes, all bcrypt `$2a$10$`, plus `tokenKey`s) on the repo **default branch**, not a leak of migrant-worker government documents. Every committed document row is `doc_type = resume`; the four tracked PDFs are two unique files (three share one md5) belonging to a repository administrator. Section rewritten, ordering resequenced to put credential rotation first. |
| S1 — `candidates_legacy` missed | **Added to S3** | Bare `@request.auth.id != ''` on all five rules; zero rows today, so a latent exposure that a legacy import or restore can repopulate silently. |
| S3 `employer` delete | **Added** | Read live: staff may delete an employer, while `candidates`/`documents` restrict delete to administrator. |
| S8 auth throttling | **Reframed, now low effort** | PocketBase's native `rateLimits` already ships four tuned rules (`*:auth` 2 req/3s) in both the local DB and the published snapshot, but `enabled: false`. The fix is a settings flip, not the high-effort hook work the previous ordering assumed. |
| S8 audit payload claim | **Disproved** | `details` stores `changed_fields: Object.keys(body)` — field *names*, not values. It never captured government-ID content. What it does leak is `entity_name` (candidate full names) and `actor_email`, visible across the 77 rows in the published snapshot. |
| S8 `main.pb.js` line refs | **Stale** | The cited `:100`/`:113` `baseUrl ?? 127.0.0.1:8090`, `:124`/`:163` rate-limit logs, `:127` `@request.env`, `:48` `test_smtp` and the `:233` `details` merge are all gone. The file is 574 lines of four hook registrations and no routes. |
| S9 `debug_employer_creation.js` | **Deleted** | The `@atlassian/atlassian-navigation-mfe` import it was said to carry does not exist in the file; it was 48 lines of `console.log` with no imports. Removed at the root. |
| S9 port split | **Documented, not silently rewritten** | `docs/operations/pocketbase.md` manual-start snippet now pins `--http 127.0.0.1:8091` with the reason: PocketBase defaults to 8091-vs-8090 drift, and `pb.ts` prefers an explicit `VITE_POCKETBASE_URL` over auto-detection, so a stale `.env` on 8090 wins. The local `skillstrader-frontend/.env` (gitignored, yours) still says 8090 and was **not** edited — on this machine 8090 is currently held by `WsToastNotification.exe` bound to `0.0.0.0`, so it should be set to 8091 deliberately. |
| S1/S2 containment guard | **New CI gate** | `scripts/check-pb-data-tracked.mjs` fails if anything under `pb_data/` beyond `storage/.gitkeep`, or any `.attrs`/`data.db`/`auxiliary.db`, is tracked. Runs in a new `repo-guards` job (Node 22, no dependency install). Deliberately **not** declared as `needs:` by `frontend-checks`: the eight legacy branch tips still track those files, so gating would have skipped install/test/build on exactly the branches that still need their signal. |
| S2 secret scan | **Added, advisory** | `gitleaks/gitleaks-action@v2` with `fetch-depth: 0` on the checkout (the action reads history from the working clone; `fetch-depth` is not one of its own inputs). `continue-on-error: true` until a `GITLEAKS_LICENSE` repository secret is configured, then delete that line to make it blocking. |
| S9 docs index | **New** | `docs/README.md` indexes `docs/`, records the two root-level markdown files, and points at the gitignored `incident-private/` worksheet. |
| S1 root cause in ops | **New** | `docs/operations/maintenance-checklist.md` Weekly section now runs the containment guard, so the S1 class of failure is caught on a cadence and not only in CI. |
| Incident worksheet | **New, untracked** | `incident-private/s1-exposure-details.md` holds the unredacted data-subject names, record IDs and credential identities read from the published snapshot, so notification can be drafted without putting those names in a publicly readable tracked file. `incident-private/` is now in `.gitignore`; the file is confirmed untracked. |

### Corrections to the analysis above

- **S1 (was: four applicants' NBI/police/medical/DMW-OEC paperwork).** Wrong on the facts and on the
  law. The committed `documents` rows are all `doc_type = resume`; the government-document types named
  are only the *permitted values* of that select field, and no row of any of those types exists in the
  published data. The 4 tracked PDFs are 2 unique files. Re-read the rows, not the schema.
- **S4:** `src/data/candidates.json` is **not** imported anywhere in `src/` (verified by search across
  `.ts`/`.tsx`) — and neither are the other five mock datasets in that directory. Unreferenced tracked
  files, not fixtures that ship by accident.
- **S4:** the write-path helper is `buildCandidatePayload` (`candidates.utils.ts:77`), not
  `mapFormToPayload`, which is what S5 recommended asserting in CI.
- **S4:** `Candidates.tsx` is at `src/components/custom/`, not in `src/pages/`, and is 2,560 lines, not
  2,420.
- **S9:** `pb_hooks/` contains no `8090` and no `baseUrl` reference today, so the "default port is 8090
  while the project standardises on 8091" item no longer applies as written. The port split is real but
  lives in config: `skillstrader-frontend/.env` pins `127.0.0.1:8090` while `dev.mjs`, `.env.example`
  and the runbook use `8091`.
- **S9:** `docs/operations/maintenance-checklist.md` is 33 lines, so the cited `:48` and `:16` line
  references never resolved.

### Still open, deliberately

- **S1 is unresolved as a security incident, and step 1 has changed.** Rotate the 2 `_superusers` and
  6 `users` credentials that the published `data.db` exposes before anything else — a purge removes the
  blob but not the crackability of an already-downloaded bcrypt hash. Then decide, from the production
  database, whether this is a breach requiring notification or a hygiene task; on the committed
  evidence it reads as developer test data, which is **not** grounds for notifying applicants.
- **The containment commit is still unpushed.** `HEAD` tracks only `pb_data/storage/.gitkeep`, but all
  eight non-`main` remote branch tips still publish the four PDFs and five of them still publish
  `data.db`/`auxiliary.db` — including `develop-pre-merge`, the default branch. The repository is still
  public (re-verified 2026-10-23, `ls-remote` with the credential helper disabled returned 10 refs).
- **No verified backup exists.** `backups/` is still absent, so the precondition for the history purge
  is unprovable, and `pb-backup.ps1` zips a live WAL database while `pb-restore-drill.ps1` only checks
  that expected filenames exist inside the zip. Both need fixing before any rewrite; `git filter-repo`,
  `gh` and `docker` are all uninstalled here (Python 3.12.3 is present, so `pip install git-filter-repo`
  is the shortest path).
- **S7** dependency versions are untouched; findings stay report-only.
- The **14 pre-existing ESLint errors** remain. CI runs lint and `npm audit` as steps explicitly labelled
  `(advisory)` with `continue-on-error: true`, so the pipeline reports them without blocking merges.
  Delete those two `continue-on-error` lines to turn them into gates once the backlog and the highs are cleared.
- **No CI check yet** asserts the per-collection API rules (S3) or diffs the write payload against the
  live schema (S5). Both can be done without a superuser: replay the whole `pb_migrations/` chain into a
  throwaway `--dir` and read `_collections` from the resulting DB read-only. Neither is wired up.
- `positions` still has `listRule` and `viewRule` both empty, so its rows are anonymous-readable.
  Separate from S1 and bounded by the bind address, but still your call on whether the catalogue is
  meant to be scrapable.

### Verification caveat for this pass

Every rule, row, hash, md5 and settings claim above comes from **read-only** inspection: `git ls-tree` /
`git show` on published blobs, and `node:sqlite` against `pb_data/data.db` with `readOnly: true`. Creating
a PocketBase superuser is refused on this machine, so no authenticated API call was made and the browser
flow was never exercised. In particular the `getToken({ requestKey: null })` scope question in S8 and the
production-versus-test-data question in S1 cannot be closed by these methods; the first needs an
authenticated round trip, the second needs the production database.


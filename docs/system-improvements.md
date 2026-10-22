# SkillsTrader — System Improvement Plan

Analysis date: 2026-10-22
Scope: `pb_migrations/`, `pb_hooks/`, `skillstrader-frontend/`, `.github/`, `scripts/`, `.gitignore`, git history.
Method: read-only inspection of tracked files and `git ls-files` / `git log` output. No production system was accessed and no data was modified.

> Applicant names and record IDs are deliberately redacted in this document. The repository is
> publicly readable, so restoring personal data inside a committed file would widen the exposure
> described in S1.

---

## S1. Applicant personal documents are committed to a public repository — CRITICAL

**Evidence**

- Four applicant CV/resume PDFs and their `.attrs` sidecars are tracked at `HEAD`:
  `pb_data/storage/pbc_3332084752/<4 record dirs>/<name>_cv_*.pdf` and `<name>_resume_*.pdf`
  (each filename embeds the applicant's real name).
- `git log --all --diff-filter=A -- "pb_data/storage/**"` confirms they were added and never
  removed — they exist in every prior revision, not just the current tree.
- The repository is **public**. Confirmed by fetching with the credential helper disabled entirely
  (`git -c credential.helper= ls-remote https://github.com/PyotrXD/SkillsTrader.git`), which returned
  9 branch refs and `HEAD = a961b58c` — i.e. full read access with no credential of any kind.
- This is systemic, not accidental. `.gitignore:2-3` states the policy outright:
  *"Commit PocketBase data snapshots for cross-device development."*
  The existing one-off ignore lines for individual files (a second applicant resume and a DMW image)
  show the team has been suppressing this symptom one path at a time.
- The affected collection (`pbc_3332084752`) holds documents of type `nbi_clearance`,
  `police_clearance`, `hearing_test`, `medical_exam`, `dmw_oea`, `overseas_employment_certificate`.
  This is government ID, criminal-record, health and employment data on Filipino migrant-worker
  applicants.

**Why it matters**

Under the Philippine Data Privacy Act (RA 10173), these are "sensitive personal information"
(Sections 3(l) and 16), and the IRR contemplates administrative, technical and physical safeguards
including encryption and access control. Publication of a resume plus NBI and police clearance is a
reportable personal-data breach in the NPC's framework. This is an operational and legal exposure for
SkillsTrader as the personal information controller, not just a hygiene issue. Treat as an incident.

**Recommended actions, in order**

1. Make the repository private immediately (org settings). This does not undo prior exposure but stops
   new anonymous access.
2. Stop committing runtime data: remove the `pb_data` snapshot policy from `.gitignore`, ignore
   `pb_data/storage/**` wholesale, and keep only `pb_data/storage/.gitkeep`. Add `pb_data/**/*.pdf`
   and `**/*.attrs` as belt-and-braces.
3. Purge the blobs from all history with `git filter-repo` or BFG Repo-Cleaner, force-push, then ask
   GitHub to run a GC on the network so the orphaned objects and their commit SHAs stop resolving.
   Deleting the files at `HEAD` is not sufficient — they remain fetchable by revision.
4. Because objects sat in a public repo, assume the four PDFs are already copied. Notify the affected
   applicants and the PIC/DPO and log the incident; the NPC circular on personal data breach
   notification sets a 72-hour clock from awareness.
5. Rotate the PocketBase `PB_ENCRYPTION_KEY` after the purge (see C1) if any real value was ever committed.

A history rewrite touches shared state and will invalidate every open branch, so it needs your explicit
go-ahead and coordination with anyone else working on `ady/*`, `ryan_*`, `sky/*` and `develop-pre-merge`.

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

Each collection was hardened in a different migration and the result is uneven. Current effective rules:

| Collection | Read | Write | Source |
|---|---|---|---|
| `candidates` | admin/manager/staff | admin/manager/staff, delete admin-only | `1774000000:35-42` |
| `documents` | admin/manager/staff | admin/manager/staff, delete admin-only | `1774000000:44-48` |
| `employer` | admin/manager/staff | admin/manager/staff | `1784348797:7-10` |
| `interviews` | any authenticated | any authenticated, **including delete** | `1772779005:16-20` |
| `placements` | any authenticated | any authenticated, **including delete** | `1772779004:25-29` |
| `job_orders` | any authenticated | any authenticated, **including delete** | `1772779003:16-20` |
| `positions` | public (`""`) | any authenticated, **including delete** | `1773500003:102-108` |
| `users` | admin or self | create/delete admin-only | `1778000000:11-19` |
| `audit_logs` | admin only | no API writes (hook-only) | `1773600000:149-153` |

- **Asymmetry:** the most sensitive tables (candidates, documents) are role-gated, while `interviews`,
  `placements` and `job_orders` accept any authenticated principal — including a `staff` account whose
  job should not be to delete placement or interview records. Candidate interview assessments and
  placement fee data are reachable at a lower bar than the candidate record they belong to.
- **Public positions read** (`listRule = ""`) is intentional per the migration comment — the candidate
  form and positions page need it without a session. It is defensible for industry/title reference data,
  but it does mean the full position catalogue is scrapable. Confirm that is acceptable, or gate the
  detail view and keep only the dropdown list public.
- **Rollback paths loosen security.** The down-migration of `1774000000:83-94` rewrites
  `candidates.deleteRule` to plain `@request.auth.id != ''`, so a rollback silently widens delete to
  every staff account. Down-migrations deserve the same review as up-migrations.
- **Audit-log immutability is expressed as a contradiction**
  (`@request.auth.id != '' && @request.auth.id = ''`). It works — always false — but it reads like a bug.
  `null` states the same intent legibly.

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

- **`Candidates.tsx` is 2,420 lines** and holds list, view, edit, create, archive, document upload and
  resume generation. The Education and Work Experience blocks are duplicated three times
  (`:1290` view, `:1714` edit, `:2150` create) and the Government IDs block twice (`:1679`, `:2115`).
  Any field change must be made in triplicate, which is how S5 survived.
- **14 pre-existing ESLint errors** (verified against the baseline config, so not caused by the
  tooling commit): unused vars and `no-explicit-any` in `AuditLog.tsx:7`, `Employers.tsx:197`,
  `JobOrders.tsx:263`, `Placements.tsx:92`, `Users.tsx:395`, `Tooltip.tsx:2`, `DashboardHome.tsx:6`;
  plus a `react-hooks/set-state-in-effect` at `AuditLog.tsx:114` that causes cascading renders.
  `npm run lint` exits non-zero today.
- **`valueAtPath()` (`RecordsWorkspace.tsx:348-359`)** walks a dot-separated path with unchecked
  segments, so `__proto__` or `constructor` in a caller-supplied path traverses off the intended
  object. Guard with `Object.hasOwn` or restrict to a key allow-list.
- **No error boundary anywhere** (`grep` for `componentDidCatch|ErrorBoundary` finds nothing) and no
  Suspense/lazy loading — every admin module and `react-router-dom` is in one eager bundle.
- **Test coverage is 3 files against 38 source files**, all added 2026-10-22. `candidates.utils.ts`
  (`mapFormToPayload`, `createEmptyDocumentsMap`) and `auditLog.ts` are untested, and
  `mapFormToPayload` is exactly where S5 lives.
- `data/candidates.json` is a mock dataset seeded with realistic-looking Philippine education
  institutions; it is still imported by `Candidates.tsx:5`. Confirm it is not reachable in production
  builds, since it is the sort of fixture that ships by accident.

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

- `pb_hooks/main.pb.js` is a 20 KB JS file carrying every server-side route, hook and validation rule,
  with no split by domain and no lint or test coverage — `eslint.config.js` and `tsconfig` only target
  `skillstrader-frontend`, and `.gitignore` excludes `pb_data/types.d.ts`, so the hooks get no type
  checking either.
- Server-side validation is thin where the frontend carries the logic. `login rate limit exceeded`
  surfaces from `main.pb.js:192`, meaning rate limiting lives in `utils/rateLimit.ts` on the client
  (localStorage), which any caller can bypass by not being a browser. Auth throttling must be enforced
  server-side. `main.pb.js:124` and `:163` already log "no rate limit configured" and "skipped check"
  on some paths.
- File handling uses `pb.files.getToken({ requestKey: null })` (`Candidates.tsx:146`) to build
  document URLs. Confirm this does not issue a token that authorises arbitrary files for the
  collection, rather than the single requested file.
- `main.pb.js:233` stores `details` as a JSON string and `:224-227` merges `Object.keys(original)` with
  `updatedFields` for changed-field diffing. Audit-log payloads built this way can capture full record
  values, including the government-ID fields from S1, into `audit_logs` — which is readable by admins
  and, before `1773600000`, was readable by managers. Verify what is actually logged for a candidate
  update.

**Recommended actions**

- Split `main.pb.js` by domain (`routes/`, `hooks/`, `lib/`) and add it to the lint and type-check
  surface, or at minimum a smoke test that boots PocketBase and asserts the custom routes respond.
- Move login throttling and document-count limits into `pb_hooks` so they are enforced where an
  attacker cannot opt out (OWASP ASVS V2.2 / V3.2: authentication and rate limiting are server-side
  controls).
- Define the rate-limit value in one place, applied on every login path, with a comment recording the
  intended threshold.

---

## S9. Smaller items worth queueing — LOW

- `main.pb.js:100` and `:113` build URLs from `pb.config.baseUrl ?? "http://127.0.0.1:8090"` — the
  default port is 8090 while the whole project standardises on 8091. Harmless if `baseUrl` is always
  set, wrong the moment it is not.
- `main.pb.js:127` uses an `@request.env.` prefix in a field read and `:48` mentions a `test_smtp`
  SMTP record, both of which depend on PocketBase env/secret configuration that is not documented in
  `docs/operations/production-runbook.md`.
- `debug_employer_creation.js` at the repo root imports `@atlassian/atlassian-navigation-mfe`, a
  dependency that exists nowhere in this project. It is a leftover debugging script from
  `EMPLOYER_CREATION_FIX_SUMMARY.md` and should be deleted or moved to `scripts/` with a note.
- Two root-level markdown files (`EMPLOYER_CREATION_FIX_SUMMARY.md`, `README.md`) sit outside `docs/`
  while `docs/` already holds runbooks, a maintenance checklist, a restore-drill log, a developer
  guide and a requirements checklist. Worth one index page in `docs/` so the history does not scatter.
- `docs/operations/maintenance-checklist.md:48` schedules "Run database integrity check" and
  `:16` tracks the restore drill, which is good practice; add a companion item for verifying
  `pb_data/storage` contains nothing that should not be there, since that is the S1 root cause.
- `.gitignore` mixes policy with one-off file suppressions and has a stray
  `docs/developer-guide.md` line that hides a documentation file nobody expects to be ignored. Worth a
  cleanup pass once S1 is resolved.

---

## Suggested ordering

| # | Item | Effort | Blocking? |
|---|---|---|---|
| 1 | Make repo private; stop tracking `pb_data` runtime data (S1) | Low | Start here |
| 2 | Notify applicants/DPO and log the breach; plan history purge + GitHub GC (S1) | Low, then coordination | Legal clock |
| 3 | Fix CI so it can run, then add lint/test/audit/secret-scan (S2) | Medium | Yes — gates everything below |
| 4 | Default all bind hosts to `127.0.0.1` (S6) | Low | No |
| 5 | Patch `react-router-dom`, `vite`, `esbuild` (S7) | Medium | No |
| 6 | Unify API rules; move deletes to admin/manager; assert them in CI (S3) | Medium | No |
| 7 | Move login rate limiting server-side; split and type-check `main.pb.js` (S8) | High | No |
| 8 | Resolve `school_other_name` drift + payload-vs-schema check (S5) | Low | No |
| 9 | Fix the 14 lint errors; extract the duplicated Candidate sections (S4) | Medium | No |
| 10 | Low-priority cleanups (S9) | Low | No |

Items 1 and 2 are the only ones with an external deadline. Everything else is ordinary engineering
backlog that this pass happened to make visible.

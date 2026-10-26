# SkillsTrader documentation index

Everything under `docs/` is scoped to a subsystem. Start here if you are looking for a document and
do not know which directory it lives in.

## Development

| Document | What it covers |
|---|---|
| [developer-guide.md](developer-guide.md) | Setting up the repo, running the frontend and PocketBase together, project layout |
| [system-improvements.md](system-improvements.md) | Security and architecture findings S1–S9, with the remediation status for what has been applied and what is deliberately open |

## Operations (`operations/`)

| Document | What it covers |
|---|---|
| [production-runbook.md](operations/production-runbook.md) | Deploy, systemd unit, reverse proxy, `PB_ENCRYPTION_KEY`, the `ady/live` VPS cutover and its rollback |
| [pocketbase.md](operations/pocketbase.md) | PocketBase bind addresses, admin UI access, backup and restore commands |
| [verifying-access-controls.md](operations/verifying-access-controls.md) | Runbook for the S1 containment guard, the S3 API-rule assertions, the S5 payload/schema drift gate and enabling auth throttling |
| [credential-rotation.md](operations/credential-rotation.md) | Where credentials live, local rotation scripts, the `--automigrate` trap, and the production procedure that actually closes S1 step 1 |
| [maintenance-checklist.md](operations/maintenance-checklist.md) | The recurring weekly/monthly tracker and its open follow-ups |
| [restore-drill-log.md](operations/restore-drill-log.md) | Evidence log for each restore drill |

## Requirements (`requirements/`)

| Document | What it covers |
|---|---|
| [requirements.md](requirements/requirements.md) | The `R-*` requirement rows and their status |
| [pocketbase-alignment.md](requirements/pocketbase-alignment.md) | How the requirement set maps onto the PocketBase schema |
| [requirements-checklist.csv](requirements/requirements-checklist.csv) | The same rows in spreadsheet form |

## At the repository root

Two documents predate this structure and were left in place rather than moved, so that any link or
commit referencing them keeps resolving:

- `README.md` — what SkillsTrader is and who uses it
- `EMPLOYER_CREATION_FIX_SUMMARY.md` — a historical write-up of one employer-creation bug

## Not committed, on purpose

`incident-private/` holds the unredacted S1 exposure worksheet: real data-subject names, record IDs
and credential identities. The repository is publicly readable until S1 is closed, so nothing
identifying belongs in a tracked file. See the note in `.gitignore`.

# PocketBase vs Requirements Checklist

This document maps what currently exists in PocketBase (via `pb_migrations/`) to `docs/requirements/requirements.md`.

## Current collections (from migrations)

- `employer` (base): company/contact metadata + `contracts` (file)
- `candidates` (base): candidate profile + legacy document file fields + `status`
- `job_orders` (base): role/title/skills/openings + `employer` relation + `status`
- `placements` (base): currently a record with candidate/job/date/fee fields
- `interviews` (base): candidate relation + date/result/notes
- `documents` (base): typed document tracking (candidate/employer linked) + protected file
- `audit_logs` (base): append-only audit trail (written by hooks; read-only via API)
- `_pb_users_auth_` (auth): `role` select (`administrator|manager|staff`) (legacy: `recruiter`)

## I. Data and Information Management

- Candidate Records
  - Implemented: name (`full_name`), email, phone, address, education, work history, skills (json), certifications, desired salary
  - Implemented (photo): `photo` (file field)
  - Implemented (documents, legacy fields): `resume` (pdf), `passport` (file), `visa` (file), `others` (multi-file)
  - Note: candidate/employer file fields are now set to protected by default
  - Missing/partial: explicit structured fields for licenses (currently freeform via `certifications`) and document types like NBI/police clearance (currently only via `others`)
  - Added (privacy): consent metadata fields (`consent_given`, `consent_at`, etc.)

- Employer/Company Records
  - Implemented: company name, contact person/email/phone, country, industry, employer contracts (multi-file)
  - Implemented (billing): basic billing info fields (name/email/phone/address/terms/notes)
  - Derived (no separate field): "job order history" is available via the `job_orders.employer` relation

- Job Order Management
  - Implemented: title, description, required skills (json), salary range, number of openings, employer relation, status (`open|closed|filled`)
  - Implemented: `client_company_id` (optional external reference)
  - Added: numeric salary bounds (`salary_min`, `salary_max`, `salary_currency`) for better filtering/reporting

- Placement/Hiring Records
  - Implemented (via `placements`): candidate relation, job order relation, departure date, arrival date, placement date, placement fee date + amount
  - Implemented: placement `status`, `start_date`, `agency_fee_amount`, `commission_amount`

- Document Tracking
  - Implemented (current): candidate docs exist as fixed file fields + "others"; employer contracts exist as file field
  - Implemented (target): `documents` collection is the canonical source of truth for typed docs, status, expiry, and verification metadata

- Interview & Assessment
  - Implemented (partial): interview date, result, notes (linked to candidate)
  - Implemented: optional assessment score fields on `interviews`

## II. Functional Requirements

- Search and Filtering: partially supported by PocketBase querying + current schema; no explicit indexes defined in migrations yet
- Matching Engine: missing (no rules/scoring model stored yet)
- Reporting & Analytics: missing (no reporting endpoints/jobs/aggregations implemented yet)
- Status Tracking: partially implemented (candidate `status` exists; placement status is missing)
- Bulk Actions: missing (would be app-layer feature; PocketBase supports batch-like behavior via client logic)
- User Roles & Access: partially implemented (`role` exists but values don't exactly match the checklist's naming)
  - Decision: `staff` is the final name (legacy: `recruiter`)
  - Implemented: collection access rules changed from "superuser-only" to "authenticated users"

## III. Legal and Compliance

- Data Privacy: missing (no explicit consent/deletion workflow implemented)
- Security: partially covered by PocketBase auth; "encryption at rest" is not represented in migrations and depends on deployment/storage
- Audit Trails: missing (no audit-log collection or hooks-based logging visible in migrations)
- Backup and Recovery: missing (no scripted backup/restore process in repo yet)

## IV. Technical and Operational

- Scalability: not directly represented in schema; no indexes currently defined in migrations
- Reliability/Uptime: operational concern (deployment + monitoring)
- UI/UX: frontend concern
- Integration: missing (no email/SMS/accounting integration code in migrations)
- Data Migration: missing (no import tooling/scripts in repo yet)

## Suggested next schema changes (to better match the checklist)

- Candidate documents: migrate fixed "candidate document" fields (`resume`, `passport`, `visa`, `others`) into `documents` over time for a single source of truth
  - Decision: `documents` is the canonical store; `candidates.{resume,passport,visa,others}` are legacy during migration.
  - Plan:
    1) Start writing all new uploads to `documents` (preferably dual-write during the transition if older screens still depend on the legacy fields).
    2) Backfill existing candidate files into `documents` (one `documents` record per file; `others` becomes multiple `documents` records).
    3) Update app reads to use `documents` exclusively, then remove legacy fields from `candidates`.
  - Note: PocketBase files are stored per record/collection, so backfilling implies copying the file blobs (not referencing them).

- User roles: finalize `staff` (not `recruiter`) and remove legacy values once all users are migrated
  - Decision: final role name is `staff`.
  - Implementation:
    - Migrate any existing users with `role='recruiter'` to `staff`.
    - Update the `_pb_users_auth_` role select values to `administrator|manager|staff`.
    - PocketBase migration: `pb_migrations/1772779312_updated_users_roles_staff.js`.

- Add reporting endpoints/jobs (placement rate, time-to-hire, revenue tracking) and a lightweight analytics schema if needed

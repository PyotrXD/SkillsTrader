# Requirements Checklist

Source: `docs/requirements/requirements-checklist.csv`

## I. Data and Information Management (What Data Needs to be Stored?)

- [ ] **Candidate Records**
  - Personal info (name, email, phone, address)
  - Photo
  - Educational background
  - Work history/experience
  - Skills, certifications/licenses
  - Desired salary
- [ ] **Employer/Company Records**
  - Company name
  - Contact person
  - Contact info
  - Country
  - Industry
  - Job order history
  - Billing information
- [ ] **Job Order Management**
  - Job order
  - Description
  - Required skills
  - Salary range
  - Number of openings
  - Client company ID
  - Status (open, closed, filled)
- [ ] **Placement/Hiring Records**
  - Candidate ID
  - Job order ID
  - Departure date
  - Arrival date
  - Placement fee date and amount
  - Date of placement
  - Placement status (pending, confirmed, start date)
  - Agency fees/commission
- [ ] **Document Tracking**
  - Upload and link candidate documents (CVs, passports, visas, NBI/police clearances) and employer contracts
  - Offer letter, DMW-approved contract, overseas employment contract
- [ ] **Interview & Assessment**
  - Track interview dates, results, and assessment scores

## II. Functional Requirements (What Does the System Need to Do?)

- [ ] **Search and Filtering**
  - Search by keywords, skills, salary, job title, candidate status, name, departure date, arrival date, employer
- [ ] **Matching Engine**
  - Suggest best candidates for a specific job order based on skills and criteria
  - Note: “Medyo later update pa po ito.”
- [ ] **Reporting & Analytics**
  - Placement rates
  - Time-to-hire
  - Active candidates
  - Client performance
  - Revenue/commission tracking
  - Employer attrition rate
  - Note: “Medyo later update pa po ito.”
- [ ] **Status Tracking**
  - Track candidate progression (applied → screened → interviewed → placed)
- [ ] **Bulk Actions**
  - Update status for multiple candidates
  - Bulk communications (if email integration is added)
- [ ] **User Roles & Access**
  - Administrator: access to everything + source code
  - Management: access to everything, no code access
  - Recruiter: create/edit/delete/upload records

## III. Legal and Compliance Requirements

- [ ] **Data Privacy**
  - Consent, data access, and data deletion mechanisms (sensitive data)
- [ ] **Security**
  - Encryption at rest and in transit
  - Strong authentication
- [ ] **Audit Trails**
  - Log user actions (who did what and when)
- [ ] **Backup and Recovery**
  - Regular backups + clear recovery plan

## IV. Technical and Operational Requirements

- [ ] **Scalability**
  - Scale from ~5,000 to ~50,000 candidate/client records
- [ ] **System Reliability/Uptime**
  - Consistently available during business hours (7AM–6PM)
- [ ] **Ease of Use (UI/UX)**
  - Intuitive daily workflows; minimize training time
- [ ] **Integration**
  - Potential integrations: email clients, SMS gateways, accounting software
  - Note: group emailing OFWs (by employer/job/sets), depending on setup
  - Note: “Medyo later update pa po ito.”
- [ ] **Data Migration**
  - Plan to migrate existing spreadsheets/old databases into the new system

## V. Next Developer Steps (Handoff Notes)

- [ ] **Stabilize PocketBase user creation flow**
  - Confirm `pb_hooks/main.pb.js` create/update/delete request hooks call `e.next()` so requests are not blocked.
  - Re-test user creation in PocketBase Dashboard with required fields (`email`, `password`, `passwordConfirm`, `role`).
- [ ] **Keep local/prod port configuration aligned**
  - Current default PocketBase host is `127.0.0.1:8091` in dev setup and frontend defaults.
  - Verify no local process conflicts with the chosen port before release.
- [ ] **Finalize role terminology across docs and UI**
  - App currently uses `administrator`, `manager`, `staff`.
  - Legacy text in requirements still mentions `Recruiter`; decide whether to keep as business label or fully rename to `Staff` everywhere.
- [ ] **Define strict collection access rules by role**
  - Replace broad authenticated rules with explicit role-based rules per collection where needed.
  - Validate that administrators/managers/staff have only required access.
- [ ] **Add automated smoke tests for critical flows**
  - Login (users + superuser fallback).
  - Create/update/delete for core collections.
  - User creation and role assignment.
- [ ] **Add deployment runbook artifacts**
  - Provide actual service definitions (Linux `systemd` and/or Windows service wrapper).
  - Provide reverse proxy config with websocket headers and TLS.
- [ ] **Operational hardening**
  - Enforce `PB_ENCRYPTION_KEY` in production startup.
  - Confirm backup schedule and periodic restore drill using provided scripts.
- [ ] **Audit and observability**
  - Verify `audit_logs` capture create/update/delete for all core collections.
  - Add lightweight monitoring/alerts for PocketBase process health and failed requests.
- [ ] **Data migration execution plan**
  - Define mapping from spreadsheet columns to target collections/fields.
  - Prepare import scripts and validation checks for migrated records.


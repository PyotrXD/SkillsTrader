# Update log: from the live version to the current build

**For:** anyone who uses SkillsTrader — recruiters, coordinators, managers — not only developers.
**Covers:** the version running on the production server (`ady/live`, last changed 15 September 2026)
up to the version now ready on the development branch (`ady/development`, last changed 26 October 2026).
**Amount of work:** 48 changes, made between 22 and 26 October 2026.

---

## The short version

Twenty-two days of work went into this. The headline is not new features — it is that several things
which looked broken from the inside were actually broken, and now are not. A job order could not be
saved at all. Page 2 of three different screens was always empty. An expired police clearance was
invisible unless someone opened the folder and looked at its date. When the system failed, it usually
lied about why.

Alongside those fixes, the candidate record is easier to fill in, printed resumes stop lying about
their page count, and the people who can delete applicant data have been narrowed down. A batch of
changes also closes a privacy problem: the database and four applicant documents had been stored
inside the code repository, which is publicly readable.

Two things the team should know before this goes live are at the bottom: **the update must be
installed in a specific order or it will delete applicant files from the server**, and the password
change that fixes the privacy problem has only been done on a developer machine, not on the live
server yet.

---

## 1. Things that were broken and are now fixed

### Job orders could not be saved, at all
Creating or updating a job order always failed. The screen used status names starting with a capital
letter ("Open") while the database only accepts lowercase ("open"), so every single save was
rejected. Worse, the message said only "Failed to create job order" and threw away the real reason,
so nobody could tell it was a naming mismatch rather than a network problem. This is consistent with
the job orders list having no rows in it.

Two side effects of the same mismatch are also fixed: every job order badge fell back to the same
grey colour so they all looked identical, and choosing any status in the filter emptied the table.

### Clicking page 2 showed nothing
On the Audit Log, Placements and Employers screens, the system downloaded one page of records and
then tried to split that into pages again locally. The page counter therefore said "1 page" no matter
how much data existed, and page 2 reached past the end of the list and displayed an empty table.

Searching had the same root cause and a nastier symptom: the search only looked at the page currently
on screen. Typing a name that lived further down returned "no results", which reads like the record
was lost. Searches now go to the server and cover everything.

### A failed load looked like an empty list
Seven list screens reacted to a connection or server failure by showing their "No candidates found"
empty state. An outage and a genuinely empty list were indistinguishable. Those screens now say
which of the three situations they are in — loading, loaded, or failed — and a failed one offers a
Retry button that refetches without a page reload. If a load fails, the old rows are cleared instead
of staying on screen looking current.

### A false "connection problem" warning
Separately, the Employers and Job Orders screens showed a banner claiming a server problem on every
visit even though the data loaded fine underneath it. This only happened on those two screens, which
is why they were the two that looked broken while the other five looked normal.

### Error messages that said nothing
Eight places in the app replaced the system's actual complaint with a hardcoded "Failed to update".
A rejected form, a permission refusal and a total network outage all produced the same dead end.
They now display the reason the server gave. This is the same class of defect that hid the job order
bug above for the life of that feature.

### The Audit Log "Clear" button overstated itself
The confirmation dialog said "This action cannot be undone." It was not true: the button emptied a
storage area on the user's own browser that the table never read from, so the records came back on
the next reload. The behaviour is deliberately unchanged — audit records are write-only through the
API, so there is no safe delete to build — but the wording now describes what actually happens.

### Printed resumes had a fake page count and a blank page
The printed candidate resume stamped "Page 1 / 1" in the footer no matter how long it was, because
that number was hardcoded. A resume of four pages claimed to be one. Printing now produces real page
counts, sections that continue across a page break are labelled as continuing, and tables split
between rows rather than mid-row. An unwanted completely blank page at the end of every printed
resume is also gone.

---

## 2. Changes to the candidate record

### One long form is now four tabs
Adding or editing a candidate used to stack personal information, contact details, government IDs,
education and work history into a single scrolling screen, and the same fields were duplicated
between the "add" and "edit" versions of that screen. The form is now one shared set of four tabs:
**Personal Information**, **Education History**, **Work History** and **Details**. Required-field
checks were rewritten to match, because a field on a hidden tab cannot block the browser the way it
did when everything was visible at once.

*Decision recorded during this work: tabs let people jump between sections freely rather than being
forced forward one at a time.*

### Work and school history are now proper lists
Each job and each school is stored as its own entry, so the profile, the resume and the editors can
show the most recent role and every qualification individually instead of one paragraph of text.

### The old free-text work history box is gone
There were two ways to record the same information — the new structured list and a plain text box
beside it. The text box has been removed from every editing screen, including the candidate view and
the Records workspace. Text already saved by someone who was never migrated to structured entries
now has no screen that displays it; that trade-off was accepted knowingly rather than discovered
afterwards.

---

## 3. Seeing documents that are about to lapse

Every document record has carried an expiry date since the feature was built, and nothing in the
running system ever read it. An expired NBI printing, police clearance or medical certificate was
only discoverable by opening that specific record.

Now:
- The Documents screen colours each row — lapsed, or lapsing soon — and adds a filter so a
  coordinator can pull up only the problem ones.
- The dashboard has a tile counting documents that need action, showing "already lapsed" and
  "lapsing soon" as two separate numbers rather than one combined total, so the figure can be checked
  against the Documents screen.
- Documents with no usable date show no badge and appear in no named filter, including "Still valid"
  — unknown is deliberately not treated as valid.
- This only reads and displays. It never changes a document's approval status, because status is set
  by staff and an automatic rewrite could silently reopen a rejected document.

---

## 4. Managing user accounts

The user roster was repaired so an administrator can create accounts, search the list and edit
existing users — actions that were unreliable before. Managers can now also open the roster and read
it. The authority to actually create, change or remove accounts was left with administrators only;
that was a deliberate boundary, not an oversight.

---

## 5. Who can delete applicant data

Several records — interviews, placements, job orders, positions, employers, and the work/school
history attached to a candidate — could previously be deleted by **any signed-in user**, including
staff accounts. That was a lower bar than the one protecting the candidate record those rows belong
to, so a staff login could remove interview assessments and placement fee records while being unable
to remove the candidate above them.

Read access moved to the same tier candidates and documents already used. Creation and editing of
interviews and placements moved to manager and above, matching buttons the interface already hid.
Deletion of employers, job orders and positions moved to manager and above. Deletion of candidate
records stays administrator-only.

The matching screen buttons now grey out with an explanation for anyone who lacks the permission,
instead of offering an enabled button that would return a refusal.

**Expect this to be noticed.** A recruiter who could clear a placement last month cannot today.
Where a permission was tightened, the change is enforced on the server, so it cannot be worked
around from the interface.

Deliberately left alone: whether the positions catalogue should be readable by people who are not
logged in at all. That is a product decision and was not settled silently inside a security fix.

---

## 6. Applicant data and passwords that were exposed

The most serious finding of this period, written up in full in
[system-improvements.md](system-improvements.md), was that the working database and four applicant
documents had been committed into the code repository — which anyone on the internet can read.
That repository also contained the login credentials for the system's most powerful accounts.

Reading the published data corrected an early assumption worth recording: the four documents belong
to a repository administrator and the document rows are test data, so this was **not** the
regulated breach it first appeared to be. The credentials are the real exposure, and changing a
published password cannot be undone by deleting files afterwards.

What was done:
- Applicant uploads and the running database are no longer stored in the repository, and an
  automatic check fails any attempt to add them back. The files on disk were left untouched.
- The passwords for the affected local accounts were changed and verified by actually logging in.
- New checks refuse to accept credential files or a real `.env` into the repository, even when
  someone forces an add.
- Sensitive incident worksheets and agent scratch space are excluded from version control.
- Developer preview servers now bind to the local machine by default, so a normal `npm run dev` is
  not reachable from the rest of the office network.

**Not finished.** Production passwords still need changing on the live server, and the published
files still exist in the repository's history and on seven other branches. See "Still outstanding"
below.

---

## 7. Work nobody sees, that makes the rest safer

- **Automated tests went from nothing to 12 test files**, the last recorded run reporting 133
  passing checks, plus a test runner and security-minded lint rules. Every fix in sections 1–5 has a
  test that fails if the bug returns. *(The 133 figure is quoted from that run's own output; this
  machine cannot start the test runner, so it was not re-verified while writing this log.)*
- **The update pipeline was fixed.** Continuous integration was installing a package that is not in
  the repository, so it was not building or checking the real application. It now installs and
  builds the actual frontend.
- **Three new pre-deployment safety checks.** One confirms the permission rules on the database match
  what is intended, including that rolling an update back does not silently widen access. One fails
  the build if the candidate form tries to save a field the database no longer has — a failure mode
  where the value is accepted, then vanishes without a trace. One inspects the *live* database before
  an update and reports which changes are pending and whether any applicant file would be deleted.
- **Dropdown choices are now checked against the database.** The job order bug was a value the
  database refuses; there is now an assertion that catches any such mismatch before release.
- **Dead code removed**, including an unused type, an unused state variable, a stale debug script in
  the repository root, and declarations the linter flagged.
- **Documentation caught up**: a production runbook, a credential-rotation procedure, a maintenance
  checklist, a hand-verification guide for every new permission rule, and a restored developer guide
  that had been hidden by a stray ignore rule.

---

## 8. Open decisions this update leaves on the table

Two numbers in the app disagree with each other, and neither was changed because both are figures
recruiters already rely on:

**"Missing documents" has two definitions.** One counts three document types read from fields on the
candidate record. The other counts five types read from the Documents collection. The candidate list
and the dashboard can therefore disagree about the same person on the same day. Which definition is
correct is a business question.

**Whether non-logged-in users should see the positions catalogue.** The permission that allows it is
still in place, unresolved.

---

## 9. Before this goes live — read this if you are the one pressing the buttons

**The order of operations matters, or the update deletes applicant files.** The live server's branch
still keeps four applicant documents inside version control, and this update stops doing that.
Pulling the update in the ordinary way therefore *removes those files from the folder the live
server reads uploads out of* — the records would survive in the database but their documents would
be gone. The exact safe sequence, including backing up the data directory first, is written in
[production-runbook.md](operations/production-runbook.md). Do not improvise it.

**Database changes apply themselves on the first start** after the update, and they apply to the real
database. Rolling the code back afterwards does **not** put the old permissions back. That is why
the pre-deployment check runs against a copy of the live database before anything is touched.

**Three things still need a human clicking through in a real browser**, because the automated tests
prove the wiring but not the live behaviour:
1. Page 2 of the Audit Log, Placements and Employers screens against a database that genuinely has
   more than one page.
2. An Employers search that matches a record which is *not* on the current page.
3. Printing a multi-page resume once in a real browser, to confirm the page breaks land where the
   layout says they should.

**Rate limiting is not switched on**, and cannot be switched on by this update — it lives in the
server's settings, not in code. Switching it on before telling the server how to read the proxy's
forwarded address would lump every user behind one shared address into a single limit and lock the
administrator panel out.

---

## 10. Still outstanding

- Changing the exposed production passwords on the live server.
- Removing the published files from repository history, and clearing them from the other branches
  that still contain them (counted as seven in the re-scan on 24 October).
- Deciding the two open questions in section 8.
- One known code-quality warning held back on purpose: fixing it changes the order in which the
  screen updates, which is exactly the kind of change that cannot be checked without a browser.

---

## Plain-language glossary

| Term | What it means here |
|---|---|
| Branch | A separate line of the code. `ady/live` is the one the public server uses; `ady/development` is the one being prepared. |
| Repository | The store the code lives in, which also remembers every past version. This one is readable by anyone online. |
| PocketBase | The database and login system behind the screens. |
| Migration | A scripted change to the database's shape or its permission rules, applied when the server starts. |
| Role gate | A rule that ties an action to a job level — staff, recruiter, manager, administrator. |
| Continuous integration (CI) | An automated job that checks and builds the code whenever it is submitted. |
| Automated test | A check a computer runs to confirm a screen or rule still behaves as it should. |

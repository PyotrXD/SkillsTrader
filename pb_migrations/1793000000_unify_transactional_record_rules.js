/// <reference path="../pb_data/types.d.ts" />

// Unifies the authorization tiers that S3 (docs/system-improvements.md) found uneven.
// Four transactional collections were hardened in 2024-era migrations to a bare
// `@request.auth.id != ''` on all five rules, which let any authenticated principal --
// including `staff` -- delete interview assessments, placement fee records and job orders,
// at a lower bar than the candidate record those rows belong to.
//
// Tiers mirror the UI that is already in the app, so the API never grants an operation the
// interface hides and never hides one the interface offers:
//   READ   = administrator | manager | staff   (matches the ungated `View` button)
//   WRITE  = administrator | manager           (matches `canManage` in Interviews/Placements)
//   DELETE = administrator | manager           (matches `canDelete` in RecordsWorkspace)
// Only the rules listed per collection are touched; anything omitted keeps its current
// value, which is what makes `positions` a delete-only change.
migrate((app) => {
  const READ =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')";
  const WRITE_MANAGER =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";

  const changes = {
    // Interviews are scored by managers; staff may read them. `canManage` already gates
    // both the "Update Result" and the create button, so write follows it.
    interviews: {
      listRule: READ,
      viewRule: READ,
      createRule: WRITE_MANAGER,
      updateRule: WRITE_MANAGER,
      deleteRule: WRITE_MANAGER,
    },
    // Placement rows carry fee data. Placements.tsx gates Edit and Delete behind canManage.
    placements: {
      listRule: READ,
      viewRule: READ,
      createRule: WRITE_MANAGER,
      updateRule: WRITE_MANAGER,
      deleteRule: WRITE_MANAGER,
    },
    // JobOrders.tsx has no role gate on create/edit, so write stays at the staff tier and
    // only delete tightens -- tightening write here would 403 a button the UI still shows.
    job_orders: {
      listRule: READ,
      viewRule: READ,
      deleteRule: WRITE_MANAGER,
    },
    // Legacy table: zero rows and no UI reference, but it holds the same class of personal
    // data as its successor, so it inherits the successor's exact tier rather than staying
    // open. `candidates` restricts delete to administrator; so does this.
    candidates_legacy: {
      listRule: READ,
      viewRule: READ,
      createRule: READ,
      updateRule: READ,
      deleteRule:
        "@request.auth.id != '' && @request.auth.role = 'administrator'",
    },
    // Employers are master-data records that staff create and edit; only delete moves.
    employer: {
      deleteRule: WRITE_MANAGER,
    },
    // Reference catalogue. The public *read* rules are deliberately untouched: whether the
    // position list should be anonymous is an open product decision tracked in S3, not
    // something an access-control cleanup silently decides. Delete moves to manager+.
    positions: {
      deleteRule: WRITE_MANAGER,
    },
  };

  for (const [name, rules] of Object.entries(changes)) {
    const collection = app.findCollectionByNameOrId(name);
    for (const [rule, expression] of Object.entries(rules)) {
      collection[rule] = expression;
    }
    app.save(collection);
  }

  // audit_logs is hook-write-only. Its create/update/delete rules expressed that as
  // `@request.auth.id != '' && @request.auth.id = ''` -- always false, so it worked, but it
  // reads like a bug to whoever reviews it next. null is PocketBase's own representation for
  // "no API access", and asserts the same intent legibly.
  const audit = app.findCollectionByNameOrId('audit_logs');
  audit.createRule = null;
  audit.updateRule = null;
  audit.deleteRule = null;
  app.save(audit);
}, (app) => {
  // Restores the rules read from the live `_collections` table on 2026-10-23, so a rollback
  // returns each collection to its recorded prior state rather than to some third value.
  const BARE = "@request.auth.id != ''";
  const ROLE_STAFF =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')";
  const CONTRADICTION = "@request.auth.id != '' && @request.auth.id = ''";

  const previous = {
    interviews: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
    placements: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
    job_orders: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
    candidates_legacy: { listRule: BARE, viewRule: BARE, createRule: BARE, updateRule: BARE, deleteRule: BARE },
    // employer was already role-gated at the staff tier on all five rules.
    employer: { listRule: ROLE_STAFF, viewRule: ROLE_STAFF, createRule: ROLE_STAFF, updateRule: ROLE_STAFF, deleteRule: ROLE_STAFF },
    // positions read rules were empty strings (public); create/update/delete were bare-auth.
    positions: { listRule: '', viewRule: '', createRule: BARE, updateRule: BARE, deleteRule: BARE },
  };

  for (const [name, rules] of Object.entries(previous)) {
    const collection = app.findCollectionByNameOrId(name);
    for (const [rule, expression] of Object.entries(rules)) {
      collection[rule] = expression;
    }
    app.save(collection);
  }

  const audit = app.findCollectionByNameOrId('audit_logs');
  audit.createRule = CONTRADICTION;
  audit.updateRule = CONTRADICTION;
  audit.deleteRule = CONTRADICTION;
  app.save(audit);
});

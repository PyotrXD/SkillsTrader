/// <reference path="../pb_data/types.d.ts" />

// Managers operate the record screens, and Sidebar offered them the Users list, but listRule and
// viewRule were administrator-only: a manager opened "Users" and PocketBase returned exactly one
// row -- themselves, via the `id = @request.auth.id` arm. Widen the two read rules so the roster is
// readable, and deliberately leave createRule, updateRule, deleteRule and manageRule alone, so
// provisioning authority does not move with this.
//
// manageRule is not a concern here: pb_data/types.d.ts documents it as "executed in addition to the
// Create and Update API rules", so it does not gate list/view and cannot veto this widening.
migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");

  const rosterRead =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || id = @request.auth.id)";

  users.listRule = rosterRead;
  users.viewRule = rosterRead;

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");

  // Restore the rules 1778000000_users_admin_list_rules.js left in place. Rolling back to the
  // PocketBase default would set listRule/viewRule to "" (public, guests included), which is
  // strictly wider than the state this migration came from.
  const adminOrSelf =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || id = @request.auth.id)";

  users.listRule = adminOrSelf;
  users.viewRule = adminOrSelf;

  return app.save(users);
});

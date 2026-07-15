/// <reference path="../pb_data/types.d.ts" />

// Default PocketBase auth rules only allow a user to list/view themselves:
//   listRule/viewRule = "id = @request.auth.id"
// That makes the Users admin page show only the currently logged-in user.
// Allow administrators to list/manage all users while keeping self-access for others.
migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");

  const adminOrSelf =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || id = @request.auth.id)";
  const adminOnly =
    "@request.auth.id != '' && @request.auth.role = 'administrator'";

  users.listRule = adminOrSelf;
  users.viewRule = adminOrSelf;
  users.createRule = adminOnly;
  users.updateRule = adminOrSelf;
  users.deleteRule = adminOnly;

  // manageRule lets admins create/update other auth records (including passwords)
  users.manageRule = adminOnly;

  return app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_");

  // Restore PocketBase default auth collection rules
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = "";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  users.manageRule = null;

  return app.save(users);
});

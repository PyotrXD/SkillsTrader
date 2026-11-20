/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const documents = app.findCollectionByNameOrId("documents");
  const users = app.findCollectionByNameOrId("users");

  documents.deleteRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || (@request.auth.role = 'manager' && candidate != ''))";
  // Self-service profile edits must preserve the role used to authorize document removal.
  users.updateRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || (id = @request.auth.id && @request.body.role:changed = false))";

  app.save(documents);
  return app.save(users);
}, (app) => {
  const documents = app.findCollectionByNameOrId("documents");
  const users = app.findCollectionByNameOrId("users");

  documents.deleteRule = "@request.auth.id != '' && @request.auth.role = 'administrator'";
  users.updateRule = "@request.auth.id != '' && (@request.auth.role = 'administrator' || id = @request.auth.id)";

  app.save(documents);
  return app.save(users);
});

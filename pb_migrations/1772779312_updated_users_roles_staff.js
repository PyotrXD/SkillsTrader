/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findRecordsByFilter(
    "_pb_users_auth_",
    "role = {:role}",
    "",
    0,
    0,
    { role: "recruiter" }
  );

  for (const user of users ?? []) {
    if (!user) continue;
    user.set("role", "staff");
    app.save(user);
  }

  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  const roleField = collection.fields.getById("select1466534506");
  roleField.values = ["administrator", "manager", "staff"];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");
  const roleField = collection.fields.getById("select1466534506");
  roleField.values = ["administrator", "manager", "recruiter", "staff"];

  return app.save(collection);
});

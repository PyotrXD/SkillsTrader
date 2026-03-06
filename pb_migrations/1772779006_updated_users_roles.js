/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  const roleField = collection.fields.getById("select1466534506");
  roleField.values = ["administrator", "manager", "recruiter", "staff"];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_");

  const roleField = collection.fields.getById("select1466534506");
  roleField.values = ["administrator", "manager", "staff"];

  return app.save(collection);
});


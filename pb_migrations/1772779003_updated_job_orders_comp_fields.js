/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1268506879");

  // Checklist: “Client Company ID” (optional external reference).
  collection.fields.add(new Field({ type: "text", name: "client_company_id" }));

  // Industry standard: store numeric salary bounds (keep legacy salary_range for display).
  collection.fields.add(
    new Field({ type: "number", name: "salary_min", required: false, min: 0 }),
    new Field({ type: "number", name: "salary_max", required: false, min: 0 }),
    new Field({ type: "text", name: "salary_currency", required: false })
  );

  // Basic RBAC: authenticated users only.
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1268506879");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  collection.fields.removeByName("client_company_id");
  collection.fields.removeByName("salary_min");
  collection.fields.removeByName("salary_max");
  collection.fields.removeByName("salary_currency");

  return app.save(collection);
});


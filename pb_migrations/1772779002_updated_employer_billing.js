/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2650974335");

  // Employer contracts are sensitive.
  collection.fields.getById("file156281203").protected = true;

  // Billing information (minimal but extensible).
  collection.fields.add(
    new Field({ type: "text", name: "billing_name" }),
    new Field({ type: "email", name: "billing_email" }),
    new Field({ type: "text", name: "billing_phone" }),
    new Field({ type: "editor", name: "billing_address" }),
    new Field({ type: "text", name: "payment_terms" }),
    new Field({ type: "editor", name: "billing_notes" })
  );

  // Basic RBAC: authenticated users only.
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2650974335");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  collection.fields.getById("file156281203").protected = false;

  collection.fields.removeByName("billing_name");
  collection.fields.removeByName("billing_email");
  collection.fields.removeByName("billing_phone");
  collection.fields.removeByName("billing_address");
  collection.fields.removeByName("payment_terms");
  collection.fields.removeByName("billing_notes");

  return app.save(collection);
});


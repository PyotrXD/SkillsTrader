/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_38668777");

  // Require job order relation for a valid placement.
  const jobOrderField = collection.fields.getById("relation4101320424");
  jobOrderField.required = true;

  // Placement status + agency fees/commission.
  collection.fields.add(
    new Field({
      type: "select",
      name: "status",
      required: true,
      maxSelect: 1,
      values: ["Pending", "Confirmed", "Started", "Completed", "Cancelled"]
    }),
    new Field({ type: "date", name: "start_date" }),
    new Field({ type: "number", name: "agency_fee_amount", min: 0 }),
    new Field({ type: "number", name: "commission_amount", min: 0 }),
    new Field({ type: "editor", name: "notes" })
  );

  // Basic RBAC: authenticated users only.
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_38668777");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  // Make job_order optional again.
  const jobOrderField = collection.fields.getById("relation4101320424");
  jobOrderField.required = false;

  collection.fields.removeByName("status");
  collection.fields.removeByName("start_date");
  collection.fields.removeByName("agency_fee_amount");
  collection.fields.removeByName("commission_amount");
  collection.fields.removeByName("notes");

  return app.save(collection);
});


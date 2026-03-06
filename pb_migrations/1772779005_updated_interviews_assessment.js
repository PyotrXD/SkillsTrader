/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3301250578");

  // Interviews should always be linked to a candidate.
  collection.fields.getById("relation3367145028").required = true;

  // Assessment scores (optional).
  collection.fields.add(
    new Field({ type: "number", name: "assessment_score", min: 0 }),
    new Field({ type: "number", name: "assessment_max_score", min: 0 }),
    new Field({ type: "editor", name: "assessment_notes" })
  );

  // Basic RBAC: authenticated users only.
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3301250578");

  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  collection.fields.getById("relation3367145028").required = false;

  collection.fields.removeByName("assessment_score");
  collection.fields.removeByName("assessment_max_score");
  collection.fields.removeByName("assessment_notes");

  return app.save(collection);
});


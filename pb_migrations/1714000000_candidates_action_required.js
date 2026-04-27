/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  // Add action_required as JSON field to store an array of flag strings.
  collection.fields.add(
    new Field({
      type: "json",
      name: "action_required",
      required: false,
    })
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  collection.fields.removeByName("action_required");

  return app.save(collection);
});
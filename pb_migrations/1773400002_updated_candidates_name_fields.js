/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  // Add separate name fields for proper name storage and display.
  collection.fields.add(
    new Field({
      type: "text",
      name: "last_name",
      required: false,
    }),
    new Field({
      type: "text",
      name: "first_name",
      required: false,
    }),
    new Field({
      type: "text",
      name: "middle_name",
      required: false,
    })
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  collection.fields.removeByName("last_name");
  collection.fields.removeByName("first_name");
  collection.fields.removeByName("middle_name");

  return app.save(collection);
});

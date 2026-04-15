/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  collection.fields.add(
    new Field({
      type: "text",
      name: "position_screened",
      required: false,
    }),
    new Field({
      type: "editor",
      name: "notes",
      required: false,
      convertURLs: false,
    }),
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  collection.fields.removeByName("position_screened");
  collection.fields.removeByName("notes");

  return app.save(collection);
});

/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("candidates");
  collection.fields.add(new Field({
    type: "json",
    name: "languages",
    required: false,
    maxSize: 65536,
  }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidates");
  collection.fields.removeByName("languages");
  return app.save(collection);
});

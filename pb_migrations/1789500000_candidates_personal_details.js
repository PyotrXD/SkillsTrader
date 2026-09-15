/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("candidates");

  collection.fields.add(
    new Field({
      type: "date",
      name: "birthdate",
      required: false,
    }),
    new Field({
      type: "text",
      name: "gender",
      required: false,
    }),
    new Field({
      type: "text",
      name: "religion",
      required: false,
    }),
    new Field({
      type: "text",
      name: "height",
      required: false,
    }),
    new Field({
      type: "text",
      name: "weight",
      required: false,
    }),
  );

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("candidates");

  collection.fields.removeByName("birthdate");
  collection.fields.removeByName("gender");
  collection.fields.removeByName("religion");
  collection.fields.removeByName("height");
  collection.fields.removeByName("weight");

  return app.save(collection);
});

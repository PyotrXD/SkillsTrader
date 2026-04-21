/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Create the positions collection if it doesn't exist yet,
  // or update the rules if it already does.
  let collection;
  try {
    collection = app.findCollectionByNameOrId("pbc_1773500000");
  } catch (_) {
    collection = null;
  }

  if (!collection) {
    collection = new Collection({
      "id": "pbc_1773500000",
      "name": "positions",
      "type": "base",
      "system": false,
      "fields": [
        {
          "autogeneratePattern": "[a-z0-9]{15}",
          "hidden": false,
          "id": "text_id_positions",
          "max": 15,
          "min": 15,
          "name": "id",
          "pattern": "^[a-z0-9]+$",
          "presentable": false,
          "primaryKey": true,
          "required": true,
          "system": true,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_industry_positions",
          "max": 0,
          "min": 0,
          "name": "industry",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_title_positions",
          "max": 0,
          "min": 0,
          "name": "title",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": true,
          "system": false,
          "type": "text"
        },
        {
          "autogeneratePattern": "",
          "hidden": false,
          "id": "text_description_positions",
          "max": 0,
          "min": 0,
          "name": "description",
          "pattern": "",
          "presentable": false,
          "primaryKey": false,
          "required": false,
          "system": false,
          "type": "text"
        },
        {
          "hidden": false,
          "id": "autodate_created_positions",
          "name": "created",
          "onCreate": true,
          "onUpdate": false,
          "presentable": false,
          "system": false,
          "type": "autodate"
        },
        {
          "hidden": false,
          "id": "autodate_updated_positions",
          "name": "updated",
          "onCreate": true,
          "onUpdate": true,
          "presentable": false,
          "system": false,
          "type": "autodate"
        }
      ],
      "indexes": []
    });
  }

  // ✅ Empty string = public read (anyone can list/view positions)
  // ✅ Needed by: candidate form dropdown + positions page
  collection.listRule = "";
  collection.viewRule = "";

  // ✅ Authenticated users only for write operations
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  // Rollback: lock everything back down
  const collection = app.findCollectionByNameOrId("pbc_1773500000");
  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;
  return app.save(collection);
});
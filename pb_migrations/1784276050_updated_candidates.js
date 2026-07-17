/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1773600001")

  // remove field
  collection.fields.removeById("text2194057254")

  // add field
  collection.fields.addAt(39, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text248697315",
    "max": 0,
    "min": 0,
    "name": "philhealth",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(40, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3888781351",
    "max": 0,
    "min": 0,
    "name": "sss_number",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1773600001")

  // add field
  collection.fields.addAt(17, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2194057254",
    "max": 0,
    "min": 0,
    "name": "school_other_name",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("text248697315")

  // remove field
  collection.fields.removeById("text3888781351")

  return app.save(collection)
})

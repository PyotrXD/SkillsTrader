/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_38668777")

  // add field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2496120988",
    "hidden": false,
    "id": "relation3367145028",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "candidate",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(2, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1268506879",
    "hidden": false,
    "id": "relation4101320424",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "job_order",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "date1259499435",
    "max": "",
    "min": "",
    "name": "departure_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date1698811771",
    "max": "",
    "min": "",
    "name": "arrival_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "date2903946866",
    "max": "",
    "min": "",
    "name": "placement_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date2348148026",
    "max": "",
    "min": "",
    "name": "placement_fee_date",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "number369470932",
    "max": null,
    "min": null,
    "name": "placement_fee_amount",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_38668777")

  // remove field
  collection.fields.removeById("relation3367145028")

  // remove field
  collection.fields.removeById("relation4101320424")

  // remove field
  collection.fields.removeById("date1259499435")

  // remove field
  collection.fields.removeById("date1698811771")

  // remove field
  collection.fields.removeById("date2903946866")

  // remove field
  collection.fields.removeById("date2348148026")

  // remove field
  collection.fields.removeById("number369470932")

  return app.save(collection)
})

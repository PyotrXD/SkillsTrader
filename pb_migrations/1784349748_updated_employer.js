/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2650974335")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2650974335")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')"
  }, collection)

  return app.save(collection)
})

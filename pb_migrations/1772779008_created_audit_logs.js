/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "audit_logs",
    type: "base",
    system: false,
    listRule:
      "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')",
    viewRule:
      "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')",
    createRule: "@request.auth.id != '' && @request.auth.id = ''",
    updateRule: "@request.auth.id != '' && @request.auth.id = ''",
    deleteRule: "@request.auth.id != '' && @request.auth.id = ''",
    indexes: [],
    fields: [
      {
        system: true,
        hidden: false,
        presentable: false,
        name: "id",
        type: "text",
        required: true,
        primaryKey: true,
        autogeneratePattern: "[a-z0-9]{15}",
        min: 15,
        max: 15,
        pattern: "^[a-z0-9]+$"
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "actor",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "action",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["create", "update", "delete"]
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "collection_name",
        type: "text",
        required: true
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "record_id",
        type: "text",
        required: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "ip",
        type: "text",
        required: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "user_agent",
        type: "text",
        required: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "request_method",
        type: "text",
        required: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "request_url",
        type: "text",
        required: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "changed_fields",
        type: "json",
        required: false,
        maxSize: 0
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "created",
        type: "autodate",
        onCreate: true,
        onUpdate: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "updated",
        type: "autodate",
        onCreate: true,
        onUpdate: true
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("audit_logs");
  return app.delete(collection);
});

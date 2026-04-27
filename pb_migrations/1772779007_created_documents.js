/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    name: "documents",
    type: "base",
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
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
        name: "candidate",
        type: "relation",
        required: false,
        collectionId: "pbc_2496120988",
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "employer",
        type: "relation",
        required: false,
        collectionId: "pbc_2650974335",
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "doc_type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: [
          "resume",
          "passport",
          "visa",
          "nbi_clearance",
          "police_clearance",
          "offer_letter",
          "dmw_approved_contract",
          "overseas_employment_certificate",
          "peos_certificate",
          "e_registration_file",
          "other"
        ]
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "file",
        type: "file",
        required: true,
        protected: true,
        maxSelect: 1,
        maxSize: 100000000,
        mimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp"
        ],
        thumbs: []
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "issued_date",
        type: "date",
        required: false,
        min: "",
        max: ""
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "expiry_date",
        type: "date",
        required: false,
        min: "",
        max: ""
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["Draft", "Submitted", "Verified", "Rejected", "Expired"]
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "notes",
        type: "editor",
        required: false,
        maxSize: 0,
        convertURLs: false
      },
      {
        system: false,
        hidden: false,
        presentable: false,
        name: "verified_by",
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
        name: "verified_at",
        type: "date",
        required: false,
        min: "",
        max: ""
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
  const collection = app.findCollectionByNameOrId("documents");
  return app.delete(collection);
});


/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  // Align field naming with the requirements checklist.
  const photoField = collection.fields.getById("file1542800728");
  photoField.name = "photo";
  photoField.protected = true;

  // Candidate documents are sensitive by default.
  const resumeField = collection.fields.getById("file1623314592");
  resumeField.required = false;
  resumeField.protected = true;

  collection.fields.getById("file3047321096").protected = true; // passport
  collection.fields.getById("file380742408").protected = true; // visa
  collection.fields.getById("file549042166").protected = true; // others

  // Consent + privacy metadata.
  collection.fields.add(
    new Field({
      type: "bool",
      name: "consent_given",
      required: false,
    }),
    new Field({
      type: "date",
      name: "consent_at",
      required: false,
    }),
    new Field({
      type: "text",
      name: "consent_source",
      required: false,
    }),
    new Field({
      type: "text",
      name: "consent_version",
      required: false,
    })
  );

  // Status values expanded (backwards compatible with existing values).
  const statusField = collection.fields.getById("select2063623452");
  statusField.values = [
    "Applied",
    "Screening",
    "Screened",
    "For Interview",
    "Interviewed",
    "For Placement",
    "Placed",
    "Rejected",
  ];

  // Basic RBAC: authenticated users only.
  collection.listRule = "@request.auth.id != ''";
  collection.viewRule = "@request.auth.id != ''";
  collection.createRule = "@request.auth.id != ''";
  collection.updateRule = "@request.auth.id != ''";
  collection.deleteRule = "@request.auth.id != ''";

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2496120988");

  // Revert RBAC rules (locked to superusers by default).
  collection.listRule = null;
  collection.viewRule = null;
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  // Revert status values.
  const statusField = collection.fields.getById("select2063623452");
  statusField.values = [
    "Applied", 
    "Screening", 
    "For Interview", 
    "Rejected", 
    "For Placement"
  ];

  // Remove consent fields.
  collection.fields.removeByName("consent_given");
  collection.fields.removeByName("consent_at");
  collection.fields.removeByName("consent_source");
  collection.fields.removeByName("consent_version");

  // Revert document protection and resume requirement.
  const photoField = collection.fields.getById("file1542800728");
  photoField.name = "field";
  photoField.protected = false;

  const resumeField = collection.fields.getById("file1623314592");
  resumeField.required = true;
  resumeField.protected = false;

  collection.fields.getById("file3047321096").protected = false;
  collection.fields.getById("file380742408").protected = false;
  collection.fields.getById("file549042166").protected = false;

  return app.save(collection);
});

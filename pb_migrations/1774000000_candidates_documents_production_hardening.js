/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const candidates = app.findCollectionByNameOrId("candidates");
  const documents = app.findCollectionByNameOrId("documents");

  function ensureField(collection, field) {
    const existing = collection.fields.getByName(field.name);
    if (existing) return;
    collection.fields.add(new Field(field));
  }

  ensureField(candidates, {
    type: "bool",
    name: "is_archived",
    required: false,
  });
  ensureField(candidates, {
    type: "date",
    name: "archived_at",
    required: false,
    min: "",
    max: "",
  });
  ensureField(candidates, {
    type: "relation",
    name: "archived_by",
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    minSelect: 0,
    maxSelect: 1,
  });

  const staffWriteRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager' || @request.auth.role = 'staff')";
  const adminDeleteRule = "@request.auth.id != '' && @request.auth.role = 'administrator'";

  candidates.listRule = staffWriteRule;
  candidates.viewRule = staffWriteRule;
  candidates.createRule = staffWriteRule;
  candidates.updateRule = staffWriteRule;
  candidates.deleteRule = adminDeleteRule;

  documents.listRule = staffWriteRule;
  documents.viewRule = staffWriteRule;
  documents.createRule = staffWriteRule;
  documents.updateRule = staffWriteRule;
  documents.deleteRule = adminDeleteRule;

  candidates.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_candidates_archived_updated ON `candidates` (`is_archived`, `updated` DESC)",
    "CREATE INDEX IF NOT EXISTS idx_candidates_status ON `candidates` (`status`)",
    "CREATE INDEX IF NOT EXISTS idx_candidates_last_first ON `candidates` (`last_name`, `first_name`)",
    "CREATE INDEX IF NOT EXISTS idx_candidates_email ON `candidates` (`email`)",
  ];

  documents.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_documents_candidate_doc_type ON `documents` (`candidate`, `doc_type`)",
    "CREATE INDEX IF NOT EXISTS idx_documents_candidate_created ON `documents` (`candidate`, `created` DESC)",
  ];

  app.save(candidates);
  app.save(documents);

  const candidateRecords = app.findAllRecords(candidates) ?? [];
  for (const record of candidateRecords) {
    const rawArchived = record.get("is_archived");
    if (rawArchived === null || rawArchived === undefined || rawArchived === "") {
      record.set("is_archived", false);
      app.save(record);
    }
  }
}, (app) => {
  const candidates = app.findCollectionByNameOrId("candidates");
  const documents = app.findCollectionByNameOrId("documents");

  for (const fieldName of ["is_archived", "archived_at", "archived_by"]) {
    if (candidates.fields.getByName(fieldName)) {
      candidates.fields.removeByName(fieldName);
    }
  }

  const authenticatedRule = "@request.auth.id != ''";
  candidates.listRule = authenticatedRule;
  candidates.viewRule = authenticatedRule;
  candidates.createRule = authenticatedRule;
  candidates.updateRule = authenticatedRule;
  candidates.deleteRule = authenticatedRule;

  documents.listRule = authenticatedRule;
  documents.viewRule = authenticatedRule;
  documents.createRule = authenticatedRule;
  documents.updateRule = authenticatedRule;
  documents.deleteRule = authenticatedRule;

  candidates.indexes = [];
  documents.indexes = [];

  app.save(candidates);
  return app.save(documents);
});

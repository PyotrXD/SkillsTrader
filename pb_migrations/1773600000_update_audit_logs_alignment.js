/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("audit_logs");

  const roleValues = ["administrator", "manager", "staff", "system", "unknown"];
  const actionValues = ["view", "create", "update", "archive", "restore"];

  const labelByCollection = {
    candidates: "Candidate",
    employer: "Employer",
    job_orders: "Job Order",
    placements: "Placement",
    interviews: "Interview",
    documents: "Document",
    positions: "Position",
    users: "User",
    _pb_users_auth_: "User",
    _superusers: "Superuser",
    audit_logs: "Audit Log",
  };

  function normalizeRole(value) {
    if (roleValues.includes(value)) return value;
    return "unknown";
  }

  function normalizeAction(value) {
    if (value === "delete") return "archive";
    if (value === "create" || value === "update") return value;
    if (actionValues.includes(value)) return value;
    return "update";
  }

  function toEntityLabel(collectionName) {
    if (labelByCollection[collectionName]) return labelByCollection[collectionName];
    const normalized = String(collectionName || "unknown")
      .replace(/^_+|_+$/g, "")
      .replace(/_/g, " ")
      .trim();
    if (!normalized) return "Unknown";
    return normalized
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function toStringValue(value, fallback = "") {
    if (value === undefined || value === null) return fallback;
    const str = String(value).trim();
    return str.length > 0 ? str : fallback;
  }

  function toJsonDetails(input) {
    const keys = Object.keys(input).filter((key) => {
      const value = input[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
    if (keys.length === 0) return "";

    const payload = {};
    for (const key of keys) payload[key] = input[key];
    return JSON.stringify(payload);
  }

  function extractChangedFields(record) {
    const raw = record.get("changed_fields");
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  function resolveActor(actorId) {
    if (!actorId) return { email: "unknown", role: "unknown" };

    try {
      const actor = app.findRecordById("_pb_users_auth_", actorId);
      const email = toStringValue(actor.getString("email"), "unknown");
      const role = normalizeRole(toStringValue(actor.getString("role"), "unknown"));
      return { email, role };
    } catch (_) {
      return { email: "unknown", role: "unknown" };
    }
  }

  function ensureTextField(name, required = false) {
    const existing = collection.fields.getByName(name);
    if (existing) {
      existing.type = "text";
      existing.required = required;
      return;
    }
    collection.fields.add(
      new Field({
        type: "text",
        name,
        required,
      })
    );
  }

  function ensureSelectField(name, values, required = false) {
    const existing = collection.fields.getByName(name);
    if (existing) {
      existing.type = "select";
      existing.required = required;
      existing.maxSelect = 1;
      existing.values = values;
      return;
    }
    collection.fields.add(
      new Field({
        type: "select",
        name,
        required,
        maxSelect: 1,
        values,
      })
    );
  }

  function ensureTimestampField() {
    const existing = collection.fields.getByName("timestamp");
    if (existing) {
      existing.type = "autodate";
      existing.required = false;
      existing.onCreate = true;
      existing.onUpdate = false;
      return;
    }
    collection.fields.add(
      new Field({
        type: "autodate",
        name: "timestamp",
        required: false,
        onCreate: true,
        onUpdate: false,
      })
    );
  }

  collection.listRule = "@request.auth.id != '' && @request.auth.role = 'administrator'";
  collection.viewRule = "@request.auth.id != '' && @request.auth.role = 'administrator'";
  collection.createRule = "@request.auth.id != '' && @request.auth.id = ''";
  collection.updateRule = "@request.auth.id != '' && @request.auth.id = ''";
  collection.deleteRule = "@request.auth.id != '' && @request.auth.id = ''";

  ensureTimestampField();
  ensureTextField("actor_email", true);
  ensureSelectField("actor_role", roleValues, true);
  ensureSelectField("action", actionValues, true);
  ensureTextField("entity", true);
  ensureTextField("entity_key", true);
  ensureTextField("entity_name", true);
  ensureTextField("details", false);

  app.save(collection);

  const records = app.findAllRecords(collection) ?? [];
  for (const record of records) {
    if (!record) continue;

    const action = normalizeAction(toStringValue(record.getString("action")));
    const entityKey = toStringValue(record.getString("collection_name"), "unknown");
    const entity = toEntityLabel(entityKey);
    const recordId = toStringValue(record.getString("record_id"), "unknown");
    const actorId = toStringValue(record.getString("actor"));
    const actor = resolveActor(actorId);
    const timestamp = toStringValue(record.getString("created"), new Date().toISOString());
    const details = toJsonDetails({
      record_id: toStringValue(record.getString("record_id")),
      ip: toStringValue(record.getString("ip")),
      user_agent: toStringValue(record.getString("user_agent")),
      request_method: toStringValue(record.getString("request_method")),
      request_url: toStringValue(record.getString("request_url")),
      changed_fields: extractChangedFields(record),
    });

    record.set("timestamp", timestamp);
    record.set("actor_email", actor.email);
    record.set("actor_role", actor.role);
    record.set("action", action);
    record.set("entity", entity);
    record.set("entity_key", entityKey);
    record.set("entity_name", recordId);
    record.set("details", details.length > 0 ? details : null);

    app.save(record);
  }

  for (const fieldName of [
    "actor",
    "collection_name",
    "record_id",
    "ip",
    "user_agent",
    "request_method",
    "request_url",
    "changed_fields",
  ]) {
    if (collection.fields.getByName(fieldName)) {
      collection.fields.removeByName(fieldName);
    }
  }

  collection.indexes = [
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON `audit_logs` (`timestamp` DESC)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON `audit_logs` (`action`)",
    "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_key ON `audit_logs` (`entity_key`)",
  ];

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("audit_logs");

  collection.listRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";
  collection.viewRule =
    "@request.auth.id != '' && (@request.auth.role = 'administrator' || @request.auth.role = 'manager')";
  collection.createRule = "@request.auth.id != '' && @request.auth.id = ''";
  collection.updateRule = "@request.auth.id != '' && @request.auth.id = ''";
  collection.deleteRule = "@request.auth.id != '' && @request.auth.id = ''";

  const actionField = collection.fields.getByName("action");
  if (actionField) {
    actionField.type = "select";
    actionField.required = true;
    actionField.maxSelect = 1;
    actionField.values = ["create", "update", "delete"];
  }

  for (const fieldName of [
    "timestamp",
    "actor_email",
    "actor_role",
    "entity",
    "entity_key",
    "entity_name",
    "details",
  ]) {
    if (collection.fields.getByName(fieldName)) {
      collection.fields.removeByName(fieldName);
    }
  }

  if (!collection.fields.getByName("actor")) {
    collection.fields.add(
      new Field({
        type: "relation",
        name: "actor",
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
      })
    );
  }

  if (!collection.fields.getByName("collection_name")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "collection_name",
        required: true,
      })
    );
  }

  if (!collection.fields.getByName("record_id")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "record_id",
        required: false,
      })
    );
  }

  if (!collection.fields.getByName("ip")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "ip",
        required: false,
      })
    );
  }

  if (!collection.fields.getByName("user_agent")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "user_agent",
        required: false,
      })
    );
  }

  if (!collection.fields.getByName("request_method")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "request_method",
        required: false,
      })
    );
  }

  if (!collection.fields.getByName("request_url")) {
    collection.fields.add(
      new Field({
        type: "text",
        name: "request_url",
        required: false,
      })
    );
  }

  if (!collection.fields.getByName("changed_fields")) {
    collection.fields.add(
      new Field({
        type: "json",
        name: "changed_fields",
        required: false,
      })
    );
  }

  collection.indexes = [];

  return app.save(collection);
});

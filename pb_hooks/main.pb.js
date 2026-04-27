/// <reference path="../pb_data/types.d.ts" />

// When the backend is terminating gracefully, invalidate existing tokens.
// NOTE: We intentionally do NOT rotate tokens on onServe (startup) because doing so
// invalidates active sessions on every restart, causing authenticated users to get
// silent 400 "create rule failure" errors. Token rotation on clean shutdown is enough.
onTerminate((e) => {
  try {
    if (!$app?.isBootstrapped?.()) { e.next(); return; }
    const authCollections = $app.findAllCollections('auth') ?? [];
    for (const collection of authCollections) {
      const records = $app.findAllRecords(collection) ?? [];
      for (const record of records) {
        record.refreshTokenKey();
        $app.save(record);
      }
    }
  } catch (err) {
    console.error('Failed to revoke auth sessions on terminate:', err);
  }
  e.next();
});

onRecordCreateRequest((e) => {
  try {
    const AUDIT_COLLECTION = 'audit_logs';
    const collectionName = e?.collection?.name ?? '';
    if (!collectionName || collectionName === AUDIT_COLLECTION || !$app?.isBootstrapped?.()) {
      e.next();
      return;
    }

    const auditCollection = $app.findCollectionByNameOrId(AUDIT_COLLECTION);
    if (!auditCollection) {
      e.next();
      return;
    }

    const entityLabels = {
      candidates: 'Candidate',
      employer: 'Employer',
      job_orders: 'Job Order',
      placements: 'Placement',
      interviews: 'Interview',
      documents: 'Document',
      positions: 'Position',
      users: 'User',
      _pb_users_auth_: 'User',
      _superusers: 'Superuser',
      audit_logs: 'Audit Log',
    };

    function toStringValue(value, fallback = '') {
      if (value === undefined || value === null) return fallback;
      const str = String(value).trim();
      return str.length > 0 ? str : fallback;
    }

    function toEntityLabel(name) {
      if (entityLabels[name]) return entityLabels[name];
      const normalized = String(name || 'unknown')
        .replace(/^_+|_+$/g, '')
        .replace(/_/g, ' ')
        .trim();
      if (!normalized) return 'Unknown';
      return normalized
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    let entityName = 'unknown';
    const record = e?.record;
    if (record) {
      const candidates = ['full_name', 'company_name', 'title', 'name', 'doc_type', 'email', 'status'];
      for (const fieldName of candidates) {
        try {
          const value = toStringValue(record.get(fieldName));
          if (value) {
            entityName = value;
            break;
          }
        } catch (_) {}
      }
      if (entityName === 'unknown') entityName = toStringValue(record.id, 'unknown');
    }

    let actorEmail = 'unknown';
    let actorRole = 'unknown';
    const auth = e?.auth;
    if (auth) {
      const authCollectionName = toStringValue(auth?.collectionName || auth?.collection?.name);
      const isSuperuser = authCollectionName === '_superusers';

      try {
        actorEmail = toStringValue(auth.getString?.('email'), 'unknown');
      } catch (_) {
        actorEmail = toStringValue(auth?.email, 'unknown');
      }

      let rawRole = '';
      try {
        rawRole = toStringValue(auth.getString?.('role'));
      } catch (_) {
        rawRole = toStringValue(auth?.role);
      }

      if (isSuperuser) actorRole = 'administrator';
      else if (rawRole === 'administrator' || rawRole === 'manager' || rawRole === 'staff') actorRole = rawRole;
      else actorRole = 'unknown';
    }

    const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
    const headers = requestInfo?.headers ?? {};
    const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';
    const body = requestInfo?.body;

    const detailsPayload = {
      record_id: toStringValue(record?.id),
      ip: typeof e?.realIP === 'function' ? toStringValue(e.realIP()) : '',
      user_agent: toStringValue(userAgent),
      request_method: toStringValue(requestInfo?.method),
      request_url: toStringValue(requestInfo?.context),
      changed_fields: body && typeof body === 'object' ? Object.keys(body) : [],
    };

    const detailsKeys = Object.keys(detailsPayload).filter((key) => {
      const value = detailsPayload[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    let details = null;
    if (detailsKeys.length > 0) {
      const compact = {};
      for (const key of detailsKeys) compact[key] = detailsPayload[key];
      details = JSON.stringify(compact);
    }

    const auditRecord = new Record(auditCollection, {
      timestamp: new Date().toISOString(),
      actor_email: actorEmail,
      actor_role: actorRole,
      action: 'create',
      entity: toEntityLabel(collectionName),
      entity_key: collectionName,
      entity_name: entityName,
      details,
    });

    $app.save(auditRecord);
  } catch (err) {
    console.error('Failed to write audit log (create):', err);
  }
  e.next();
});

onRecordUpdateRequest((e) => {
  try {
    const AUDIT_COLLECTION = 'audit_logs';
    const collectionName = e?.collection?.name ?? '';
    if (!collectionName || collectionName === AUDIT_COLLECTION || !$app?.isBootstrapped?.()) {
      e.next();
      return;
    }

    const auditCollection = $app.findCollectionByNameOrId(AUDIT_COLLECTION);
    if (!auditCollection) {
      e.next();
      return;
    }

    const entityLabels = {
      candidates: 'Candidate',
      employer: 'Employer',
      job_orders: 'Job Order',
      placements: 'Placement',
      interviews: 'Interview',
      documents: 'Document',
      positions: 'Position',
      users: 'User',
      _pb_users_auth_: 'User',
      _superusers: 'Superuser',
      audit_logs: 'Audit Log',
    };

    function toStringValue(value, fallback = '') {
      if (value === undefined || value === null) return fallback;
      const str = String(value).trim();
      return str.length > 0 ? str : fallback;
    }

    function toEntityLabel(name) {
      if (entityLabels[name]) return entityLabels[name];
      const normalized = String(name || 'unknown')
        .replace(/^_+|_+$/g, '')
        .replace(/_/g, ' ')
        .trim();
      if (!normalized) return 'Unknown';
      return normalized
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    let entityName = 'unknown';
    const record = e?.record;
    if (record) {
      const candidates = ['full_name', 'company_name', 'title', 'name', 'doc_type', 'email', 'status'];
      for (const fieldName of candidates) {
        try {
          const value = toStringValue(record.get(fieldName));
          if (value) {
            entityName = value;
            break;
          }
        } catch (_) {}
      }
      if (entityName === 'unknown') entityName = toStringValue(record.id, 'unknown');
    }

    let actorEmail = 'unknown';
    let actorRole = 'unknown';
    const auth = e?.auth;
    if (auth) {
      const authCollectionName = toStringValue(auth?.collectionName || auth?.collection?.name);
      const isSuperuser = authCollectionName === '_superusers';

      try {
        actorEmail = toStringValue(auth.getString?.('email'), 'unknown');
      } catch (_) {
        actorEmail = toStringValue(auth?.email, 'unknown');
      }

      let rawRole = '';
      try {
        rawRole = toStringValue(auth.getString?.('role'));
      } catch (_) {
        rawRole = toStringValue(auth?.role);
      }

      if (isSuperuser) actorRole = 'administrator';
      else if (rawRole === 'administrator' || rawRole === 'manager' || rawRole === 'staff') actorRole = rawRole;
      else actorRole = 'unknown';
    }

    const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
    const headers = requestInfo?.headers ?? {};
    const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';
    const body = requestInfo?.body;

    const detailsPayload = {
      record_id: toStringValue(record?.id),
      ip: typeof e?.realIP === 'function' ? toStringValue(e.realIP()) : '',
      user_agent: toStringValue(userAgent),
      request_method: toStringValue(requestInfo?.method),
      request_url: toStringValue(requestInfo?.context),
      changed_fields: body && typeof body === 'object' ? Object.keys(body) : [],
    };

    const detailsKeys = Object.keys(detailsPayload).filter((key) => {
      const value = detailsPayload[key];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    let details = null;
    if (detailsKeys.length > 0) {
      const compact = {};
      for (const key of detailsKeys) compact[key] = detailsPayload[key];
      details = JSON.stringify(compact);
    }

    const auditRecord = new Record(auditCollection, {
      timestamp: new Date().toISOString(),
      actor_email: actorEmail,
      actor_role: actorRole,
      action: 'update',
      entity: toEntityLabel(collectionName),
      entity_key: collectionName,
      entity_name: entityName,
      details,
    });

    $app.save(auditRecord);
  } catch (err) {
    console.error('Failed to write audit log (update):', err);
  }
  e.next();
});

onRecordDeleteRequest((e) => {
  try {
    const AUDIT_COLLECTION = 'audit_logs';
    const collectionName = e?.collection?.name ?? '';
    if (!collectionName || collectionName === AUDIT_COLLECTION || !$app?.isBootstrapped?.()) {
      e.next();
      return;
    }

    const auditCollection = $app.findCollectionByNameOrId(AUDIT_COLLECTION);
    if (!auditCollection) {
      e.next();
      return;
    }

    const entityLabels = {
      candidates: 'Candidate',
      employer: 'Employer',
      job_orders: 'Job Order',
      placements: 'Placement',
      interviews: 'Interview',
      documents: 'Document',
      positions: 'Position',
      users: 'User',
      _pb_users_auth_: 'User',
      _superusers: 'Superuser',
      audit_logs: 'Audit Log',
    };

    function toStringValue(value, fallback = '') {
      if (value === undefined || value === null) return fallback;
      const str = String(value).trim();
      return str.length > 0 ? str : fallback;
    }

    function toEntityLabel(name) {
      if (entityLabels[name]) return entityLabels[name];
      const normalized = String(name || 'unknown')
        .replace(/^_+|_+$/g, '')
        .replace(/_/g, ' ')
        .trim();
      if (!normalized) return 'Unknown';
      return normalized
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }

    let entityName = 'unknown';
    const record = e?.record;
    if (record) {
      const candidates = ['full_name', 'company_name', 'title', 'name', 'doc_type', 'email', 'status'];
      for (const fieldName of candidates) {
        try {
          const value = toStringValue(record.get(fieldName));
          if (value) {
            entityName = value;
            break;
          }
        } catch (_) {}
      }
      if (entityName === 'unknown') entityName = toStringValue(record.id, 'unknown');
    }

    let actorEmail = 'unknown';
    let actorRole = 'unknown';
    const auth = e?.auth;
    if (auth) {
      const authCollectionName = toStringValue(auth?.collectionName || auth?.collection?.name);
      const isSuperuser = authCollectionName === '_superusers';

      try {
        actorEmail = toStringValue(auth.getString?.('email'), 'unknown');
      } catch (_) {
        actorEmail = toStringValue(auth?.email, 'unknown');
      }

      let rawRole = '';
      try {
        rawRole = toStringValue(auth.getString?.('role'));
      } catch (_) {
        rawRole = toStringValue(auth?.role);
      }

      if (isSuperuser) actorRole = 'administrator';
      else if (rawRole === 'administrator' || rawRole === 'manager' || rawRole === 'staff') actorRole = rawRole;
      else actorRole = 'unknown';
    }

    const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
    const headers = requestInfo?.headers ?? {};
    const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';

    const detailsPayload = {
      record_id: toStringValue(record?.id),
      ip: typeof e?.realIP === 'function' ? toStringValue(e.realIP()) : '',
      user_agent: toStringValue(userAgent),
      request_method: toStringValue(requestInfo?.method),
      request_url: toStringValue(requestInfo?.context),
    };

    const detailsKeys = Object.keys(detailsPayload).filter((key) => {
      const value = detailsPayload[key];
      return value !== undefined && value !== null && String(value).trim() !== '';
    });
    let details = null;
    if (detailsKeys.length > 0) {
      const compact = {};
      for (const key of detailsKeys) compact[key] = detailsPayload[key];
      details = JSON.stringify(compact);
    }

    const auditRecord = new Record(auditCollection, {
      timestamp: new Date().toISOString(),
      actor_email: actorEmail,
      actor_role: actorRole,
      action: 'archive',
      entity: toEntityLabel(collectionName),
      entity_key: collectionName,
      entity_name: entityName,
      details,
    });

    $app.save(auditRecord);
  } catch (err) {
    console.error('Failed to write audit log (delete):', err);
  }
  e.next();
});

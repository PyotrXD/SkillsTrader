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
    const collectionName = e?.collection?.name ?? '';
    if (collectionName && collectionName !== 'audit_logs' && $app?.isBootstrapped?.()) {
      const auditCollection = $app.findCollectionByNameOrId('audit_logs');
      if (auditCollection) {
        const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
        const headers = requestInfo?.headers ?? {};
        const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';
        const body = requestInfo?.body;
        const changedFields = (body && typeof body === 'object') ? Object.keys(body) : [];
        const auditRecord = new Record(auditCollection, {
          actor: e?.auth?.id || null,
          action: 'create',
          collection_name: collectionName,
          record_id: e?.record?.id || null,
          ip: typeof e?.realIP === 'function' ? e.realIP() : '',
          user_agent: userAgent,
          request_method: requestInfo?.method ?? '',
          request_url: requestInfo?.context ?? '',
          changed_fields: changedFields,
        });
        $app.save(auditRecord);
      }
    }
  } catch (err) {
    console.error('Failed to write audit log (create):', err);
  }
  e.next();
});

onRecordUpdateRequest((e) => {
  try {
    const collectionName = e?.collection?.name ?? '';
    if (collectionName && collectionName !== 'audit_logs' && $app?.isBootstrapped?.()) {
      const auditCollection = $app.findCollectionByNameOrId('audit_logs');
      if (auditCollection) {
        const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
        const headers = requestInfo?.headers ?? {};
        const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';
        const body = requestInfo?.body;
        const changedFields = (body && typeof body === 'object') ? Object.keys(body) : [];
        const auditRecord = new Record(auditCollection, {
          actor: e?.auth?.id || null,
          action: 'update',
          collection_name: collectionName,
          record_id: e?.record?.id || null,
          ip: typeof e?.realIP === 'function' ? e.realIP() : '',
          user_agent: userAgent,
          request_method: requestInfo?.method ?? '',
          request_url: requestInfo?.context ?? '',
          changed_fields: changedFields,
        });
        $app.save(auditRecord);
      }
    }
  } catch (err) {
    console.error('Failed to write audit log (update):', err);
  }
  e.next();
});

onRecordDeleteRequest((e) => {
  try {
    const collectionName = e?.collection?.name ?? '';
    if (collectionName && collectionName !== 'audit_logs' && $app?.isBootstrapped?.()) {
      const auditCollection = $app.findCollectionByNameOrId('audit_logs');
      if (auditCollection) {
        const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
        const headers = requestInfo?.headers ?? {};
        const userAgent = headers['User-Agent'] ?? headers['user-agent'] ?? '';
        const auditRecord = new Record(auditCollection, {
          actor: e?.auth?.id || null,
          action: 'delete',
          collection_name: collectionName,
          record_id: e?.record?.id || null,
          ip: typeof e?.realIP === 'function' ? e.realIP() : '',
          user_agent: userAgent,
          request_method: requestInfo?.method ?? '',
          request_url: requestInfo?.context ?? '',
          changed_fields: [],
        });
        $app.save(auditRecord);
      }
    }
  } catch (err) {
    console.error('Failed to write audit log (delete):', err);
  }
  e.next();
});

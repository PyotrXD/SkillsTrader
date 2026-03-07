/// <reference path="../pb_data/types.d.ts" />

// When the backend starts (including after an abrupt stop), invalidate existing tokens.
if (typeof onServe === 'function') {
  onServe(() => {
    try {
      if (!$app?.isBootstrapped?.()) return;
      const authCollections = $app.findAllCollections('auth') ?? [];

      for (const collection of authCollections) {
        const records = $app.findAllRecords(collection) ?? [];

        for (const record of records) {
          record.refreshTokenKey();
          $app.save(record);
        }
      }
    } catch (err) {
      console.error('Failed to revoke auth sessions on serve:', err);
    }
  });
}

// When the backend is terminating gracefully, invalidate existing tokens.
if (typeof onTerminate === 'function') {
  onTerminate(() => {
    try {
      if (!$app?.isBootstrapped?.()) return;
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
  });
}

function getHeaderValue(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  return headers[name] ?? headers[name.toLowerCase()] ?? '';
}

function getChangedFields(requestInfo) {
  const body = requestInfo?.body;
  if (!body || typeof body !== 'object') return [];
  try {
    return Object.keys(body);
  } catch {
    return [];
  }
}

function writeAuditLog(e, action) {
  try {
    if (!$app?.isBootstrapped?.()) return;

    const collectionName = e?.collection?.name ?? '';
    if (!collectionName || collectionName === 'audit_logs') return;

    const auditCollection = $app.findCollectionByNameOrId('audit_logs');
    if (!auditCollection) return;

    const requestInfo = typeof e?.requestInfo === 'function' ? e.requestInfo() : undefined;
    const headers = requestInfo?.headers ?? undefined;

    const actorId = e?.auth?.id ?? '';
    const recordId = e?.record?.id ?? '';

    const auditRecord = new Record(auditCollection, {
      actor: actorId || null,
      action,
      collection_name: collectionName,
      record_id: recordId || null,
      ip: typeof e?.realIP === 'function' ? e.realIP() : '',
      user_agent: getHeaderValue(headers, 'User-Agent'),
      request_method: requestInfo?.method ?? '',
      request_url: requestInfo?.context ?? '',
      changed_fields: getChangedFields(requestInfo),
    });

    $app.save(auditRecord);
  } catch (err) {
    console.error(`Failed to write audit log (${action}):`, err);
  }
}

function handleRecordRequest(e, action) {
  try {
    writeAuditLog(e, action);
  } finally {
    // Request hooks must continue the chain explicitly.
    if (typeof e?.next === 'function') {
      e.next();
    }
  }
}

if (typeof onRecordCreateRequest === 'function') {
  onRecordCreateRequest((e) => handleRecordRequest(e, 'create'));
}

if (typeof onRecordUpdateRequest === 'function') {
  onRecordUpdateRequest((e) => handleRecordRequest(e, 'update'));
}

if (typeof onRecordDeleteRequest === 'function') {
  onRecordDeleteRequest((e) => handleRecordRequest(e, 'delete'));
}

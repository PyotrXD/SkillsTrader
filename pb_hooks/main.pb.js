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

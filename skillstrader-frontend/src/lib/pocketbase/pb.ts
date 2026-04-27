import PocketBase from 'pocketbase';

function resolvePocketBaseUrl() {
  const configuredUrl = import.meta.env.VITE_POCKETBASE_URL?.trim();
  if (configuredUrl) return configuredUrl;

  if (typeof window !== 'undefined') {
    if (import.meta.env.PROD) {
      return window.location.origin;
    }

    const devPocketBasePort = import.meta.env.VITE_POCKETBASE_PORT?.trim() || '8091';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${window.location.hostname}:${devPocketBasePort}`;
  }

  return 'http://127.0.0.1:8091';
}

export const pocketBaseUrl = resolvePocketBaseUrl();

export const pb = new PocketBase(pocketBaseUrl);
const FORCE_LOGOUT_AT_KEY = 'skillstrader:forceLogoutAt';

// If PocketBase returns 401 (server-side token invalidated), clear the local auth
// store so App.tsx detects the change and redirects the user to /login.
pb.afterSend = function (response, data) {
  if (response.status === 401) {
    pb.authStore.clear();
  }
  return data;
};

export type UserRole = 'administrator' | 'manager' | 'staff';

type AuthRecordLike = {
  role?: unknown;
  collectionName?: unknown;
} | null | undefined;

function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'administrator' ||
    value === 'manager' ||
    value === 'staff'
  );
}

function isSuperuserRecord(record: AuthRecordLike): boolean {
  return record?.collectionName === '_superusers';
}

export function getUserRole(): UserRole | null {
  const record = pb.authStore.record as AuthRecordLike;
  if (isSuperuserRecord(record)) return 'administrator';

  const role = record?.role;
  return isUserRole(role) ? role : null;
}

export function getAuthCollection(): 'users' | '_superusers' | null {
  const record = pb.authStore.record as AuthRecordLike;
  if (!record?.collectionName) return null;
  return record.collectionName === '_superusers' ? '_superusers' : 'users';
}

export function logout() {
  pb.authStore.clear();
  try {
    localStorage.setItem(FORCE_LOGOUT_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function isPocketBaseAutoCancelledError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return message.includes('autocancel') || message.includes('auto-cancellation');
}

export function getPocketBaseUiError(err: unknown, fallback: string): string | null {
  if (isPocketBaseAutoCancelledError(err)) return null;
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}

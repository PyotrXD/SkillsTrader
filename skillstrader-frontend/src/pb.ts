import PocketBase from 'pocketbase';

export const pocketBaseUrl =
  import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8091';

export const pb = new PocketBase(pocketBaseUrl);
const FORCE_LOGOUT_AT_KEY = 'skillstrader:forceLogoutAt';

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

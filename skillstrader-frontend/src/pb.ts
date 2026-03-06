import PocketBase from 'pocketbase';

export const pocketBaseUrl =
  import.meta.env.VITE_POCKETBASE_URL ?? 'http://127.0.0.1:8090';

export const pb = new PocketBase(pocketBaseUrl);
const FORCE_LOGOUT_AT_KEY = 'skillstrader:forceLogoutAt';

export type UserRole = 'administrator' | 'manager' | 'staff';

function isUserRole(value: unknown): value is UserRole {
  return (
    value === 'administrator' ||
    value === 'manager' ||
    value === 'staff'
  );
}

export function getUserRole(): UserRole | null {
  const role = (pb.authStore.record as { role?: unknown } | null | undefined)?.role;
  return isUserRole(role) ? role : null;
}

export function logout() {
  pb.authStore.clear();
  try {
    localStorage.setItem(FORCE_LOGOUT_AT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

import { useEffect, useRef } from 'react';
import { logout, pb } from '../lib/pocketbase/pb';

const INACTIVITY_LIMIT_MS = 3 * 60 * 60 * 1000; // 3 hours
const ACTIVITY_STORAGE_THROTTLE_MS = 5 * 1000;
const ACTIVITY_HANDLER_THROTTLE_MS = 1000;

const LAST_ACTIVITY_AT_KEY_PREFIX = 'skillstrader:lastActivityAt';
const FORCE_LOGOUT_AT_KEY = 'skillstrader:forceLogoutAt';

function readNumberFromStorage(key: string): number | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function useSessionGuards() {
  const isAuthed = pb.authStore.isValid;
  const lastActivityAtRef = useRef<number>(0);
  const lastActivityStorageWriteAtRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthed) return;

    const userId = (pb.authStore.record as { id?: unknown } | null | undefined)?.id;
    const activityKey =
      typeof userId === 'string' && userId.length > 0
        ? `${LAST_ACTIVITY_AT_KEY_PREFIX}:${userId}`
        : LAST_ACTIVITY_AT_KEY_PREFIX;

    const now = Date.now();
    const storedLastActivity = readNumberFromStorage(activityKey);
    const isStoredLastActivityFresh =
      storedLastActivity !== null && now - storedLastActivity < INACTIVITY_LIMIT_MS;
    const initialLastActivity = isStoredLastActivityFresh ? storedLastActivity! : now;
    lastActivityAtRef.current = initialLastActivity;
    localStorage.setItem(activityKey, String(initialLastActivity));
    lastActivityStorageWriteAtRef.current = now;

    let inactivityTimeoutId: number | null = null;

    const logoutNow = () => {
      logout();
    };

    const scheduleInactivityLogout = () => {
      if (inactivityTimeoutId !== null) window.clearTimeout(inactivityTimeoutId);

      const elapsedMs = Date.now() - lastActivityAtRef.current;
      const remainingMs = INACTIVITY_LIMIT_MS - elapsedMs;

      if (remainingMs <= 0) {
        logoutNow();
        return;
      }

      inactivityTimeoutId = window.setTimeout(() => {
        logoutNow();
      }, remainingMs);
    };

    const markActivity = () => {
      const ts = Date.now();
      if (ts - lastActivityAtRef.current < ACTIVITY_HANDLER_THROTTLE_MS) return;
      lastActivityAtRef.current = ts;

      if (ts - lastActivityStorageWriteAtRef.current >= ACTIVITY_STORAGE_THROTTLE_MS) {
        localStorage.setItem(activityKey, String(ts));
        lastActivityStorageWriteAtRef.current = ts;
      }

      scheduleInactivityLogout();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === FORCE_LOGOUT_AT_KEY && e.newValue) {
        pb.authStore.clear();
        return;
      }

      if (e.key === activityKey && e.newValue) {
        const parsed = Number(e.newValue);
        if (Number.isFinite(parsed)) {
          lastActivityAtRef.current = parsed;
          scheduleInactivityLogout();
        }
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) markActivity();
    };

    const activityListenerOptions: AddEventListenerOptions = { passive: true };

    window.addEventListener('pointerdown', markActivity, activityListenerOptions);
    window.addEventListener('keydown', markActivity, activityListenerOptions);
    window.addEventListener('mousemove', markActivity, activityListenerOptions);
    window.addEventListener('touchstart', markActivity, activityListenerOptions);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityChange);

    scheduleInactivityLogout();

    return () => {
      if (inactivityTimeoutId !== null) window.clearTimeout(inactivityTimeoutId);

      window.removeEventListener('pointerdown', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('mousemove', markActivity);
      window.removeEventListener('touchstart', markActivity);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthed]);
}

export type AuditAction = 'view' | 'create' | 'update' | 'archive' | 'restore';

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: string;
  action: AuditAction;
  entity: string;
  entity_name: string;
  details?: string;
};

const STORAGE_KEY = 'skillstrader:audit_logs';
const MAX_ENTRIES = 500;

let _logs: AuditLogEntry[] = [];
const _listeners = new Set<() => void>();

function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) _logs = JSON.parse(raw) as AuditLogEntry[];
  } catch {
    _logs = [];
  }
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_logs.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

load();

export function addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  const full: AuditLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
  };
  _logs = [full, ..._logs].slice(0, MAX_ENTRIES);
  save();
  _listeners.forEach((fn) => fn());
}

export function getAuditLogs(): AuditLogEntry[] {
  return _logs;
}

export function clearAuditLogs(): void {
  _logs = [];
  save();
  _listeners.forEach((fn) => fn());
}

export function subscribeAuditLog(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

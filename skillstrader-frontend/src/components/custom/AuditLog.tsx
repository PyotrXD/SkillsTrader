import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import {
  type AuditAction,
  type AuditLogEntry,
  clearAuditLogs,
  getAuditLogs,
  subscribeAuditLog,
} from '../../utils/auditLog';
import Searchbar from '../ui/Searchbar';
import Filter from '../ui/Filter';
import Pagination from '../ui/Pagination';
import Modal from '../ui/Modal';

const ACTION_LABELS: Record<AuditAction, string> = {
  view: 'Viewed',
  create: 'Created',
  update: 'Updated',
  archive: 'Archived',
  restore: 'Restored',
};

const ACTION_BADGE: Record<AuditAction, string> = {
  view: 'bg-gray-100 text-gray-600',
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  archive: 'bg-red-100 text-red-700',
  restore: 'bg-purple-100 text-purple-700',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => getAuditLogs());
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  useEffect(() => {
    return subscribeAuditLog(() => setLogs(getAuditLogs()));
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, dateFrom, dateTo, perPage]);

  const entities = Array.from(new Set(logs.map((l) => l.entity))).sort();

  const filtered = logs.filter((l) => {
    const matchSearch =
      !search ||
      l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_name.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase());
    const matchAction = !actionFilter || l.action === actionFilter;
    const matchEntity = !entityFilter || l.entity === entityFilter;
    const matchFrom = !dateFrom || l.timestamp >= dateFrom;
    const matchTo = !dateTo || l.timestamp <= dateTo + 'T23:59:59';
    return matchSearch && matchAction && matchEntity && matchFrom && matchTo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  function handleClear() {
    setIsClearModalOpen(true);
  }

  function confirmClear() {
    clearAuditLogs();
    setLogs([]);
    setIsClearModalOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border border-(--border) rounded-(--radius) shadow-[var(--shadow),var(--inset)] px-4 pt-6 pb-4 md:px-6 md:pt-8 flex flex-col gap-4">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl text-(--text) font-bold">Audit Log</h1>
                <p className="text-(--muted) text-sm font-medium">
                  All recorded user activity across the system.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-2 font-bold text-sm transition hover:bg-red-100"
              >
                <Icon icon="tabler:trash" width="15" height="15" />
                Clear Logs
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="max-w-sm flex-1">
                <Searchbar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by actor, record name…"
                />
              </div>
              <div className="min-w-48">
                <Filter
                  value={actionFilter}
                  onChange={setActionFilter}
                  options={[
                    { value: '', label: 'All Actions' },
                    ...Object.entries(ACTION_LABELS).map(([v, l]) => ({ value: v, label: l })),
                  ]}
                  placeholder="Filter by action"
                />
              </div>
              <div className="min-w-48">
                <Filter
                  value={entityFilter}
                  onChange={setEntityFilter}
                  options={[
                    { value: '', label: 'All Entities' },
                    ...entities.map((e) => ({ value: e, label: e })),
                  ]}
                  placeholder="Filter by entity"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-(--border) rounded-xl px-3 py-2 text-sm text-(--text) bg-white outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                />
                <span className="text-(--muted) text-sm">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-(--border) rounded-xl px-3 py-2 text-sm text-(--text) bg-white outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                />
              </div>
              {(search || actionFilter || entityFilter || dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setActionFilter('');
                    setEntityFilter('');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                >
                  <Icon icon="tabler:x" width="14" height="14" />
                  Clear Filter
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-(--surface2)">
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Timestamp</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Actor</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Role</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Action</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Entity</th>
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-(--muted)">
                        <div className="flex flex-col items-center gap-2">
                          <Icon icon="tabler:clipboard-list" width="44" height="44" className="text-(--muted) mb-1" />
                          <span className="text-base font-semibold">No audit logs found</span>
                          <span className="text-sm">Activity will appear here as users interact with the system.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paged.map((entry, idx) => (
                      <tr
                        key={entry.id}
                        className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-(--muted)">
                          {(page - 1) * perPage + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-(--text) whitespace-nowrap">
                          {formatDate(entry.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-(--text)">
                          {entry.actor_email}
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-(--muted) text-xs font-semibold">
                            {entry.actor_role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-xl text-xs font-semibold ${ACTION_BADGE[entry.action] ?? 'bg-gray-100 text-gray-600'}`}
                          >
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-(--text)">{entry.entity}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{entry.entity_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </section>
        </main>
      </div>

      {/* Pagination */}
      <div className="mt-2 w-full px-5 md:px-6">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={(v) => {
            setPerPage(v);
            setPage(1);
          }}
          perPageOptions={[5, 10, 20, 50]}
        />
      </div>

      {/* Clear All confirm modal */}
      <Modal open={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} title="Clear Audit Logs">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-3">
              <Icon icon="tabler:trash" width="38" height="38" className="text-red-500" />
            </div>
            <p className="text-base font-semibold text-(--text) mb-1">
              Are you sure you want to <span className="text-red-600 font-bold">clear all</span> audit logs?
            </p>
            <p className="text-sm text-(--muted)">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
              onClick={() => setIsClearModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-md shadow-red-200"
              onClick={confirmClear}
            >
              Clear All
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Icon } from '@iconify/react';
import Modal from '../ui/Modal';
import Toast from '../ui/Toast';
import Searchbar from '../ui/Searchbar';
import Pagination from '../ui/Pagination';
import Filter from '../ui/Filter';
import Selection from '../ui/Selection';
import { pb, getUserRole } from '../../lib/pocketbase/pb';

type Placement = {
  id?: string;
  candidate?: string;
  job_order?: string;
  status: 'Pending' | 'Confirmed' | 'Started' | 'Completed' | 'Cancelled';
  departure_date?: string;
  arrival_date?: string;
  placement_date?: string;
  placement_fee_date?: string;
  placement_fee_amount?: number;
};

type CandidateOption = {
  id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
};

type JobOrderOption = {
  id?: string;
  title?: string;
};

type PlacementRecord = {
  id: string;
  candidate: string;
  job_order: string;
  status: 'Pending' | 'Confirmed' | 'Started' | 'Completed' | 'Cancelled';
  departure_date?: string;
  arrival_date?: string;
  placement_date?: string;
  placement_fee_date?: string;
  placement_fee_amount?: number;
  created: string;
  updated: string;
};

type CandidateRecord = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  status?: string;
};

type JobOrderRecord = {
  id: string;
  title?: string;
  description?: string;
};

const initialForm: Placement = {
  candidate: undefined,
  job_order: undefined,
  status: 'Pending',
  departure_date: '',
  arrival_date: '',
  placement_date: '',
  placement_fee_date: '',
  placement_fee_amount: undefined,
};

export default function Placements() {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [form, setForm] = useState<Placement>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPlacement, setEditPlacement] = useState<Placement | null>(null);
  const [viewPlacement, setViewPlacement] = useState<Placement | null>(null);
  const [deletePlacement, setDeletePlacement] = useState<Placement | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrderOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [paged, setPaged] = useState<Placement[]>([]);

  const userRole = useMemo(() => getUserRole() ?? "staff", []);
  const canManage = userRole === "administrator" || userRole === "manager";

  // Fetch candidates and job orders for selection dropdowns
  useEffect(() => {
    async function fetchCandidatesAndJobOrders() {
      try {
        // Fetch all candidates
        const candidatesResult = await pb.collection("candidates").getFullList<CandidateRecord>({
          sort: "last_name",
          requestKey: null,
        });
        
        // Convert to candidate options
        const candidateOptions = candidatesResult.map(c => ({
          id: c.id,
          full_name: c.full_name || `${c.first_name || ''} ${c.middle_name || ''} ${c.last_name || ''}`.trim(),
        }));

        // Fetch all job orders
        const jobOrdersResult = await pb.collection("job_orders").getFullList<JobOrderRecord>({
          sort: "title",
          requestKey: null,
        });

        // Convert to job order options
        const jobOrderOptions = jobOrdersResult.map(j => ({
          id: j.id,
          title: j.title || 'Untitled Job Order'
        }));

        setCandidates(candidateOptions);
        setJobOrders(jobOrderOptions);
      } catch (err) {
        console.error("Failed to fetch candidates or job orders:", err);
      }
    }

    fetchCandidatesAndJobOrders();
  }, []);

  // Fetch placements from PocketBase
  useEffect(() => {
    async function fetchPlacements() {
      setIsLoading(true);
      try {
        const filter = [];
        
        // Apply search filter if needed
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          filter.push(`(candidate.full_name ~ "${q}" || job_order.title ~ "${q}")`);
        }
        
        // Apply status filter if needed
        if (statusFilter) {
          filter.push(`status = "${statusFilter}"`);
        }
        
        const result = await pb.collection("placements").getList<PlacementRecord>(page, perPage, {
          sort: '-created',
          filter: filter.length > 0 ? filter.join(' && ') : undefined,
          expand: 'candidate,job_order',
          requestKey: null,
        });

        // Convert records to placements
        const placementsData = result.items.map(item => ({
          id: item.id,
          candidate: item.candidate,
          job_order: item.job_order,
          status: item.status,
          departure_date: item.departure_date,
          arrival_date: item.arrival_date,
          placement_date: item.placement_date,
          placement_fee_date: item.placement_fee_date,
          placement_fee_amount: item.placement_fee_amount,
        }));

        setPlacements(placementsData);
        setTotalPages(result.totalPages);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch placements:", err);
        setIsLoading(false);
      }
    }

    if (pb.authStore.isValid) {
      fetchPlacements();
    }
  }, [page, perPage, search, statusFilter]);

  const placementStatuses = ['Pending', 'Confirmed', 'Started', 'Completed', 'Cancelled'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return placements.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (!q) return true;
      
      // Find candidate and job order for display
      const candidate = candidates.find((c) => String(c.id) === String(p.candidate));
      const job = jobOrders.find((j) => String(j.id) === String(p.job_order));
      
      return (
        String(candidate?.full_name ?? '').toLowerCase().includes(q) ||
        String(job?.title ?? '').toLowerCase().includes(q)
      );
    });
  }, [placements, search, statusFilter, candidates, jobOrders]);

  useEffect(() => {
    setTotalPages(Math.ceil(filtered.length / perPage) || 1);
    setPaged(filtered.slice((page - 1) * perPage, page * perPage));
  }, [filtered, page, perPage]);

  function showFeedback(type: 'success' | 'error' | 'info', message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  function handleOpenModal() {
    setForm(initialForm);
    setIsModalOpen(true);
    setError('');
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setError('');
  }

  function handleEdit(p: Placement) {
    setEditPlacement(p);
    setForm({ ...(p as Placement) });
    setIsEditModalOpen(true);
    setError('');
  }

  function handleCloseEdit() {
    setIsEditModalOpen(false);
    setEditPlacement(null);
    setForm(initialForm);
    setError('');
  }

  function handleView(p: Placement) {
    setViewPlacement(p);
  }

  function handleCloseView() {
    setViewPlacement(null);
  }

  function handleDelete(p: Placement) {
    setDeletePlacement(p);
    setIsDeleteModalOpen(true);
  }

  function handleCloseDelete() {
    setDeletePlacement(null);
    setIsDeleteModalOpen(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (!form.candidate || !form.job_order) {
        setError('Candidate and Job Order are required');
        return;
      }
      
      const payload = {
        candidate: form.candidate,
        job_order: form.job_order,
        status: form.status,
        departure_date: form.departure_date || null,
        arrival_date: form.arrival_date || null,
        placement_date: form.placement_date || null,
        placement_fee_date: form.placement_fee_date || null,
        placement_fee_amount: form.placement_fee_amount || null,
      };

      const created = await pb.collection("placements").create(payload);
      
      // Add the new placement to the beginning of the list
      setPlacements(prev => [{
        id: created.id,
        candidate: created.candidate,
        job_order: created.job_order,
        status: created.status,
        departure_date: created.departure_date,
        arrival_date: created.arrival_date,
        placement_date: created.placement_date,
        placement_fee_date: created.placement_fee_date,
        placement_fee_amount: created.placement_fee_amount,
      }, ...prev]);
      
      showFeedback('success', 'Placement created');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create placement:', err);
      setError('Failed to create placement');
      showFeedback('error', 'Failed to create placement');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      if (!editPlacement || !editPlacement.id) return;
      
      const payload = {
        candidate: form.candidate,
        job_order: form.job_order,
        status: form.status,
        departure_date: form.departure_date || null,
        arrival_date: form.arrival_date || null,
        placement_date: form.placement_date || null,
        placement_fee_date: form.placement_fee_date || null,
        placement_fee_amount: form.placement_fee_amount || null,
      };

      const updated = await pb.collection("placements").update(editPlacement.id, payload);
      
      // Update the placement in the list
      setPlacements(prev => prev.map(it => 
        it.id === editPlacement.id ? {
          id: updated.id,
          candidate: updated.candidate,
          job_order: updated.job_order,
          status: updated.status,
          departure_date: updated.departure_date,
          arrival_date: updated.arrival_date,
          placement_date: updated.placement_date,
          placement_fee_date: updated.placement_fee_date,
          placement_fee_amount: updated.placement_fee_amount,
        } : it
      ));
      
      showFeedback('success', 'Placement updated');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update placement:', err);
      setError('Failed to update placement');
      showFeedback('error', 'Failed to update placement');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      if (!deletePlacement || !deletePlacement.id) return;
      
      await pb.collection("placements").delete(deletePlacement.id);
      
      // Remove the placement from the list
      setPlacements(prev => prev.filter(it => it.id !== deletePlacement.id));
      
      showFeedback('success', 'Placement deleted');
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Failed to delete placement:', err);
      setError('Failed to delete placement');
      showFeedback('error', 'Failed to delete placement');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <section className="bg-white border border-(--border) rounded-[18px] shadow-[0_14px_44px_rgba(26,23,20,0.08),var(--inset)] p-4.5" aria-label="Placements workspace">
        <div className="grid gap-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl text-(--text) font-bold">Placements</h1>
              <p className="text-(--muted) text-xs font-medium">Manage placed candidates and related details.</p>
            </div>
            <button
              type="button"
              className="ml-auto border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
              onClick={handleOpenModal}
            >
              + New Placement
            </button>
          </div>

          <div className="flex gap-2.5 items-center flex-wrap md:flex-nowrap" aria-label="Search and filters">
            <div className="flex items-center gap-1 w-full md:w-auto">
              <div className="w-full md:w-80">
                <Searchbar
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search candidates or job orders"
                />
              </div>

              <div className="w-44 ml-2 flex-shrink-0">
                <Filter
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  options={[{ value: "", label: "Any status" }, ...placementStatuses.map((s) => ({ value: s, label: s }))]}
                  placeholder="Filter by status"
                />
              </div>

              {(search || statusFilter) && (
                <div className="ml-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('');
                      setPage(1);
                    }}
                    className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-semibold text-xs hover:bg-[var(--accent)]/30 transition-colors"
                  >
                    <Icon icon="tabler:x" width="18" height="18" />
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto mt-5">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="bg-(--surface2)">
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Candidate</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Status</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Job Order</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Departure</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Arrival</th>
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-(--muted)">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="tabler:list" width="44" height="44" className="text-(--muted) mb-1" />
                        <span className="text-base font-semibold">No placements found</span>
                        <span className="text-xs">Try adjusting filters or add a new placement.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((p, idx) => {
                    const candidate = candidates.find((c) => String(c.id) === String(p.candidate));
                    const job = jobOrders.find((j) => String(j.id) === String(p.job_order));
                    return (
                      <tr key={String(p.id)} className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors">
                        <td className="px-4 py-3 text-(--muted)">{(page - 1) * perPage + idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{candidate?.full_name ?? '-'}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{p.status}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{job?.title ?? '-'}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{p.departure_date || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{p.arrival_date || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              title="View"
                              onClick={() => handleView(p)}
                              className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-(--surface2) text-(--text) font-semibold text-xs hover:bg-(--border) transition-colors"
                            >
                              <Icon icon="tabler:eye" width="15" height="15" />
                              View
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => handleEdit(p)}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs hover:bg-blue-200 transition-colors"
                              >
                                <Icon icon="tabler:edit" width="15" height="15" />
                                Edit
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => handleDelete(p)}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-semibold text-xs hover:bg-[var(--accent)]/30 transition-colors"
                              >
                                <Icon icon="tabler:trash" width="15" height="15" />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="mt-2 w-full">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          perPage={perPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>

      {/* Add / Edit modal */}
      <Modal
        open={isModalOpen || isEditModalOpen}
        onClose={isModalOpen ? handleCloseModal : handleCloseEdit}
        title={isModalOpen ? "New Placement" : "Edit Placement"}
      >
        <form onSubmit={isModalOpen ? onSubmit : onEditSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Candidate</span>
            <Selection
              required
              value={String(form.candidate ?? "")}
              onChange={(v) => setForm((prev) => ({ ...prev, candidate: v }))}
              options={[
                { value: "", label: "Select candidate..." },
                ...candidates.map((c) => ({ value: String(c.id), label: c.full_name })),
              ]}
              placeholder="Select candidate..."
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Job order</span>
            <Selection
              required
              value={String(form.job_order ?? "")}
              onChange={(v) => setForm((prev) => ({ ...prev, job_order: v }))}
              options={[
                { value: "", label: "Select job order..." },
                ...jobOrders.map((j) => ({ value: String(j.id), label: j.title })),
              ]}
              placeholder="Select job order..."
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[12px] text-(--muted) font-bold">Status</span>
            <Selection
              required
              value={form.status}
              onChange={(v) => setForm((prev) => ({ ...prev, status: v as Placement['status'] }))}
              options={placementStatuses.map((s) => ({ value: s, label: s }))}
              placeholder="Select status"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span className="text-[12px] text-(--muted) font-bold">Departure date</span>
              <input
                required
                type="date"
                value={form.departure_date ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, departure_date: e.target.value }))}
                className="w-full border border-(--border) rounded-xl px-2.5 py-2.5 focus-visible:ring-2 focus-visible:ring-(--primary)"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-[12px] text-(--muted) font-bold">Arrival date</span>
              <input
                required
                type="date"
                value={form.arrival_date ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, arrival_date: e.target.value }))}
                className="w-full border border-(--border) rounded-xl px-2.5 py-2.5 focus-visible:ring-2 focus-visible:ring-(--primary)"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={isModalOpen ? handleCloseModal : handleCloseEdit}
              className="border border-(--border) bg-(--surface) text-(--text) rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline disabled:opacity-70"
            >
              {isSubmitting ? (isModalOpen ? 'Adding...' : 'Saving...') : (isModalOpen ? 'Add Placement' : 'Save changes')}
            </button>
          </div>
          {error ? <div className="text-[var(--accent)]">{error}</div> : null}
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewPlacement} onClose={handleCloseView} title={viewPlacement ? `Placement details` : ''}>
        {viewPlacement ? (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <dt className="text-xs text-(--muted) font-bold">Candidate</dt>
              <dd className="mt-1 text-sm font-medium">
                {(candidates.find((c) => String(c.id) === String(viewPlacement.candidate))?.full_name) ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-(--muted) font-bold">Status</dt>
              <dd className="mt-1 text-sm font-medium">{viewPlacement.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-(--muted) font-bold">Job order</dt>
              <dd className="mt-1 text-sm font-medium">
                {(jobOrders.find((j) => String(j.id) === String(viewPlacement.job_order))?.title) ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-(--muted) font-bold">Departure date</dt>
              <dd className="mt-1 text-sm font-medium">{viewPlacement.departure_date || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-(--muted) font-bold">Arrival date</dt>
              <dd className="mt-1 text-sm font-medium">{viewPlacement.arrival_date || '-'}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      {/* Delete Modal */}
      <Modal open={isDeleteModalOpen} onClose={handleCloseDelete} title="Delete placement">
        <div className="grid gap-3">
          <p>Are you sure you want to delete this placement?</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseDelete}
              className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeleteSubmit}
              className="border-none text-white bg-linear-to-br from-[var(--accent)] to-[var(--accent)] rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-[0_4px_16px_rgba(220,53,69,0.25)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {showToast && success ? <Toast type={toastType} message={success} onClose={() => setShowToast(false)} /> : null}
    </div>
  );
}

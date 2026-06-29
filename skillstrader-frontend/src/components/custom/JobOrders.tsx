import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Pagination from "../ui/Pagination";
import Filter from "../ui/Filter";
import Selection from "../ui/Selection";
import employersData from "../../data/employers.json";
import jobOrdersData from "../../data/job-orders.json";

type JobOrder = {
  id?: number | string;
  title: string;
  openings: number;
  employer_id?: number | string;
  status: "Open" | "Closed" | "Filled";
  location?: string;
  description?: string;
};

type EmployerOption = {
  id?: number | string;
  company_name?: string;
};

const initialForm: JobOrder = {
  title: "",
  openings: 1,
  employer_id: undefined,
  status: "Open",
  location: "",
  description: "",
};

export default function JobOrders() {
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [form, setForm] = useState<JobOrder>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<JobOrder | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<JobOrder | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [pagedOrders, setPagedOrders] = useState<JobOrder[]>([]);

  useEffect(() => {
    // prefer data file, fallback to empty
    setJobOrders((jobOrdersData as JobOrder[]) || []);
  }, []);

  const employers = (employersData as EmployerOption[]) || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobOrders.filter((j) => {
      if (statusFilter && j.status !== statusFilter) return false;
      if (!q) return true;
      const employer = employers.find((e) => String(e.id) === String(j.employer_id));
      return (
        String(j.title ?? "").toLowerCase().includes(q) ||
        String(j.location ?? "").toLowerCase().includes(q) ||
        String(employer?.company_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobOrders, search, statusFilter, employers]);

  useEffect(() => {
    setTotalPages(Math.ceil(filtered.length / perPage) || 1);
    setPagedOrders(filtered.slice((page - 1) * perPage, page * perPage));
  }, [filtered, page, perPage]);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  function handleOpenModal() {
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
  }
  function handleCloseModal() {
    setIsModalOpen(false);
    setError("");
  }

  function handleEdit(j: JobOrder) {
    setForm({ ...(j as JobOrder) });
    setIsEditModalOpen(true);
    setError("");
  }
  function handleCloseEdit() {
    setIsEditModalOpen(false);
    setError("");
    setForm(initialForm);
  }

  function handleView(j: JobOrder) {
    setViewOrder(j);
  }
  function handleCloseView() {
    setViewOrder(null);
  }

  function handleDelete(j: JobOrder) {
    setDeleteOrder(j);
    setIsDeleteModalOpen(true);
  }
  function handleCloseDelete() {
    setDeleteOrder(null);
    setIsDeleteModalOpen(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (!form.title || !form.title.trim()) {
        setError("Job title is required");
        return;
      }
      setJobOrders((prev) => [{ ...form, id: Date.now() }, ...prev]);
      showFeedback("success", "Job order created");
      setIsModalOpen(false);
    } catch {
      setError("Failed to create job order");
      showFeedback("error", "Failed to create job order");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (!form || !form.id) return;
      setJobOrders((prev) => prev.map((it) => (it.id === form.id ? { ...it, ...form } : it)));
      showFeedback("success", "Job order updated");
      setIsEditModalOpen(false);
    } catch {
      setError("Failed to update");
      showFeedback("error", "Failed to update job order");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      if (!deleteOrder) return;
      setJobOrders((prev) => prev.filter((it) => it.id !== deleteOrder.id));
      showFeedback("success", "Job order deleted");
      setIsDeleteModalOpen(false);
    } catch {
      showFeedback("error", "Failed to delete job order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <section className="bg-white border border-(--border) rounded-[18px] shadow-[0_14px_44px_rgba(26,23,20,0.08),var(--inset)] p-4.5" aria-label="Job orders workspace">
        <div className="grid gap-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl text-(--text) font-bold">Job Orders</h1>
              <p className="text-(--muted) text-sm font-medium">Manage job openings and statuses.</p>
            </div>
            <button type="button" className="ml-auto border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105" onClick={handleOpenModal}>+ Add Job</button>
          </div>

          <div className="flex gap-2.5 items-center flex-wrap md:flex-nowrap" aria-label="Search and filters">
            <div className="flex items-center gap-1 w-full md:w-auto">
              <div className="w-full md:w-80">
                <Searchbar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search job title or employer" />
              </div>

              <div className="w-44 ml-2 flex-shrink-0">
                <Filter value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, { value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }, { value: "Filled", label: "Filled" }]} placeholder="Filter by status" />
              </div>

              {(search || statusFilter) && (
                <div className="ml-2 flex-shrink-0">
                  <button type="button" onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }} className="px-4 py-1.5 flex items-center gap-1 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-semibold text-sm hover:bg-[var(--accent)]/30 transition-colors">
                    <Icon icon="tabler:x" width="18" height="18" />
                    Clear Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto mt-5">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-(--surface2)">
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Job Title</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Openings</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Employer</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Status</th>
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-(--muted)">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="tabler:list" width="44" height="44" className="text-(--muted) mb-1" />
                        <span className="text-base font-semibold">No job orders found</span>
                        <span className="text-sm">Try adjusting filters or add a new job.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedOrders.map((j, idx) => {
                    const employer = employers.find((e) => String(e.id) === String(j.employer_id));
                    return (
                      <tr key={String(j.id)} className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors">
                        <td className="px-4 py-3 text-(--muted)">{(page - 1) * perPage + idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{j.title || ''}</td>
                        <td className="px-4 py-3 font-semibold text-(--text)">{j.openings ?? 0}</td>
                        <td className="px-4 py-3 text-(--text) font-semibold">{employer?.company_name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold ${
                              j.status === 'Open'
                                ? 'bg-[#e3f6e9] text-[#1d9a4a]'
                                : j.status === 'Filled'
                                ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                                : 'bg-[var(--surface2)] text-[var(--muted)]'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button type="button" title="View" aria-label="View" onClick={() => handleView(j)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--navy)] text-white hover:brightness-110 transition-all">
                              <Icon icon="tabler:eye" width="15" height="15" />
                            </button>
                            <button type="button" title="Edit" aria-label="Edit" onClick={() => handleEdit(j)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--navy2)] text-white hover:brightness-110 transition-all">
                              <Icon icon="tabler:edit" width="15" height="15" />
                            </button>
                            <button type="button" title="Delete" aria-label="Delete" onClick={() => handleDelete(j)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors">
                              <Icon icon="tabler:trash" width="15" height="15" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add / Edit modal */}
          <Modal open={isModalOpen || isEditModalOpen} onClose={isModalOpen ? handleCloseModal : handleCloseEdit} title={isModalOpen ? "Add Job" : "Edit Job"}>
            <form onSubmit={isModalOpen ? onSubmit : onEditSubmit} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-[12px] text-(--muted) font-bold">Job title</span>
                <input required placeholder="Enter job title" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Openings</span>
                  <input required type="number" min={1} placeholder="1" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.openings} onChange={(e) => setForm((p) => ({ ...p, openings: Number(e.target.value) }))} />
                </label>

                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Employer</span>
                  <Selection required value={String(form.employer_id ?? "")} onChange={(v) => setForm((p) => ({ ...p, employer_id: v }))} options={[{ value: "", label: "Select employer" }, ...employers.map((e) => ({ value: String(e.id), label: e.company_name }))]} placeholder="Select employer" />
                </label>

                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Status</span>
                  <Selection required value={form.status} onChange={(v) => setForm((p) => ({ ...p, status: v as JobOrder['status'] }))} options={[{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }, { value: "Filled", label: "Filled" }]} placeholder="Select status" />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-[12px] text-(--muted) font-bold">Location</span>
                <input required placeholder="Enter location" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
              </label>

              <label className="grid gap-1">
                <span className="text-[12px] text-(--muted) font-bold">Description</span>
                <textarea required placeholder="Short description" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </label>

              {error ? <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}

              <div className="flex items-center justify-end gap-2 mt-2">
                <button type="button" onClick={isModalOpen ? handleCloseModal : handleCloseEdit} className="border border-(--border) bg-(--surface) text-(--text) rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline">Cancel</button>
                <button type="submit" className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline disabled:opacity-70" disabled={isSubmitting}>{isSubmitting ? (isModalOpen ? 'Adding...' : 'Saving...') : (isModalOpen ? 'Add Job' : 'Save changes')}</button>
              </div>
            </form>
          </Modal>

          {/* View modal */}
          <Modal open={!!viewOrder} onClose={handleCloseView} title="Job details">
            {viewOrder ? (
              <div className="grid gap-3">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Job title</dt>
                    <dd className="m-0 text-(--text)">{viewOrder.title || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Location</dt>
                    <dd className="m-0 text-(--text)">{viewOrder.location || ''}</dd>
                  </div>

                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Status</dt>
                    <dd className="m-0 text-(--text)">{viewOrder.status || ''}</dd>
                  </div>

                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Openings</dt>
                    <dd className="m-0 text-(--text)">{viewOrder.openings}</dd>
                  </div>

                  <div className="md:col-span-2">
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Employer</dt>
                    <dd className="m-0 text-(--text)">{(employers.find((e) => String(e.id) === String(viewOrder.employer_id))?.company_name) ?? ''}</dd>
                  </div>

                  <div className="md:col-span-2">
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Description</dt>
                    <dd className="m-0 text-(--text)">{viewOrder.description || ''}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </Modal>

          {/* Delete modal */}
          <Modal open={isDeleteModalOpen} onClose={handleCloseDelete} title="Delete Job">
            <div className="grid gap-4">
              <p>Are you sure you want to delete <strong>{deleteOrder?.title}</strong>?</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCloseDelete} className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105" disabled={isSubmitting}>Cancel</button>
                <button type="button" onClick={onDeleteSubmit} className="border-none text-white bg-linear-to-br from-[var(--accent)] to-[var(--accent)] rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-[0_4px_16px_rgba(220,53,69,0.25)]" disabled={isSubmitting}>{isSubmitting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </Modal>
        </div>
      </section>

      {/* Pagination — moved below the section for full width */}
      <div className="mt-2 w-full">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} perPage={perPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
      </div>

      {/* Toast */}
      {showToast && success ? <Toast type={toastType} message={success} onClose={() => setShowToast(false)} /> : null}
    </div>
  );
}

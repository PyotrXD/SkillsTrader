import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Pagination from "../ui/Pagination";
import { pb } from "../../lib/pocketbase/pb";

type Employer = {
  id?: string;
  company_name: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  country?: string;
  industry?: string;
  billing_name?: string;
  billing_email?: string;
  billing_phone?: string;
  billing_address?: string;
  payment_terms?: string;
  billing_notes?: string;
};

const initialForm: Employer = {
  company_name: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  country: "",
  industry: "",
  billing_name: "",
  billing_email: "",
  billing_phone: "",
  billing_address: "",
  payment_terms: "",
  billing_notes: "",
};

export default function Employers() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  
  async function fetchEmployers(page = 1, perPage = 50) {
    try {
      const result = await pb.collection('employer').getList(page, perPage, {
        sort: '-created'
      });
      // Convert RecordModel[] to Employer[]
      const employersList = result.items.map(item => ({
        id: String(item.id),
        company_name: item.company_name,
        contact_person: item.contact_person,
        contact_email: item.contact_email,
        contact_phone: item.contact_phone,
        country: item.country,
        industry: item.industry,
        billing_name: item.billing_name,
        billing_email: item.billing_email,
        billing_phone: item.billing_phone,
        billing_address: item.billing_address,
        payment_terms: item.payment_terms,
        billing_notes: item.billing_notes
      }));
      setEmployers(employersList);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to fetch employers:', err);
    }
  }
  const [form, setForm] = useState<Employer>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEmployer, setEditEmployer] = useState<Employer | null>(null);
  const [viewEmployer, setViewEmployer] = useState<Employer | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteEmployer, setDeleteEmployer] = useState<Employer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [pagedEmployers, setPagedEmployers] = useState<Employer[]>([]);

  useEffect(() => {
    fetchEmployers();
  }, []);

  const filtered = useMemo(
    () =>
      employers.filter((e) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          String(e.company_name ?? "").toLowerCase().includes(q) ||
          String(e.contact_person ?? "").toLowerCase().includes(q) ||
          String(e.contact_email ?? "").toLowerCase().includes(q) ||
          String(e.contact_phone ?? "").toLowerCase().includes(q) ||
          String(e.country ?? "").toLowerCase().includes(q) ||
          String(e.industry ?? "").toLowerCase().includes(q)
        );
      }),
    [employers, search],
  );

  useEffect(() => {
    setPagedEmployers(filtered.slice((page - 1) * perPage, page * perPage));
  }, [filtered, page, perPage]);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

function handleOpenModal() {
    // Check if user is authenticated
    if (!pb.authStore.isValid) {
      setError("Please log in to add employers");
      return;
    }
    
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
  }
  function handleCloseModal() {
    setIsModalOpen(false);
    setError("");
  }

  function handleEdit(emp: Employer) {
    setEditEmployer(emp);
    setForm({ ...(emp as Employer) });
    setIsEditModalOpen(true);
    setError("");
  }
  function handleCloseEditModal() {
    setIsEditModalOpen(false);
    setEditEmployer(null);
    setError("");
  }

  function handleView(emp: Employer) {
    setViewEmployer(emp);
  }
  function handleCloseViewModal() {
    setViewEmployer(null);
  }

  function handleDelete(emp: Employer) {
    setDeleteEmployer(emp);
    setIsDeleteModalOpen(true);
  }
  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteEmployer(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (!form.company_name || !form.company_name.trim()) {
        setError("Company name is required");
        return;
      }
      
      console.log("Sending form data to PocketBase:", form);
      const newEmployer = await pb.collection('employer').create(form);
      console.log("Created employer:", newEmployer);
      // Convert RecordModel to Employer before adding to state
      const employer: Employer = {
        id: String(newEmployer.id),
        company_name: newEmployer.company_name,
        contact_person: newEmployer.contact_person,
        contact_email: newEmployer.contact_email,
        contact_phone: newEmployer.contact_phone,
        country: newEmployer.country,
        industry: newEmployer.industry,
        billing_name: newEmployer.billing_name,
        billing_email: newEmployer.billing_email,
        billing_phone: newEmployer.billing_phone,
        billing_address: newEmployer.billing_address,
        payment_terms: newEmployer.payment_terms,
        billing_notes: newEmployer.billing_notes
      };
      setEmployers(prev => [employer, ...prev]);
      showFeedback("success", "Employer created");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error creating employer:", err);
      // Enhanced error handling to provide more specific feedback
      let errorMessage = "Failed to create employer";
      if (err.status === 400) {
        errorMessage = "Validation failed. Please check all required fields.";
      } else if (err.status === 401) {
        errorMessage = "Authentication required. Please log in.";
      } else if (err.status === 403) {
        errorMessage = "Access denied. Insufficient permissions.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      showFeedback("error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      if (!editEmployer || !editEmployer.id) return;
      
      const updatedEmployer = await pb.collection('employer').update(editEmployer.id, form);
      // Convert RecordModel to Employer before updating state
      const employer: Employer = {
        id: String(updatedEmployer.id),
        company_name: updatedEmployer.company_name,
        contact_person: updatedEmployer.contact_person,
        contact_email: updatedEmployer.contact_email,
        contact_phone: updatedEmployer.contact_phone,
        country: updatedEmployer.country,
        industry: updatedEmployer.industry,
        billing_name: updatedEmployer.billing_name,
        billing_email: updatedEmployer.billing_email,
        billing_phone: updatedEmployer.billing_phone,
        billing_address: updatedEmployer.billing_address,
        payment_terms: updatedEmployer.payment_terms,
        billing_notes: updatedEmployer.billing_notes
      };
      setEmployers(prev => prev.map((it) => (it.id === editEmployer.id ? employer : it)));
      showFeedback("success", "Employer updated");
      setIsEditModalOpen(false);
    } catch (err) {
      setError("Failed to update");
      showFeedback("error", "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      if (!deleteEmployer || !deleteEmployer.id) return;
      
      await pb.collection('employer').delete(deleteEmployer.id);
      setEmployers(prev => prev.filter((it) => it.id !== deleteEmployer.id));
      showFeedback("success", "Employer deleted");
      setIsDeleteModalOpen(false);
    } catch (err) {
      showFeedback("error", "Failed to delete employer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <section className="bg-white border border-(--border) rounded-[18px] shadow-[0_14px_44px_rgba(26,23,20,0.08),var(--inset)] p-4.5" aria-label="Employers workspace">
        <div className="grid gap-3.5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl text-(--text) font-bold">Employers</h1>
              <p className="text-(--muted) text-sm font-medium">Manage employer records.</p>
            </div>
            <button
              type="button"
              className="ml-auto border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
              onClick={handleOpenModal}
            >
              + Add Employer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center" aria-label="Search and actions">
              <div className="flex items-center gap-2 w-full">
                <div className="max-w-sm flex-1">
                  <Searchbar value={search} onChange={(v) => { setSearch(v); setPage(1); fetchEmployers(1, perPage); }} placeholder="Search employers..." />
                </div>

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="px-4 py-1.5 flex items-center gap-1 rounded-full bg-(--accent)/20 text-(--accent) font-semibold text-sm hover:bg-(--accent)/30 transition-colors"
                >
                  <Icon icon="tabler:x" width="18" height="18" />
                  Clear Filter
                </button>
              )}
            </div>

            <div />
            <div />

            <div />
          </div>

          <div className="overflow-x-auto mt-5">
            <table className="min-w-full text-sm text-left">
              <thead>
                <tr className="bg-(--surface2)">
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Company Name</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Contact Person</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Contact Email</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Contact Phone</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Country</th>
                  <th className="px-4 py-3 font-bold text-(--muted)">Industry</th>
                  <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedEmployers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-(--muted)">
                      <div className="flex flex-col items-center gap-2">
                        <Icon icon="tabler:building" width="44" height="44" className="text-(--muted) mb-1" />
                        <span className="text-base font-semibold">No employers found</span>
                        <span className="text-sm">Try adjusting your search or add a new employer.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedEmployers.map((emp, idx) => (
                    <tr key={emp.id} className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors">
                      <td className="px-4 py-3 text-(--muted)">{(page - 1) * perPage + idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-(--text)">{emp.company_name || ""}</td>
                      <td className="px-4 py-3 text-(--text) font-semibold">{emp.contact_person || ""}</td>
                      <td className="px-4 py-3 text-(--text) font-semibold">{emp.contact_email || ""}</td>
                      <td className="px-4 py-3 text-(--text) font-semibold">{emp.contact_phone || ""}</td>
                      <td className="px-4 py-3 text-(--text) font-semibold">{emp.country || ""}</td>
                      <td className="px-4 py-3 text-(--text) font-semibold">{emp.industry || ""}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button type="button" title="View" onClick={() => handleView(emp)} className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-(--surface2) text-(--text) font-semibold text-xs hover:bg-(--border) transition-colors">
                            <Icon icon="tabler:eye" width="15" height="15" />
                            View
                          </button>
                          <button type="button" title="Edit" onClick={() => handleEdit(emp)} className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs hover:bg-blue-200 transition-colors">
                            <Icon icon="tabler:edit" width="15" height="15" />
                            Edit
                          </button>
                          <button type="button" title="Delete" onClick={() => handleDelete(emp)} className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-(--accent)/20 text-(--accent) font-semibold text-xs hover:bg-(--accent)/30 transition-colors">
                            <Icon icon="tabler:trash" width="15" height="15" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add / Edit modal */}
          <Modal open={isModalOpen || isEditModalOpen} onClose={isModalOpen ? handleCloseModal : handleCloseEditModal} title={isModalOpen ? "Add Employer" : "Edit Employer"}>
            <form onSubmit={isModalOpen ? onSubmit : onEditSubmit} className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-[12px] text-(--muted) font-bold">Company name</span>
                <input placeholder="Enter company name" required className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
              </label>
              <label className="grid gap-1">
                <span className="text-[12px] text-(--muted) font-bold">Contact person</span>
                <input required placeholder="Enter contact person" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.contact_person} onChange={(e) => setForm((p) => ({ ...p, contact_person: e.target.value }))} />
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Contact email</span>
                  <input required placeholder="Enter contact email" type="email" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.contact_email} onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))} />
                </label>
                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Contact phone</span>
                  <input required placeholder="Enter contact phone" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.contact_phone} onChange={(e) => setForm((p) => ({ ...p, contact_phone: e.target.value }))} />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Country</span>
                  <input required placeholder="Enter country" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                </label>
                <label className="grid gap-1">
                  <span className="text-[12px] text-(--muted) font-bold">Industry</span>
                  <input required placeholder="Enter industry" className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
                </label>
              </div>

              {error ? <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}

              <div className="flex items-center justify-end gap-2 mt-2">
                <button type="button" onClick={isModalOpen ? handleCloseModal : handleCloseEditModal} className="border border-(--border) bg-(--surface) text-(--text) rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline">Cancel</button>
                <button type="submit" className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) shadow-[0_8px_26px_rgba(200,75,49,0.18)] rounded-full px-3.5 py-2.5 text-[13px] font-bold cursor-pointer transition-all duration-150 hover:brightness-105 hover:scale-105 active:translate-y-px active:filter-none inline-flex items-center justify-center no-underline disabled:opacity-70" disabled={isSubmitting}>{isSubmitting ? (isModalOpen ? 'Adding...' : 'Saving...') : (isModalOpen ? 'Add Employer' : 'Save changes')}</button>
              </div>
            </form>
          </Modal>

          {/* View modal */}
          <Modal open={!!viewEmployer} onClose={handleCloseViewModal} title="Employer details">
            {viewEmployer ? (
              <div className="grid gap-3">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="md:col-span-2">
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Company name</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.company_name || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Contact person</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.contact_person || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Contact email</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.contact_email || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Contact phone</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.contact_phone || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Country</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.country || ''}</dd>
                  </div>
                  <div>
                    <dt className="text-[12px] text-(--muted) font-bold mb-1">Industry</dt>
                    <dd className="m-0 text-(--text)">{viewEmployer.industry || ''}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </Modal>

          {/* Delete modal */}
          <Modal open={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Delete Employer">
            <div className="grid gap-4">
              <p>Are you sure you want to delete <strong>{deleteEmployer?.company_name}</strong>?</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={handleCloseDeleteModal} className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105" disabled={isSubmitting}>Cancel</button>
                <button type="button" onClick={onDeleteSubmit} className="border-none text-white bg-linear-to-br from-(--accent) to-(--accent) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-[0_4px_16px_rgba(220,53,69,0.25)]" disabled={isSubmitting}>{isSubmitting ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </Modal>
        </div>
      </section>

      {/* Pagination — moved below the section for full width */}
      <div className="mt-2 w-full">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(newPage) => {
            setPage(newPage);
            fetchEmployers(newPage, perPage);
          }}
          perPage={perPage}
          onPerPageChange={(v) => { 
            setPerPage(v); 
            setPage(1);
            fetchEmployers(1, v);
          }}
        />
      </div>

      {/* Toast */}
      {showToast && success ? <Toast type={toastType} message={success} onClose={() => setShowToast(false)} /> : null}
    </div>
  );
}

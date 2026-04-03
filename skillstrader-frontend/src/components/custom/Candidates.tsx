import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Filter from "../ui/Filter";
import Selection from "../ui/Selection";
import Pagination from "../ui/Pagination";
import candidatesData from "../../data/candidates.json";

type CandidateForm = {
  id?: number | string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  education: string;
  work_history: string;
  skills: string;
  certifications: string;
  desired_salary: string;
  status: string;
  consent_given: boolean;
  consent_at: string;
  consent_source: string;
  consent_version: string;
  action_required?: string[];
};

const candidateStatuses = [
  "Applied",
  "Screening",
  "Screened",
  "For Interview",
  "Interviewed",
  "For Placement",
  "Placed",
  "Rejected",
];

const initialForm: CandidateForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  education: "",
  work_history: "",
  skills: "",
  certifications: "",
  desired_salary: "",
  status: "Applied",
  consent_given: false,
  consent_at: "",
  consent_source: "",
  consent_version: "",
  action_required: [],
};

function getCandidateFlags(c: CandidateForm): string[] {
  const flags: string[] = [];
  if (["Applied", "Screening", "Screened"].includes(c.status))
    flags.push("Not Interviewed");
  if (c.status === "For Interview") flags.push("Not Scheduled");
  if (!c.consent_given) flags.push("Docs Missing");
  return flags;
}

export default function Candidates() {
  // State
  const [candidates, setCandidates] = useState<CandidateForm[]>([]);
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<CandidateForm | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateForm | null>(
    null,
  );
  const [viewCandidate, setViewCandidate] = useState<CandidateForm | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "success",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [pagedCandidates, setPagedCandidates] = useState<CandidateForm[]>([]);

  // Fetch candidates from local JSON
  useEffect(() => {
    setCandidates(candidatesData as CandidateForm[]);
  }, []);

  // Filtered candidates (memoized)
  const filtered = useMemo(
    () =>
      candidates.filter((c) => {
        const matchesSearch =
          c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.email?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter ? c.status === statusFilter : true;
        const matchesDateFrom = dateFrom ? c.consent_at >= dateFrom : true;
        const matchesDateTo = dateTo ? c.consent_at <= dateTo : true;
        const flags = getCandidateFlags(c);
        const matchesQuick =
          quickFilter === "not-interviewed"
            ? flags.includes("Not Interviewed")
            : quickFilter === "not-scheduled"
              ? flags.includes("Not Scheduled")
              : quickFilter === "missing-docs"
                ? flags.includes("Docs Missing")
                : true;
        return (
          matchesSearch &&
          matchesStatus &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesQuick
        );
      }),
    [candidates, search, statusFilter, dateFrom, dateTo, quickFilter],
  );

  // Pagination
  useEffect(() => {
    setTotalPages(Math.ceil(filtered.length / perPage) || 1);
    setPagedCandidates(filtered.slice((page - 1) * perPage, page * perPage));
  }, [filtered, page, perPage]);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  // Handlers
  function handleOpenModal() {
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
  }
  function handleCloseModal() {
    setIsModalOpen(false);
    setError("");
  }
  function handleEdit(candidate: CandidateForm) {
    setEditCandidate(candidate);
    setForm({ ...candidate, action_required: candidate.action_required ?? getCandidateFlags(candidate) });
    setIsEditModalOpen(true);
    setError("");
  }
  function handleCloseEditModal() {
    setIsEditModalOpen(false);
    setEditCandidate(null);
    setError("");
  }
  function handleDelete(candidate: CandidateForm) {
    setDeleteCandidate(candidate);
    setIsDeleteModalOpen(true);
  }
  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false);
    setDeleteCandidate(null);
  }
  function handleView(candidate: CandidateForm) {
    setViewCandidate(candidate);
  }
  function handleCloseViewModal() {
    setViewCandidate(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      // TODO: PB create
      setCandidates((prev) => [{ ...form, id: Date.now() }, ...prev]);
      showFeedback("success", "Candidate added successfully.");
      setIsModalOpen(false);
    } catch {
      setError("Failed to add candidate.");
      showFeedback("error", "Failed to add candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }
  async function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      // TODO: PB update
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === editCandidate?.id ? { ...form, id: c.id } : c,
        ),
      );
      showFeedback("success", "Candidate updated successfully.");
      setIsEditModalOpen(false);
    } catch {
      setError("Failed to update candidate.");
      showFeedback("error", "Failed to update candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }
  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      // TODO: PB delete
      setCandidates((prev) => prev.filter((c) => c.id !== deleteCandidate?.id));
      showFeedback("success", "Candidate deleted successfully.");
      setIsDeleteModalOpen(false);
    } catch {
      showFeedback("error", "Failed to delete candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render
  const statusBadge: Record<string, string> = {
    Applied: "bg-gray-100 text-gray-700",
    Screening: "bg-yellow-100 text-yellow-800",
    Screened: "bg-amber-100 text-amber-800",
    "For Interview": "bg-blue-100 text-blue-800",
    Interviewed: "bg-indigo-100 text-indigo-800",
    "For Placement": "bg-purple-100 text-purple-800",
    Placed: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };
  const flagBadge: Record<string, string> = {
    "Not Interviewed": "bg-orange-100 text-orange-800",
    "Not Scheduled": "bg-sky-100 text-sky-800",
    "Docs Missing": "bg-red-100 text-red-800",
  };
  const quickFilters = [
    { key: "not-interviewed", label: "Not Interviewed" },
    { key: "not-scheduled", label: "Not Scheduled" },
    { key: "missing-docs", label: "Missing Docs" },
  ];
  const availableFlags = ["Not Interviewed", "Not Scheduled", "Docs Missing"];
  const formFlags = form.action_required && form.action_required.length ? form.action_required : getCandidateFlags(form);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border border-(--border) rounded-(--radius) shadow-[var(--shadow),var(--inset)] px-4 pt-6 pb-2 md:px-6 md:pt-8 md:pb-3 flex flex-col gap-4">
            {showToast && success && (
              <Toast
                type={toastType}
                message={success}
                onClose={() => setShowToast(false)}
              />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl text-(--text) font-bold">Candidates</h1>
                <p className="text-(--muted) text-sm font-medium">
                  Manage candidate records and status.
                </p>
              </div>
              <button
                className="ml-auto border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                onClick={handleOpenModal}
              >
                + Add Candidate
              </button>
            </div>

            {/* Search, Status Filter, Date Range */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="max-w-sm flex-1">
                <Searchbar
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or email"
                />
              </div>
              <div className="min-w-45">
                <Filter
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "", label: "All Statuses" },
                    ...candidateStatuses.map((s) => ({ value: s, label: s })),
                  ]}
                  placeholder="Filter by status"
                />
              </div>
              {/* <label className="grid gap-1 min-w-35">
                <span className="text-xs font-bold text-(--muted)">
                  Start date
                </span>
                <input
                  type="date"
                  className="border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="grid gap-1 min-w-35">
                <span className="text-xs font-bold text-(--muted)">
                  End date
                </span>
                <input
                  type="date"
                  className="border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </label> */}
            </div>

            {/* Quick filter pills */}
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((qf) => (
                <button
                  key={qf.key}
                  type="button"
                  onClick={() => {
                    setQuickFilter((prev) => (prev === qf.key ? "" : qf.key));
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-150 ${
                    quickFilter === qf.key
                      ? "bg-(--primary) text-white border-(--primary) shadow"
                      : "bg-white text-(--text) border-(--border) hover:bg-(--surface2)"
                  }`}
                >
                  {qf.label}
                </button>
              ))}
              {(quickFilter ||
                statusFilter ||
                dateFrom ||
                dateTo ||
                search) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuickFilter("");
                    setStatusFilter("");
                    setDateFrom("");
                    setDateTo("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="px-4 py-1.5 flex items-center gap-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                >
                  <Icon icon="tabler:x" width="15" height="15" />
                  Clear all
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-(--surface2)">
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">
                      #
                    </th>
                    <th className="px-4 py-3 font-bold text-(--muted)">
                      Full Name
                    </th>
                    <th className="px-4 py-3 font-bold text-(--muted)">
                      Phone Number
                    </th>
                    <th className="px-4 py-3 font-bold text-(--muted)">
                      Status
                    </th>
                    <th className="px-4 py-3 font-bold text-(--muted)">
                      Action Required
                    </th>
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCandidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-14 text-center text-(--muted)"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Icon
                            icon="tabler:user-off"
                            width="44"
                            height="44"
                            className="text-(--muted) mb-1"
                          />
                          <span className="text-base font-semibold">
                            No candidates found
                          </span>
                          <span className="text-sm">
                            Try adjusting your filters or add a new candidate.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedCandidates.map((c, idx) => {
                      const flags = Array.isArray(c.action_required) && c.action_required.length ? c.action_required : getCandidateFlags(c);
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors"
                        >
                          <td className="px-4 py-3 text-(--muted)">
                            {(page - 1) * perPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-(--text)">
                            {c.full_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-(--text) font-semibold  ">
                            {c.phone || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusBadge[c.status] ?? "bg-gray-100 text-gray-700"}`}
                            >
                              {c.status}
                            </span>
                          </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(flags) && flags.length > 0) ? (
                                    flags.map((flag) => (
                                      <span
                                        key={flag}
                                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${flagBadge[flag]}`}
                                      >
                                        {flag}
                                      </span>
                                    ))
                                  ) : null}
                                </div>
                              </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                title="View"
                                onClick={() => handleView(c)}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-(--surface2) text-(--text) font-semibold text-xs hover:bg-(--border) transition-colors"
                              >
                                <Icon
                                  icon="tabler:eye"
                                  width="15"
                                  height="15"
                                />
                                View
                              </button>
                              <button
                                type="button"
                                title="Edit"
                                onClick={() => handleEdit(c)}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs hover:bg-blue-200 transition-colors"
                              >
                                <Icon
                                  icon="tabler:edit"
                                  width="15"
                                  height="15"
                                />
                                Edit
                              </button>
                              <button
                                type="button"
                                title="Delete"
                                onClick={() => handleDelete(c)}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-full bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                              >
                                <Icon
                                  icon="tabler:trash"
                                  width="15"
                                  height="15"
                                />
                                Delete
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

            {/* View Modal */}
            <Modal
              open={!!viewCandidate}
              onClose={handleCloseViewModal}
              title="Candidate Details"
            >
              {viewCandidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-(--muted)">Action Required</span>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(viewCandidate.action_required) && viewCandidate.action_required.length ? viewCandidate.action_required : getCandidateFlags(viewCandidate)).length === 0 ? null : (
                        (Array.isArray(viewCandidate.action_required) && viewCandidate.action_required.length ? viewCandidate.action_required : getCandidateFlags(viewCandidate)).map((flag) => (
                          <span key={flag} className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${flagBadge[flag]}`}>
                            {flag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  {(
                    [
                      ["Full Name", viewCandidate.full_name],
                      ["Email", viewCandidate.email],
                      ["Phone", viewCandidate.phone],
                      ["Address", viewCandidate.address],
                      ["Status", viewCandidate.status],
                      ["Desired Salary", viewCandidate.desired_salary],
                      ["Skills", viewCandidate.skills],
                      ["Education", viewCandidate.education],
                      ["Work History", viewCandidate.work_history],
                      ["Certifications", viewCandidate.certifications],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-(--muted)">
                        {label}
                      </span>
                      <span className="text-(--text) font-medium">
                        {value || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Modal>

            {/* Add / Edit Modal */}
            <Modal
              open={isModalOpen || isEditModalOpen}
              onClose={isModalOpen ? handleCloseModal : handleCloseEditModal}
              title={isModalOpen ? "Add Candidate" : "Edit Candidate"}
            >
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-2.5"
                onSubmit={isModalOpen ? onSubmit : onEditSubmit}
              >
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Full Name</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="Full name"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Email</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="Email"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Phone</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="Phone"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Address</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Address"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Education</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.education}
                    onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
                    placeholder="Education"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Work History</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.work_history}
                    onChange={(e) => setForm((f) => ({ ...f, work_history: e.target.value }))}
                    placeholder="Work history"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Skills</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.skills}
                    onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                    placeholder="Skills"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Certifications</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.certifications}
                    onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
                    placeholder="Certifications"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Desired Salary</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.desired_salary}
                    onChange={(e) => setForm((f) => ({ ...f, desired_salary: e.target.value }))}
                    placeholder="Desired salary"
                    required
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Status</span>
                  <Selection
                    value={form.status}
                    onChange={(val) => setForm((f) => ({ ...f, status: val }))}
                    options={candidateStatuses.map((s) => ({ value: s, label: s }))}
                    placeholder="Select status"
                    required
                  />
                </label>
                {/* <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Consent Given</span>
                  <Selection
                    value={form.consent_given ? "yes" : "no"}
                    onChange={(val) => setForm((f) => ({ ...f, consent_given: val === "yes" }))}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "no", label: "No" },
                    ]}
                    placeholder="Consent given?"
                  />
                </label>
                <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Consent Date</span>
                  <input
                    type="date"
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.consent_at}
                    onChange={(e) => setForm((f) => ({ ...f, consent_at: e.target.value }))}
                  />
                </label> */}
                {/* <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Consent Source</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.consent_source}
                    onChange={(e) => setForm((f) => ({ ...f, consent_source: e.target.value }))}
                    placeholder="Consent source"
                  />
                </label> */}
                {/* <label className="grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Consent Version</span>
                  <input
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-2.75 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
                    value={form.consent_version}
                    onChange={(e) => setForm((f) => ({ ...f, consent_version: e.target.value }))}
                    placeholder="Consent version"
                  />
                </label> */}
                <label className="col-span-2 grid gap-1.25">
                  <span className="text-sm text-(--muted) font-bold">Action Required</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {availableFlags.map((flag) => (
                      <label key={flag} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!form.action_required?.includes(flag)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((prev) => {
                              const current = prev.action_required ?? [];
                              const next = checked
                                ? Array.from(new Set([...current, flag]))
                                : current.filter((f) => f !== flag);
                              return { ...prev, action_required: next };
                            });
                          }}
                          className="w-4 h-4"
                        />
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${flagBadge[flag]}`}>
                          {flag}
                        </span>
                      </label>
                    ))}
                    {/* no placeholder when no flags selected */}
                  </div>
                </label>
                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={
                      isModalOpen ? handleCloseModal : handleCloseEditModal
                    }
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? isModalOpen
                        ? "Creating..."
                        : "Saving..."
                      : isModalOpen
                        ? "Add Candidate"
                        : "Save Changes"}
                  </button>
                </div>
                {error && (
                  <p className="col-span-2 mt-3 text-[#9f2d20] text-sm">
                    {error}
                  </p>
                )}
              </form>
            </Modal>

            {/* Delete Modal */}
            <Modal open={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Delete Candidate">
              <form onSubmit={e => { e.preventDefault(); onDeleteSubmit(); }} className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-full flex flex-col items-center justify-center mb-2">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                      <Icon icon="tabler:alert-triangle" width="38" height="38" className="text-red-500" />
                    </div>
                  </div>
                  <p className="text-base font-semibold text-(--text) mb-1">
                    Are you sure you want to <span className="text-red-600 font-bold">delete</span> this candidate?
                  </p>
                  <p className="text-sm text-(--muted)">
                    <span className="font-bold">{deleteCandidate?.full_name}</span> ({deleteCandidate?.email})
                  </p>
                  {/* Action Required removed from Delete modal (only in Add/Edit) */}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-full px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={handleCloseDeleteModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-full px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-md shadow-red-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Deleting..." : "Delete"}
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-[#9f2d20] text-sm text-center">{error}</p>
                )}
              </form>
            </Modal>
          </section>

          {/* Pagination — moved below the section for full width */}
          <div className="mt-2 w-full">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              perPage={perPage}
              onPerPageChange={(v) => {
                setPerPage(v);
                setPage(1);
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

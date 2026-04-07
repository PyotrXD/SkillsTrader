import { useState, useEffect, useMemo, useRef } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Filter from "../ui/Filter";
import Selection from "../ui/Selection";
import Pagination from "../ui/Pagination";
import defaultProfile from "../../assets/images/default-profile.png";
import { generateResumeHtml } from './resumeTemplate';
import { getUserRole, pb } from '../../lib/pocketbase/pb';
import { addAuditLog } from '../../utils/auditLog';

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
  profile_photo?: File | string | null;
  documents?: Record<string, string | File | null>;
};

type ArchivedCandidate = CandidateForm & { archived_at?: string; archived_by?: string };

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
  profile_photo: null,
  documents: {},
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

  // Fetch candidates from PocketBase
  useEffect(() => {
    async function fetchCandidates() {
      try {
        const [items, token] = await Promise.all([
          pb.collection('candidates').getFullList<Record<string, any>>({ sort: '-created' }),
          pb.files.getToken(),
        ]);
        setCandidates(
          items.map((item) => ({
            id: item.id,
            full_name: item.full_name ?? '',
            email: item.email ?? '',
            phone: item.phone ?? '',
            address: item.address ?? '',
            education: item.education ?? '',
            work_history: item.work_history ?? '',
            skills: item.skills ?? '',
            certifications: item.certifications ?? '',
            desired_salary: item.desired_salary ?? '',
            status: item.status ?? 'Applied',
            consent_given: item.consent_given ?? false,
            consent_at: item.consent_at ?? '',
            consent_source: item.consent_source ?? '',
            consent_version: item.consent_version ?? '',
            action_required: [],
            profile_photo: item.photo
              ? pb.files.getURL(item, item.photo, { token })
              : null,
            documents: {
              resume: item.resume ? pb.files.getURL(item, item.resume, { token }) : null,
              passport: item.passport ? pb.files.getURL(item, item.passport, { token }) : null,
              visa: item.visa ? pb.files.getURL(item, item.visa, { token }) : null,
            },
          }))
        );
      } catch {
        setCandidates([]);
      }
    }
    fetchCandidates();
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
    setActiveTab('info');
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
    setActiveTab('info');
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
    setViewTab('info');
    addAuditLog({
      actor_email: pb.authStore.record?.email ?? 'unknown',
      actor_role: getUserRole() ?? 'staff',
      action: 'view',
      entity: 'Candidate',
      entity_name: candidate.full_name || String(candidate.id ?? '—'),
    });
  }
  function handleCloseViewModal() {
    setViewCandidate(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        education: form.education,
        work_history: form.work_history,
        skills: form.skills || null,
        certifications: form.certifications,
        desired_salary: form.desired_salary,
        status: form.status,
        consent_given: form.consent_given,
        consent_at: form.consent_at || null,
        consent_source: form.consent_source,
        consent_version: form.consent_version,
      };
      if (form.profile_photo instanceof File) payload['photo'] = form.profile_photo;
      if (form.documents) {
        const knownFields = ['resume', 'passport', 'visa'];
        for (const [key, val] of Object.entries(form.documents)) {
          if (knownFields.includes(key) && val instanceof File) payload[key] = val;
        }
      }
      const record = await pb.collection('candidates').create(payload);
      const token = await pb.files.getToken();
      const newCandidate: CandidateForm = {
        ...form,
        id: record.id,
        profile_photo: record.photo ? pb.files.getURL(record, record.photo, { token }) : null,
        documents: {
          resume: record.resume ? pb.files.getURL(record, record.resume, { token }) : null,
          passport: record.passport ? pb.files.getURL(record, record.passport, { token }) : null,
          visa: record.visa ? pb.files.getURL(record, record.visa, { token }) : null,
        },
      };
      setCandidates((prev) => [newCandidate, ...prev]);
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? 'unknown',
        actor_role: getUserRole() ?? 'staff',
        action: 'create',
        entity: 'Candidate',
        entity_name: form.full_name || 'New Candidate',
      });
      showFeedback("success", "Candidate added successfully.");
      setIsModalOpen(false);
      setForm(initialForm);
    } catch (err: any) {
      const detail = err?.data ? JSON.stringify(err.data) : (err?.message ?? '');
      setError(`Failed to add candidate. ${detail}`);
      showFeedback("error", `Failed to add candidate. ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }
  async function onEditSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        education: form.education,
        work_history: form.work_history,
        skills: form.skills || null,
        certifications: form.certifications,
        desired_salary: form.desired_salary,
        status: form.status,
        consent_given: form.consent_given,
        consent_at: form.consent_at || null,
        consent_source: form.consent_source,
        consent_version: form.consent_version,
      };
      if (form.profile_photo instanceof File) payload['photo'] = form.profile_photo;
      if (form.documents) {
        const knownFields = ['resume', 'passport', 'visa'];
        for (const [key, val] of Object.entries(form.documents)) {
          if (knownFields.includes(key) && val instanceof File) payload[key] = val;
        }
      }
      const updatedRecord = await pb.collection('candidates').update(String(editCandidate?.id), payload);
      const token = await pb.files.getToken();
      const updatedCandidate: CandidateForm = {
        ...form,
        id: updatedRecord.id,
        profile_photo: updatedRecord.photo ? pb.files.getURL(updatedRecord, updatedRecord.photo, { token }) : null,
        documents: {
          resume: updatedRecord.resume ? pb.files.getURL(updatedRecord, updatedRecord.resume, { token }) : null,
          passport: updatedRecord.passport ? pb.files.getURL(updatedRecord, updatedRecord.passport, { token }) : null,
          visa: updatedRecord.visa ? pb.files.getURL(updatedRecord, updatedRecord.visa, { token }) : null,
        },
      };
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === editCandidate?.id ? updatedCandidate : c,
        ),
      );
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? 'unknown',
        actor_role: getUserRole() ?? 'staff',
        action: 'update',
        entity: 'Candidate',
        entity_name: form.full_name || String(editCandidate?.id ?? '—'),
      });
      showFeedback("success", "Candidate updated successfully.");
      setIsEditModalOpen(false);
    } catch (err: any) {
      const detail = err?.data ? JSON.stringify(err.data) : (err?.message ?? '');
      setError(`Failed to update candidate. ${detail}`);
      showFeedback("error", `Failed to update candidate. ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }
  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      // Archive instead of permanent delete (client-side)
      if (!deleteCandidate) {
        showFeedback("error", "No candidate selected.");
        setIsDeleteModalOpen(false);
        return;
      }

      handleArchive(deleteCandidate);
      setIsDeleteModalOpen(false);
    } catch {
      showFeedback("error", "Failed to archive candidate.");
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

  const documentTypes: Array<[string, string]> = [
    ["resume", "Resume"],
    ["passport", "Passport"],
    ["visa", "VISA"],
    ["nbi_clearance", "NBI Clearance"],
    ["police_clearance", "Police Clearance"],
    ["offer_letter", "Offer Letter"],
    ["dmw_approved_contract", "DMW Approved Contract"],
    ["overseas_employment_contract", "Overseas Employment Contract"],
    ["employer_contact", "Employer Contact"],
    ["other", "Other"],
  ];

  const [viewTab, setViewTab] = useState<'info' | 'documents'>('info');
  const [activeTab, setActiveTab] = useState<'info' | 'documents'>('info');

  // Archive state + auth
  const [archivedCandidates, setArchivedCandidates] = useState<ArchivedCandidate[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [staffViewOnly, setStaffViewOnly] = useState(false);

  const userRole = useMemo(() => getUserRole() ?? 'staff', []);

  // Print / PDF helpers
  const printRef = useRef<HTMLDivElement | null>(null);

  const profileUrl = useMemo(() => {
    if (!viewCandidate) return defaultProfile;
    const pp = viewCandidate.profile_photo;
    if (pp) {
      if (typeof pp === 'string' && pp) return pp;
      if (pp instanceof File) {
        try { return URL.createObjectURL(pp); } catch (e) { /* fallthrough */ }
      }
    }
    return defaultProfile;
  }, [viewCandidate]);

  useEffect(() => {
    return () => {
      try {
        if (profileUrl && profileUrl.startsWith('blob:')) URL.revokeObjectURL(profileUrl);
      } catch (e) {
        // ignore
      }
    };
  }, [profileUrl]);

  const [formProfilePreviewUrl, setFormProfilePreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    const pp = form.profile_photo;
    if (!pp) { setFormProfilePreviewUrl(null); return; }
    if (typeof pp === 'string') { setFormProfilePreviewUrl(pp); return; }
    if (pp instanceof File) {
      const url = URL.createObjectURL(pp);
      setFormProfilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [form.profile_photo]);

  function handleDownloadPdf() {
    if (!viewCandidate) return;
    const imgSrc = profileUrl;
    const html = generateResumeHtml(viewCandidate as Record<string, any>, imgSrc);

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try { w.print(); } catch (e) { /* ignore */ }
    }, 500);
  }

  function handleDocumentDownload(key: string, doc: File | string) {
    if (typeof doc === 'string') {
      const a = document.createElement('a');
      a.href = doc;
      a.download = key;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (doc instanceof File) {
      const url = URL.createObjectURL(doc);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  // Archive handlers
  function handleArchive(candidate: CandidateForm) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    setArchivedCandidates((prev) => [
      { ...candidate, archived_at: new Date().toISOString(), archived_by: userRole },
      ...prev,
    ]);
    addAuditLog({
      actor_email: pb.authStore.record?.email ?? 'unknown',
      actor_role: getUserRole() ?? 'staff',
      action: 'archive',
      entity: 'Candidate',
      entity_name: candidate.full_name || String(candidate.id ?? '—'),
    });
    showFeedback('success', 'Candidate archived.');
  }

  function handleRestore(candidate: ArchivedCandidate) {
    setArchivedCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    setCandidates((prev) => [{ ...candidate, archived_at: undefined, archived_by: undefined }, ...prev]);
    addAuditLog({
      actor_email: pb.authStore.record?.email ?? 'unknown',
      actor_role: getUserRole() ?? 'staff',
      action: 'restore',
      entity: 'Candidate',
      entity_name: candidate.full_name || String(candidate.id ?? '—'),
    });
    showFeedback('success', 'Candidate restored.');
  }

  function handleOpenArchive() {
    if (userRole === 'staff') {
      // Staff must authenticate to view archive (view-only)
      setIsAuthModalOpen(true);
      return;
    }
    setStaffViewOnly(false);
    setIsArchiveOpen(true);
  }

  function handleViewArchived(candidate: ArchivedCandidate) {
    setIsArchiveOpen(false);
    handleView(candidate as CandidateForm);
  }

  function handleAdminAuthSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123';
    if (adminPasswordInput === ADMIN_PASS) {
      setIsAuthModalOpen(false);
      setIsArchiveOpen(true);
      setStaffViewOnly(true);
      setAdminPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('Incorrect admin password');
    }
  }

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
              <div className="ml-auto flex items-center gap-2">
                <button
                  className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                  onClick={handleOpenModal}
                >
                  + Add Candidate
                </button>
                <button
                  type="button"
                  onClick={handleOpenArchive}
                  className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2)"
                >
                  Archive
                </button>
              </div>
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
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all duration-150 ${
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
                  className="px-4 py-1.5 flex items-center gap-1 rounded-xl bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                >
                  <Icon icon="tabler:x" width="15" height="15" />
                  Clear Filter
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
                          onClick={() => handleView(c)}
                          className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors cursor-pointer"
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
                              className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold capitalize ${statusBadge[c.status] ?? "bg-gray-100 text-gray-700"}`}
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
                                    className={`inline-block px-2.5 py-0.5 rounded-xl text-xs font-semibold ${flagBadge[flag]}`}
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
                                onClick={(e) => { e.stopPropagation(); handleView(c); }}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-xl bg-(--surface2) text-(--text) font-semibold text-xs hover:bg-(--border) transition-colors"
                              >
                                <Icon
                                  icon="tabler:eye"
                                  width="15"
                                  height="15"
                                />
                                View
                              </button>
                              {(userRole === 'administrator' || userRole === 'manager') && (
                                <>
                                  <button
                                    type="button"
                                    title="Edit"
                                    onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-xl bg-blue-100 text-blue-700 font-semibold text-xs hover:bg-blue-200 transition-colors"
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
                                    title="Archive"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-xl bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
                                  >
                                    <Icon icon="tabler:archive" width="15" height="15" />
                                    Archive
                                  </button>
                                </>
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

            {/* View Modal */}
            <Modal
              open={!!viewCandidate}
              onClose={handleCloseViewModal}
              title="Candidate Details"
            >
              {viewCandidate && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-xl">
                      <button
                        type="button"
                        onClick={() => setViewTab('info')}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${viewTab === 'info' ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}
                      >
                        Informations
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewTab('documents')}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${viewTab === 'documents' ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}
                      >
                        Documents
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {viewTab === 'info' && (
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="px-3 py-1.5 rounded-xl bg-(--primary) text-white text-sm font-semibold hover:brightness-95"
                        >
                          Download PDF
                        </button>
                      )}
                    </div>
                  </div>

                  {viewTab === 'info' ? (
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div className="col-span-1">
                        <div ref={printRef} className="p-4 border border-(--border) rounded-lg bg-white">
                          <div className="flex items-center gap-8">
                            <img src={profileUrl} alt="profile" className="w-24 h-24 rounded-full object-cover border border-(--border)" />
                            <div>
                              <h2 className="text-xl font-bold">{viewCandidate.full_name || '—'}</h2>
                              <div className="text-(--muted)">{viewCandidate.email || '—'}</div>
                              {viewCandidate.phone ? (
                                <div className="text-(--muted)">{viewCandidate.phone}</div>
                              ) : null}
                              <div className="text-(--muted)">{viewCandidate.address || '—'}</div>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="text-xs font-bold text-(--muted) uppercase">Skills</h3>
                              <p className="mt-2 text-(--text)">{viewCandidate.skills || '—'}</p>

                              <h3 className="mt-3 text-xs font-bold text-(--muted) uppercase">Education</h3>
                              <p className="mt-2 text-(--text)">{viewCandidate.education || '—'}</p>

                              <h3 className="mt-3 text-xs font-bold text-(--muted) uppercase">Certifications</h3>
                              <p className="mt-2 text-(--text)">{viewCandidate.certifications || '—'}</p>
                            </div>

                            <div>
                              <h3 className="text-xs font-bold text-(--muted) uppercase">Work History</h3>
                              <p className="mt-2 text-(--text)">{viewCandidate.work_history || '—'}</p>

                              <h3 className="mt-3 text-xs font-bold text-(--muted) uppercase">Status & Salary</h3>
                              <p className="mt-2 text-(--text)">Status: {viewCandidate.status || '—'}</p>
                              <p className="mt-1 text-(--text)">Desired salary: {viewCandidate.desired_salary || '—'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {documentTypes.map(([key, label]) => (
                        <div key={key} className="p-3 border border-(--border) rounded-xl bg-white">
                          <div className="text-xs font-bold text-(--muted) uppercase mb-2">{label}</div>
                          {viewCandidate.documents?.[key]
                            ? (
                              <button
                                type="button"
                                onClick={() => handleDocumentDownload(key, viewCandidate.documents![key] as File | string)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-xl bg-white text-xs font-semibold text-(--primary) cursor-pointer hover:bg-(--surface2) transition-colors"
                              >
                                <Icon icon="tabler:download" width="14" height="14" />
                                {typeof viewCandidate.documents[key] === 'string'
                                  ? 'Download'
                                  : (viewCandidate.documents[key] as File).name}
                              </button>
                            )
                            : <span className="text-xs text-(--muted)">No file uploaded</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Modal>

            {/* Auth modal for staff to view archive (enter admin password) */}
            <Modal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title="Admin Authentication">
              <form onSubmit={handleAdminAuthSubmit} className="grid gap-3">
                <p className="text-sm text-(--muted)">Enter admin password to view archived candidates (view-only).</p>
                <label className="grid gap-1">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2 text-sm"
                    placeholder="Admin password"
                    required
                  />
                </label>
                {authError && <div className="text-sm text-[#9f2d20]">{authError}</div>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2" onClick={() => setIsAuthModalOpen(false)}>Cancel</button>
                  <button type="submit" className="border-none text-white bg-(--primary) rounded-xl px-4 py-2">Submit</button>
                </div>
              </form>
            </Modal>

            {/* Archive Modal */}
            <Modal open={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} title="Archived Candidates">
              <div className="grid gap-3 text-sm">
                {archivedCandidates.length === 0 ? (
                  <div className="py-6 text-center text-(--muted)">No archived candidates</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="bg-(--surface2)">
                          <th className="px-4 py-2 font-bold text-(--muted)">Full name</th>
                          <th className="px-4 py-2 font-bold text-(--muted)">Email</th>
                          <th className="px-4 py-2 font-bold text-(--muted)">Archived At</th>
                          <th className="px-4 py-2 font-bold text-(--muted)">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedCandidates.map((ac) => (
                          <tr key={ac.id} className="border-b border-(--border)">
                            <td className="px-4 py-2 font-semibold">{ac.full_name || '—'}</td>
                            <td className="px-4 py-2">{ac.email || '—'}</td>
                            <td className="px-4 py-2">{ac.archived_at ? new Date(ac.archived_at).toLocaleString() : '—'}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                {(userRole === 'administrator' || userRole === 'manager') && (
                                  <button type="button" onClick={() => handleRestore(ac)} className="cursor-pointer px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-xs font-semibold">Restore</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsArchiveOpen(false)}
                    className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                  >
                    Close
                  </button>
                </div>
              </div>
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
                <div className="col-span-2 mb-4">
                  <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${activeTab === 'info' ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}
                    >
                      Informations
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('documents')}
                      className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${activeTab === 'documents' ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}
                    >
                      Documents
                    </button>
                  </div>
                </div>

                {activeTab === 'info' ? (
                  <>
                    <div className="col-span-2 flex flex-col items-center gap-3 mb-2">
                      <img
                        src={formProfilePreviewUrl ?? defaultProfile}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border border-(--border)"
                      />
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-(--border) rounded-xl bg-white text-sm text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors">
                        <Icon icon="tabler:camera" width="16" height="16" />
                        <span className="font-medium">Upload Profile Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            setForm((f) => ({ ...f, profile_photo: file }));
                          }}
                        />
                      </label>
                    </div>
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
                    <label className="col-span-2 grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">Action Required</span>
                      <div className="flex flex-wrap gap-2 items-center">
                        {availableFlags.map((flag) => {
                          const isActive = (form.action_required ?? []).includes(flag);
                          return (
                            <button
                              key={flag}
                              type="button"
                              onClick={() => {
                                setForm((prev) => {
                                  const current = prev.action_required ?? [];
                                  const next = current.includes(flag)
                                    ? current.filter((f) => f !== flag)
                                    : Array.from(new Set([...current, flag]));
                                  return { ...prev, action_required: next };
                                });
                              }}
                              className={`px-3 py-1 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                                isActive
                                  ? 'bg-(--primary) text-white border-(--primary) shadow'
                                  : 'bg-white text-(--text) border-(--border) hover:bg-(--surface2)'
                              }`}
                            >
                              {flag}
                            </button>
                          );
                        })}
                      </div>
                    </label>
                  </>
                ) : (
                  <>
                    {documentTypes.map(([key, label]) => (
                      <div key={key} className="col-span-1 p-3 border border-(--border) rounded-xl bg-white">
                        <div className="text-xs font-bold text-(--muted) uppercase mb-2">{label}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label
                            htmlFor={`file-${key}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-xl bg-white text-xs font-semibold text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors"
                          >
                            <Icon icon="tabler:upload" width="14" height="14" />
                            Upload
                          </label>
                          <input
                            id={`file-${key}`}
                            type="file"
                            accept="*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setForm((prev) => ({ ...prev, documents: { ...(prev.documents ?? {}), [key]: file } }));
                            }}
                            className="hidden"
                          />
                          {form.documents?.[key]
                            ? (typeof form.documents[key] === 'string'
                                ? (
                                  <a
                                    href={form.documents[key] as string}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-(--primary) font-medium underline"
                                  >
                                    <Icon icon="tabler:file" width="13" height="13" />
                                    Existing file
                                  </a>
                                )
                                : (
                                  <span className="inline-flex items-center gap-1 text-xs text-(--text) font-medium truncate max-w-40">
                                    <Icon icon="tabler:file" width="13" height="13" />
                                    {(form.documents[key] as File).name}
                                  </span>
                                ))
                            : <span className="text-xs text-(--muted)">No file selected</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={
                      isModalOpen ? handleCloseModal : handleCloseEditModal
                    }
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-(--primary) to-(--primary2) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
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
            <Modal open={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Archive Candidate">
              <form onSubmit={e => { e.preventDefault(); onDeleteSubmit(); }} className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-full flex flex-col items-center justify-center mb-2">
                    <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                      <Icon icon="tabler:archive" width="38" height="38" className="text-red-500" />
                    </div>
                  </div>
                  <p className="text-base font-semibold text-(--text) mb-1">
                    Are you sure you want to <span className="text-red-600 font-bold">archive</span> this candidate?
                  </p>
                  <p className="text-sm text-(--muted)">
                    <span className="font-bold">{deleteCandidate?.full_name}</span> ({deleteCandidate?.email})
                  </p>
                  {/* Confirmation modal for archiving candidates */}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={handleCloseDeleteModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-xl px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105 shadow-md shadow-red-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Archiving..." : "Archive"}
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

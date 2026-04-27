import { useState, useEffect, useMemo, useRef } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Filter from "../ui/Filter";
import Selection from "../ui/Selection";
import Pagination from "../ui/Pagination";
import IndustryPositionPicker from "../ui/IndustryPositionPicker";
import defaultProfile from "../../assets/images/default-profile.png";
import { generateResumeHtml } from './resumeTemplate';
import { getUserRole, pb } from '../../lib/pocketbase/pb';
import { addAuditLog } from '../../utils/auditLog';
import type { CandidateForm, ArchivedCandidate } from '../../types/Candidate';
import {hasChanges} from '../../utils/hasChanges';

const candidateStatuses = [
  "New Applicant",
  "Lined-Up",
  "For final interview",
  "For medical",
  "Fit to work",
  "Unfit to work",
  "Pending medical",
  "For deployment",
  "Visa Arrived",
  "Awaiting Visa",
  "Deployed",
  "Rejected",
];

const initialForm: CandidateForm = {
  last_name: "",
  first_name: "",
  middle_name: "",
  prefix: "",
  suffix: "",
  full_name: "",
  marital_status: "",
  home_address: "",
  permanent_address: "",
  pagibig_number: "",
  highest_educ_attainment: "",
  school_elementary: "",
  school_junior_high: "",
  school_senior_high: "",
  school_college: "",
  school_other: "",
  school_other_name: "",
  email: "",
  phone: "",
  address: "",
  education: "",
  work_history: "",
  skills: "",
  certifications: "",
  desired_salary: "",
  position_screened: "",
  notes: "",
  status: "New Applicant",
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

  if (["New Applicant", "Lined-Up"].includes(c.status))
    flags.push("Not Interviewed");
    
  if (c.status === "For final interview") flags.push("Not Scheduled");
  
  if (!c.consent_given) flags.push("Docs Missing");
  return flags;
}

export default function Candidates() {
  const [candidates, setCandidates] = useState<CandidateForm[]>([]);
  const [form, setForm] = useState<CandidateForm>(initialForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCandidate, setEditCandidate] = useState<CandidateForm | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<CandidateForm | null>(null);
  const [viewCandidate, setViewCandidate] = useState<CandidateForm | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickFilter, setQuickFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [pagedCandidates, setPagedCandidates] = useState<CandidateForm[]>([]);
  const [positionsList, setPositionsList] = useState<Array<{ id: string; industry: string; title: string }>>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  // Fetch candidates
  useEffect(() => {
    async function fetchCandidates() {
      try {
        const [items, token] = await Promise.all([
          pb.collection('candidates').getFullList<Record<string, any>>({
            sort: '-created',
            requestKey: null,
          }),
          pb.files.getToken(),
        ]);

        // Get all documents for all candidates
        const allDocuments = await pb.collection('documents').getFullList<Record<string, any>>({
          filter: `candidate != ""`, // Get all documents with a candidate relation
        });

        // Create a map of candidate ID -> documents array
        const documentsByCandidate: Record<string, any[]> = {};
        allDocuments.forEach((doc) => {
          const candidateId = doc.candidate;
          if (!documentsByCandidate[candidateId]) {
            documentsByCandidate[candidateId] = [];
          }
          documentsByCandidate[candidateId].push(doc);
        });

        setCandidates(
          items.map((item) => {
            // Build documents object from documents records
            const documents: Record<string, string | null> = {};
            const candidateDocs = documentsByCandidate[item.id] || [];

            // Initialize all document types as null
            documentTypes.forEach(([key]) => {
              documents[key] = null;
            });

            // Map documents to their types
            candidateDocs.forEach((doc: any) => {
              if (doc.file) {
                documents[doc.doc_type] = pb.files.getURL(doc, doc.file, { token });
              }
            });

            return {
              id: item.id,
              full_name: item.full_name ?? '',
              last_name: item.last_name ?? '',
              first_name: item.first_name ?? '',
              middle_name: item.middle_name ?? '',
              prefix: item.prefix ?? '',
              suffix: item.suffix ?? '',
              marital_status: item.marital_status ?? '',
              home_address: item.home_address ?? '',
              permanent_address: item.permanent_address ?? '',
              pagibig_number: item.pagibig_number ?? '',
              highest_educ_attainment: item.highest_educ_attainment ?? '',
              school_elementary: item.school_elementary ?? '',
              school_junior_high: item.school_junior_high ?? '',
              school_senior_high: item.school_senior_high ?? '',
              school_college: item.school_college ?? '',
              school_other: item.school_other ?? '',
              email: item.email ?? '',
              phone: item.phone ?? '',
              address: item.address ?? '',
              education: item.education ?? '',
              work_history: item.work_history ?? '',
              skills: item.skills ?? '',
              certifications: item.certifications ?? '',
              desired_salary: item.desired_salary ?? '',
              position_screened: item.position_screened ?? '',
              notes: item.notes ?? '',
              status: item.status ?? 'Applied',
              consent_given: item.consent_given ?? false,
              consent_at: item.consent_at ?? '',
              consent_source: item.consent_source ?? '',
              consent_version: item.consent_version ?? '',
              action_required: Array.isArray(item.action_required) && item.action_required.length
                ? item.action_required
                : getCandidateFlags({ status: item.status ?? 'Applied', consent_given: item.consent_given ?? false } as CandidateForm),
              profile_photo: item.photo ? pb.files.getURL(item, item.photo, { token }) : null,
              documents,
            };
          })
        );
      } catch (err) {
        console.error('Failed to fetch candidates:', err);
        setCandidates([]);
      }
    }
    fetchCandidates();
  }, []);

  // Filtered candidates
  const filtered = useMemo(
    () =>
      candidates.filter((c) => {
        const query = search.toLowerCase();
        const matchesSearch =
          c.full_name?.toLowerCase().includes(query) ||
          c.last_name?.toLowerCase().includes(query) ||
          c.first_name?.toLowerCase().includes(query) ||
          c.middle_name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.position_screened?.toLowerCase().includes(query);
        const matchesStatus = statusFilter ? c.status === statusFilter : true;
        const matchesDateFrom = dateFrom ? c.consent_at >= dateFrom : true;
        const matchesDateTo = dateTo ? c.consent_at <= dateTo : true;
        const savedFlags = Array.isArray(c.action_required) && c.action_required.length
          ? c.action_required
          : getCandidateFlags(c);
        const matchesQuick =
          quickFilter === "not-interviewed" ? savedFlags.includes("Not Interviewed")
            : quickFilter === "not-scheduled" ? savedFlags.includes("Not Scheduled")
            : quickFilter === "missing-docs" ? savedFlags.includes("Docs Missing")
            : true;
                return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesQuick;
              }),
    [candidates, search, statusFilter, dateFrom, dateTo, quickFilter],
  );

  // Pagination
  useEffect(() => {
    setTotalPages(Math.ceil(filtered.length / perPage) || 1);
    setPagedCandidates(filtered.slice((page - 1) * perPage, page * perPage));
  }, [filtered, page, perPage]);

  // Load positions
  useEffect(() => {
    let mounted = true;
    async function fetchPositions() {
      setPositionsLoading(true);
      try {
        const items = await pb.collection('positions').getFullList<Record<string, any>>({ sort: 'industry,title', requestKey: null });
        if (!mounted) return;
        setPositionsList(items.map((it) => ({ id: it.id, industry: it.industry ?? '', title: it.title ?? '' })));
      } catch (err) {
        console.error('Failed to load positions from PocketBase', err);
        if (!mounted) return;
        setPositionsList([]);
      } finally {
        if (mounted) setPositionsLoading(false);
      }
    }
    fetchPositions();
    return () => { mounted = false; };
  }, []);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  function handleOpenModal() {
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
    setActiveTab('info');
  }
  function handleCloseModal() { setIsModalOpen(false); setError(""); }

  function handleEdit(candidate: CandidateForm) {
    setEditCandidate(candidate);
    setForm({
      ...candidate,
      position_screened: candidate.position_screened ?? '',
      notes: candidate.notes ?? '',
      action_required: candidate.action_required?.length
        ? candidate.action_required
        : getCandidateFlags(candidate),
    });
    setIsEditModalOpen(true);
    setError("");
    setActiveTab('info');
  }
  function handleCloseEditModal() { setIsEditModalOpen(false); setEditCandidate(null); setError(""); }
  function handleDelete(candidate: CandidateForm) { setDeleteCandidate(candidate); setIsDeleteModalOpen(true); }
  function handleCloseDeleteModal() { setIsDeleteModalOpen(false); setDeleteCandidate(null); }

  function handleView(candidate: CandidateForm) {
    setViewCandidate({
      ...candidate,
      action_required: candidate.action_required?.length
        ? candidate.action_required
        : getCandidateFlags(candidate),
    });
    setViewTab('info');
    addAuditLog({
      actor_email: pb.authStore.record?.email ?? 'unknown',
      actor_role: getUserRole() ?? 'staff',
      action: 'view',
      entity: 'Candidate',
      entity_name: candidate.full_name || String(candidate.id ?? '—'),
    });
  }
  
  function handleCloseViewModal() { setViewCandidate(null); }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const computedFullName = [form.last_name, form.first_name, form.middle_name].filter(Boolean).join(' ') || form.full_name || 'Unknown';
      const payload: Record<string, any> = {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name,
        full_name: computedFullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        education: form.education,
        work_history: form.work_history,
        skills: form.skills || null,
        certifications: form.certifications,
        desired_salary: form.desired_salary,
        position_screened: form.position_screened || null,
        notes: form.notes || null,
        status: form.status,
        consent_given: form.consent_given,
        consent_at: form.consent_at || null,
        consent_source: form.consent_source,
        consent_version: form.consent_version,
        action_required: form.action_required ?? [],
      };
      
      if (form.profile_photo instanceof File) payload['photo'] = form.profile_photo;

      // Create candidate record (NO file fields)
      const record = await pb.collection('candidates').create(payload);

      // Create document records separately
      await createDocumentsForCandidate(record.id, form.documents || {});

      const token = await pb.files.getToken();
      const newCandidate: CandidateForm = {
        ...form,
        full_name: computedFullName,
        id: record.id,
        profile_photo: record.photo ? pb.files.getURL(record, record.photo, { token }) : null,
        documents: {}, // Empty for now, will be loaded on next fetch
      };

      setCandidates((prev) => [newCandidate, ...prev]);
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? 'unknown',
        actor_role: getUserRole() ?? 'staff',
        action: 'create',
        entity: 'Candidate',
        entity_name: [form.last_name, form.first_name].filter(Boolean).join(', ') || computedFullName,
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

    const changed = hasChanges(editCandidate!, form, [
      'last_name', 'first_name', 'middle_name', 'email', 'phone',
      'home_address', 'permanent_address', 'suffix', 'prefix',
      'marital_status', 'status', 'action_required', 'notes',
      'work_history', 'certifications', 'desired_salary',
      'position_screened', 'skills', 'pagibig_number',
      'highest_educ_attainment', 'school_elementary', 'school_junior_high',
      'school_senior_high', 'school_college', 'school_other_name',
      'consent_given', 'profile_photo', 'documents',
    ]);

    if (!changed) {
      showFeedback("info", "No changes detected. Nothing was updated.");
      setIsEditModalOpen(false);
      setIsSubmitting(false);
      return;
    }

    try {
      const computedFullNameEdit = [form.last_name, form.first_name, form.middle_name].filter(Boolean).join(' ') || form.full_name || 'Unknown';
      const payload: Record<string, any> = {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name,
        full_name: computedFullNameEdit,
        email: form.email,
        phone: form.phone,
        address: form.address,
        education: form.education,
        work_history: form.work_history,
        skills: form.skills || null,
        certifications: form.certifications,
        desired_salary: form.desired_salary,
        position_screened: form.position_screened || null,
        notes: form.notes || null,
        status: form.status,
        consent_given: form.consent_given,
        consent_at: form.consent_at || null,
        consent_source: form.consent_source,
        consent_version: form.consent_version,
        action_required: form.action_required ?? [],
      };

      if (form.profile_photo instanceof File) payload['photo'] = form.profile_photo;

      // Update candidate record (NO file fields)
      const updatedRecord = await pb.collection('candidates').update(String(editCandidate?.id), payload);

      // Update documents separately
      await updateDocumentsForCandidate(String(editCandidate?.id), editCandidate?.documents || {}, form.documents || {});
      
      const token = await pb.files.getToken();
      const updatedCandidate: CandidateForm = {
        ...form,
        full_name: computedFullNameEdit,
        id: updatedRecord.id,
        profile_photo: updatedRecord.photo ? pb.files.getURL(updatedRecord, updatedRecord.photo, { token }) : null,
        documents: {}, // Empty for now, will be loaded on next fetch
      };

      setCandidates((prev) => prev.map((c) => c.id === editCandidate?.id ? updatedCandidate : c));
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? 'unknown',
        actor_role: getUserRole() ?? 'staff',
        action: 'update',
        entity: 'Candidate',
        entity_name: [form.last_name, form.first_name].filter(Boolean).join(', ') || computedFullNameEdit,
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
      if (!deleteCandidate) { showFeedback("error", "No candidate selected."); setIsDeleteModalOpen(false); return; }
      handleArchive(deleteCandidate);
      setIsDeleteModalOpen(false);
    } catch { showFeedback("error", "Failed to archive candidate."); }
    finally { setIsSubmitting(false); }
  }

  const statusBadge: Record<string, string> = {
    "New Applicant": "bg-gray-100 text-gray-700",
    "Lined-Up": "bg-blue-100 text-blue-700",
    "For final interview": "bg-indigo-100 text-indigo-700",
    "For medical": "bg-purple-100 text-purple-700",
    "Fit to work": "bg-green-100 text-green-700",
    "Unfit to work": "bg-red-100 text-red-700",
    "Pending medical": "bg-orange-100 text-orange-700",
    "For deployment": "bg-sky-100 text-sky-700",
    "Visa Arrived": "bg-emerald-100 text-emerald-700",
    "Awaiting Visa": "bg-amber-100 text-amber-700",
    "Deployed": "bg-teal-100 text-teal-700",
    "Rejected": "bg-rose-100 text-rose-700",
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
  const documentTypes: Array<[string, string]> = [
    ["resume", "Resume"], ["passport", "Passport"], ["visa", "VISA"],
    ["nbi_clearance", "NBI Clearance"], ["police_clearance", "Police Clearance"],
    ["offer_letter", "Offer Letter"], ["dmw_approved_contract", "DMW Approved Contract"],
    ["overseas_employment_certificate", "Overseas Employment Certificate"],
    ["peos_certificate", "PEOS Certificate"], ["e_registration_file", "E-registration File"],
    ["other", "Other"],
  ];

  const [viewTab, setViewTab] = useState<'info' | 'details' | 'documents' | 'notes'>('info');
  const [activeTab, setActiveTab] = useState<'info' | 'details' | 'documents'>('info');
  const [archivedCandidates, setArchivedCandidates] = useState<ArchivedCandidate[]>([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [staffViewOnly, setStaffViewOnly] = useState(false);
  const userRole = useMemo(() => getUserRole() ?? 'staff', []);
  const printRef = useRef<HTMLDivElement | null>(null);

  const profileUrl = useMemo(() => {
    if (!viewCandidate) return defaultProfile;
    const pp = viewCandidate.profile_photo;
    if (pp) {
      if (typeof pp === 'string' && pp) return pp;
      if (pp instanceof File) { try { return URL.createObjectURL(pp); } catch (e) { } }
    }
    return defaultProfile;
  }, [viewCandidate]);

  useEffect(() => {
    return () => { try { if (profileUrl?.startsWith('blob:')) URL.revokeObjectURL(profileUrl); } catch (e) { } };
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
    const html = generateResumeHtml(viewCandidate as Record<string, any>, profileUrl);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (e) { } }, 500);
  }

  async function handleDocumentDownload(_key: string, doc: File | string) {
    if (typeof doc === 'string') {
      try {
        const freshToken = await pb.files.getToken();
        // Strip any existing token query param first
        const baseUrl = doc.split('?')[0];
        const urlWithToken = `${baseUrl}?token=${freshToken}`;
        window.open(urlWithToken, '_blank', 'noreferrer');
      } catch {
        const baseUrl = doc.split('?')[0];
        window.open(baseUrl, '_blank', 'noreferrer');
      }
    } else if (doc instanceof File) {
      const url = URL.createObjectURL(doc);
      const a = document.createElement('a');
      a.href = url; a.download = doc.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function handleArchive(candidate: CandidateForm) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    setArchivedCandidates((prev) => [{ ...candidate, archived_at: new Date().toISOString(), archived_by: userRole }, ...prev]);
    addAuditLog({ actor_email: pb.authStore.record?.email ?? 'unknown', actor_role: getUserRole() ?? 'staff', action: 'archive', entity: 'Candidate', entity_name: candidate.full_name || String(candidate.id ?? '—') });
    showFeedback('success', 'Candidate archived.');
  }

  function handleRestore(candidate: ArchivedCandidate) {
    setArchivedCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    setCandidates((prev) => [{ ...candidate, archived_at: undefined, archived_by: undefined }, ...prev]);
    addAuditLog({ actor_email: pb.authStore.record?.email ?? 'unknown', actor_role: getUserRole() ?? 'staff', action: 'restore', entity: 'Candidate', entity_name: candidate.full_name || String(candidate.id ?? '—') });
    showFeedback('success', 'Candidate restored.');
  }

  function handleOpenArchive() {
    if (userRole === 'staff') { setIsAuthModalOpen(true); return; }
    setStaffViewOnly(false); setIsArchiveOpen(true);
  }

  function handleAdminAuthSubmit(e?: React.FormEvent) {
    e?.preventDefault?.();
    const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123';
    if (adminPasswordInput === ADMIN_PASS) {
      setIsAuthModalOpen(false); setIsArchiveOpen(true); setStaffViewOnly(true);
      setAdminPasswordInput(''); setAuthError('');
    } else { setAuthError('Incorrect admin password'); }
  }

  // Create document records for newly uploaded files
  async function createDocumentsForCandidate(candidateId: string, documents: Record<string, any>) {
    const documentPromises = [];
    for (const [key, val] of Object.entries(documents)) {
      if (val instanceof File) {
        documentPromises.push(
          pb.collection('documents').create({
            candidate: candidateId,
            doc_type: key,
            file: val,
            status: 'Submitted',
          })
        );
      }
    }
    if (documentPromises.length > 0) {
      await Promise.all(documentPromises);
    }
  }

  // Delete old documents and create new ones
  async function updateDocumentsForCandidate(candidateId: string, oldDocuments: Record<string, any>, newDocuments: Record<string, any>) {
    // Delete documents that were removed
    for (const [_key, oldVal] of Object.entries(oldDocuments)) {
      const newVal = newDocuments[_key];
      if (oldVal && !newVal) {
        // Find and delete the document record
        try {
          const existingDocs = await pb.collection('documents').getFullList({
            filter: `candidate = "${candidateId}" && doc_type = "${_key}"`,
          });
          for (const doc of existingDocs) {
            await pb.collection('documents').delete(doc.id);
          }
        } catch (err) {
          console.error(`Failed to delete document type ${_key}:`, err);
        }
      }
    }
    
    // Create new document records for newly uploaded files
    await createDocumentsForCandidate(candidateId, newDocuments);
  }


  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Dapat image lang
    if (!file.type.startsWith("image/")) {
      showFeedback("error", "Invalid file type. Please upload an image (JPG, PNG, etc.)");
      e.target.value = "";
      return;
    }

    // Validation para sa laki ng file
    if (file.size > 2 * 1024 * 1024) {
      showFeedback("error", "File is too large. Maximum size is 2MB.");
      e.target.value = "";
      return;
    }

    setForm((f) => ({ ...f, profile_photo: file }));
  };

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation: Dapat PDF lang
    if (file.type !== "application/pdf") {
      showFeedback("error", "Invalid file type. Only PDF documents are allowed.");
      e.target.value = "";
      return;
    }

    // Validation para sa laki ng file
    if (file.size > 5 * 1024 * 1024) {
      showFeedback("error", "Document is too large. Maximum size is 5MB.");
      e.target.value = "";
      return;
    }

    setForm((prev) => ({
      ...prev,
      documents: { ...(prev.documents ?? {}), [key]: file },
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border rounded-md border-(--border) shadow-[var(--shadow),var(--inset)] px-4 py-6 flex flex-col gap-4">
            {showToast && success && (
              <Toast type={toastType} message={success} onClose={() => setShowToast(false)} />
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl text-(--text) font-bold">Candidates</h1>
                <p className="text-(--muted) text-sm font-medium">Manage candidate records and status.</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button className="border-none text-white flex items-center gap-1 text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-2.5 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105" onClick={handleOpenModal}>
                  <Icon icon="mynaui:plus" width="24" height="24" />
                  Add Candidate
                </button>
                <button type="button" onClick={handleOpenArchive} className="border border-(--border) bg-white text-(--text) flex items-center gap-1.5 text-sm rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2)">
                  <Icon icon="ion:archive-outline" width="20" height="20" />
                  Archive
                </button>
              </div>
            </div>

            {/* Search & Status Filter */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="max-w-sm flex-1">
                <Searchbar value={search} onChange={setSearch} placeholder="Search by name, email, or position" className="text-sm" />
              </div>
              <div className="min-w-45">
                <Filter
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[{ value: "", label: "All Statuses" }, ...candidateStatuses.map((s) => ({ value: s, label: s }))]}
                  placeholder="Filter by status"
                  className="text-sm rounded-md"
                />
              </div>
            </div>

            {/* Quick filter pills */}
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((qf) => (
                <button
                  key={qf.key} type="button"
                  onClick={() => { setQuickFilter((prev) => (prev === qf.key ? "" : qf.key)); setPage(1); }}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-semibold border transition-all duration-150 ${quickFilter === qf.key ? "bg-(--primary) text-white border-(--primary) shadow" : "bg-white text-(--text) border-(--border) hover:bg-(--surface2)"}`}
                >
                  {qf.label}
                </button>
              ))}
              {(quickFilter || statusFilter || dateFrom || dateTo || search) && (
                <button type="button" onClick={() => { setQuickFilter(""); setStatusFilter(""); setDateFrom(""); setDateTo(""); setSearch(""); setPage(1); }} className="px-4 py-1.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors">
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
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Full Name</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Phone Number</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Status</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Action Required</th>
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-(--muted)">
                        <div className="flex flex-col items-center gap-2">
                          <Icon icon="tabler:user-off" width="44" height="44" className="text-(--muted) mb-1" />
                          <span className="text-base font-semibold">No candidates found</span>
                          <span className="text-sm">Try adjusting your filters or add a new candidate.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pagedCandidates.map((c, idx) => {
                      const flags = Array.isArray(c.action_required) && c.action_required.length ? c.action_required : getCandidateFlags(c);
                      return (
                        <tr key={c.id} onClick={() => handleView(c)} className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors cursor-pointer">
                          <td className="px-4 py-3 text-(--muted) text-sm">{(page - 1) * perPage + idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-(--text) text-sm">
                            {c.last_name ? `${c.last_name}, ${c.first_name}${c.middle_name ? ' ' + c.middle_name : ''}` : (c.full_name || 'No data available')}
                          </td>
                          <td className="px-4 py-3 text-(--text) font-semibold text-sm">{c.phone || "No data available"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-4 py-1 rounded-xl text-sm font-medium capitalize ${statusBadge[c.status] ?? "bg-gray-100 text-gray-700"}`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(flags) && flags.length > 0 && flags.map((flag) => (
                                <span key={flag} className={`inline-block px-3 py-0.5 rounded-xl text-sm font-medium ${flagBadge[flag]}`}>{flag}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleView(c); }} className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-(--surface2) text-(--text) font-semibold text-sm hover:bg-(--border) transition-colors">
                                <Icon icon="tabler:eye" width="15" height="15" />View
                              </button>
                              {(userRole === 'administrator' || userRole === 'manager') && (
                                <>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors">
                                    <Icon icon="tabler:edit" width="15" height="15" />Edit
                                  </button>
                                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors">
                                    <Icon icon="tabler:archive" width="15" height="15" />Archive
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
            <Modal open={!!viewCandidate} onClose={handleCloseViewModal} title="Candidate Details">
              {viewCandidate && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-md">
                      {(['info', 'details', 'documents', 'notes'] as const).map((tab) => (
                        <button key={tab} type="button" onClick={() => setViewTab(tab)}
                          className={`px-3 py-1 rounded-md text-sm font-semibold transition ${viewTab === tab ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}>
                          {tab === 'info' ? 'Informations' : tab === 'details' ? 'Work Details' : tab === 'documents' ? 'Documents' : 'Notes'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {viewTab === 'info' && (
                        <button type="button" onClick={handleDownloadPdf} className="px-4 py-1.5 rounded-md bg-(--primary) flex items-center gap-1.5 text-white text-base font-semibold hover:brightness-95">
                          <Icon icon="mynaui:download-solid" width="20" height="20" />Download PDF
                        </button>
                      )}
                    </div>
                  </div>

                  {viewTab === 'info' ? (
                    <div ref={printRef} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="col-span-1 md:col-span-3 flex flex-col items-center gap-2 mb-2">
                        <img src={profileUrl} alt="profile" className="w-24 h-24 rounded-full object-cover border border-(--border)" />
                      </div>
                      {[['Last Name', viewCandidate.last_name], ['First Name', viewCandidate.first_name], ['Middle Name', viewCandidate.middle_name], ['Email', viewCandidate.email], ['Home Address', viewCandidate.home_address], ['Permanent Address', viewCandidate.permanent_address], ['Suffix', viewCandidate.suffix], ['Prefix', viewCandidate.prefix], ['Phone Number', viewCandidate.phone]].map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">{label}</span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{val || <span className="text-(--muted) italic">No data available</span>}</p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[['Marital Status', viewCandidate.marital_status], ['Status', viewCandidate.status]].map(([label, val]) => (
                          <div key={label} className="grid gap-1">
                            <span className="text-sm font-bold text-(--muted)">{label}</span>
                            <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{val || <span className="text-(--muted) italic">No data available</span>}</p>
                          </div>
                        ))}
                      </div>
                      <div className="col-span-1 md:col-span-3 grid gap-1.5">
                        <span className="text-sm font-bold text-(--muted)">Action Required</span>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {availableFlags.map((flag) => {
                            const isActive = (viewCandidate.action_required ?? []).includes(flag);
                            return (
                              <span key={flag} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm border ${isActive ? 'bg-(--primary) text-white border-(--primary) shadow-sm' : 'bg-white text-(--text) border-(--border)'}`}>
                                {flag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : viewTab === 'details' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[['Work History', viewCandidate.work_history], ['Certifications', viewCandidate.certifications], ['Desired Salary', viewCandidate.desired_salary], ['Position', viewCandidate.position_screened]].map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">{label}</span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{val || <span className="text-(--muted) italic">No data available</span>}</p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">Skills</span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{viewCandidate.skills || <span className="text-(--muted) italic">No data available</span>}</p>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">Pag-Ibig Number</span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{viewCandidate.pagibig_number || <span className="text-(--muted) italic">No data available</span>}</p>
                      </div>
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">Highest Educational Attainment</span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{viewCandidate.highest_educ_attainment || <span className="text-(--muted) italic">No data available</span>}</p>
                      </div>
                      {[['Elementary School', viewCandidate.school_elementary], ['Junior High School', viewCandidate.school_junior_high], ['Senior High School', viewCandidate.school_senior_high], ['College', viewCandidate.school_college]].map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">{label}</span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{val || <span className="text-(--muted) italic">No data available</span>}</p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">Other School / Training Center</span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">{viewCandidate.school_other_name || viewCandidate.school_other || <span className="text-(--muted) italic">No data available</span>}</p>
                      </div>
                    </div>
                  ) : viewTab === 'documents' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {documentTypes.map(([key, label]) => (
                        <div key={key} className="p-3 border border-(--border) rounded-md bg-white">
                          <div className="text-sm font-bold text-(--muted) mb-2">{label}</div>
                          {viewCandidate.documents?.[key]
                            ? <button type="button" onClick={() => handleDocumentDownload(key, viewCandidate.documents![key] as File | string)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-xl bg-white text-xs font-semibold text-(--primary) cursor-pointer hover:bg-(--surface2) transition-colors">
                                <Icon icon="tabler:download" width="14" height="14" />
                                {typeof viewCandidate.documents[key] === 'string' ? 'Download File' : (viewCandidate.documents[key] as File).name}
                              </button>
                            : <span className="text-sm text-(--muted) flex items-center gap-1.5"><Icon icon="teenyicons:file-no-access-outline" width="20" height="20" />No file uploaded</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 text-sm">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-(--muted)">Notes</span>
                        <textarea className="w-full min-h-44 border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none" value={viewCandidate.notes ?? ''} placeholder="No notes added." readOnly />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </Modal>

            {/* Auth Modal */}
            <Modal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title="Admin Authentication">
              <form onSubmit={handleAdminAuthSubmit} className="grid gap-3">
                <p className="text-sm text-(--muted)">Enter admin password to view archived candidates (view-only).</p>
                <label className="grid gap-1">
                  <input type="password" value={adminPasswordInput} onChange={(e) => setAdminPasswordInput(e.target.value)} className="w-full border border-(--border) bg-white text-(--text) rounded-xl px-3 py-2 text-sm" placeholder="Admin password" required />
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
                  <div className="py-6 text-center text-(--muted) flex flex-col items-center gap-2">
                    <Icon icon="tabler:archive-off" width="44" height="44" />
                    No archived candidates
                  </div>
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
                              {(userRole === 'administrator' || userRole === 'manager') && !staffViewOnly && (
                                <button type="button" onClick={() => handleRestore(ac)} className="cursor-pointer px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-xs font-semibold">Restore</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="button" onClick={() => setIsArchiveOpen(false)} className="border border-(--border) bg-white text-(--text) text-sm rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105">Close</button>
                </div>
              </div>
            </Modal>

            {/* Add / Edit Modal */}
            <Modal open={isModalOpen || isEditModalOpen} onClose={isModalOpen ? handleCloseModal : handleCloseEditModal} title={isModalOpen ? "Add Candidate" : "Edit Candidate"}>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-2.5" onSubmit={isModalOpen ? onSubmit : onEditSubmit}>
                <div className="col-span-2 mb-4">
                  <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-md">
                    {(['info', 'details', 'documents'] as const).map((tab) => (
                      <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md text-sm font-semibold transition ${activeTab === tab ? 'bg-white text-(--primary) border border-(--border) shadow-sm' : 'text-(--muted) hover:bg-(--surface3)'}`}>
                        {tab === 'info' ? 'Informations' : tab === 'details' ? 'Work Details' : 'Documents'}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === 'info' ? (
                  <>
                    <div className="col-span-2 flex flex-col items-center gap-3 mb-2">
                      <img src={formProfilePreviewUrl ?? defaultProfile} alt="Profile preview" className="w-24 h-24 rounded-full object-cover border border-(--border)" />
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-(--border) rounded-md bg-white text-sm text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors">
                        <Icon icon="tabler:camera" width="16" height="16" />
                        <span className="font-medium">Upload Profile Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleProfilePhotoChange}
                        />
                      </label>
                    </div>
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Last Name</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="e.g., Dela Cruz" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">First Name</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="e.g., Juan" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Middle Name</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="e.g., Santos" value={form.middle_name} onChange={e => setForm(f => ({ ...f, middle_name: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Email</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="e.g., juan@example.com" /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Home Address</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" placeholder="123 Brgy. Example" value={form.home_address} onChange={e => setForm(f => ({ ...f, home_address: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Permanent Address</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" placeholder="123 Brgy. Example" value={form.permanent_address} onChange={e => setForm(f => ({ ...f, permanent_address: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Suffix</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="e.g., Jr., Sr." value={form.suffix} onChange={e => setForm(f => ({ ...f, suffix: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Prefix</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="e.g., Mr., Ms." value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Phone Number</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} inputMode="numeric" placeholder="e.g., 09171234567" /></label>
                      <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Marital Status</span>
                          <Selection value={form.marital_status} onChange={val => setForm(f => ({ ...f, marital_status: val }))} options={[{ value: '', label: 'Select...' }, { value: 'Single', label: 'Single' }, { value: 'Married', label: 'Married' }, { value: 'Widowed', label: 'Widowed' }]} placeholder="Select..." />
                        </label>
                        <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Status</span>
                          <Selection value={form.status} onChange={(val) => setForm((f) => ({ ...f, status: val }))} options={candidateStatuses.map((s) => ({ value: s, label: s }))} placeholder="Select status" />
                        </label>
                      </div>
                      <div className="col-span-1 md:col-span-3 grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">Action Required</span>
                        <div className="flex flex-wrap gap-2 items-center pt-0.5">
                          {availableFlags.map((flag) => {
                            const isActive = (form.action_required ?? []).includes(flag);
                            return (
                              <button key={flag} type="button" onClick={() => setForm((prev) => { const current = prev.action_required ?? []; const next = current.includes(flag) ? current.filter((f) => f !== flag) : [...new Set([...current, flag])]; return { ...prev, action_required: next }; })}
                                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 ${isActive ? 'bg-(--primary) text-white border-(--primary) shadow-sm' : 'bg-white text-(--text) border-(--border) hover:bg-(--surface2)'}`}>
                                {flag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <label className="col-span-1 md:col-span-3 grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">Notes</span>
                        <textarea className="w-full min-h-18 border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g., Available immediately; willing to relocate." />
                      </label>
                    </div>
                  </>
                ) : activeTab === 'details' ? (
                  <>
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Work History</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" value={form.work_history} onChange={(e) => setForm((f) => ({ ...f, work_history: e.target.value }))} placeholder="e.g., Company - Role (2018-2020)" /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Certifications</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" value={form.certifications} onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))} placeholder="e.g., NC II, First Aid" /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Desired Salary</span><input className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" value={form.desired_salary} onChange={(e) => setForm((f) => ({ ...f, desired_salary: e.target.value }))} placeholder="" /></label>

                      {/* Position — now using IndustryPositionPicker */}
                      <div className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">Position</span>
                        <IndustryPositionPicker
                          positions={positionsList}
                          value={form.position_screened}
                          onChange={(title) => setForm((f) => ({ ...f, position_screened: title }))}
                          loading={positionsLoading}
                          placeholder="Select a position..."
                        />
                      </div>

                      <label 
                        className="col-span-1 md:col-span-2 grid gap-1.25">
                          <span 
                            className="text-sm text-(--muted) font-bold">
                              Skills
                          </span>
                          <input 
                            className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none" 
                            value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} placeholder="" /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Pag-Ibig Number</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="XXXXXXXXXXXX" value={form.pagibig_number} onChange={e => setForm(f => ({ ...f, pagibig_number: e.target.value }))} /></label>
                      <div className="col-span-1 md:col-span-2">
                        <Selection value={form.highest_educ_attainment} onChange={val => setForm(f => ({ ...f, highest_educ_attainment: val }))} options={[{ value: '', label: 'Select...' }, { value: 'Elementary', label: 'Elementary' }, { value: 'Highschool', label: 'Highschool' }, { value: 'College', label: 'College' }, { value: 'Postgraduate', label: 'Postgraduate' }]} label="Highest Educational Attainment" placeholder="Select..." />
                      </div>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Elementary School</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="" value={form.school_elementary} onChange={e => setForm(f => ({ ...f, school_elementary: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Junior High School</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="" value={form.school_junior_high} onChange={e => setForm(f => ({ ...f, school_junior_high: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Senior High School</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="" value={form.school_senior_high} onChange={e => setForm(f => ({ ...f, school_senior_high: e.target.value }))} /></label>
                      <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">College</span><input className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm" placeholder="" value={form.school_college} onChange={e => setForm(f => ({ ...f, school_college: e.target.value }))} /></label>
                      <div className="col-span-1 md:col-span-2 grid gap-1.25">
                        <label className="grid gap-1.25"><span className="text-sm text-(--muted) font-bold">Other School / Training Center</span><input className="w-full border border-(--border) rounded-md px-3 py-2.5 text-sm" placeholder="" value={form.school_other_name || ''} onChange={e => setForm(f => ({ ...f, school_other_name: e.target.value }))} /></label>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {documentTypes.map(([key, label]) => (
                      <div key={key} className="col-span-1 p-3 border border-(--border) rounded-md bg-white">
                        <div className="text-sm font-bold text-(--muted) mb-2">{label}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label htmlFor={`file-${key}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-md bg-white text-sm text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors">
                            <Icon icon="tabler:upload" width="14" height="14" />Upload
                          </label>
                          <input 
                            id={`file-${key}`} 
                            type="file" 
                            accept=".pdf,application/pdf" 
                            onChange={(e) => handleDocumentFileChange(e, key)} 
                            className="hidden" 
                          />
                          {form.documents?.[key]
                            ? typeof form.documents[key] === 'string'
                              ? <span className="inline-flex items-center gap-1 text-xs text-(--primary) font-medium truncate max-w-40">
                                  <Icon icon="tabler:file" width="13" height="13" />
                                  Uploaded file
                                  <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, documents: { ...(prev.documents ?? {}), [key]: null } }))}
                                    className="ml-1 text-(--muted) hover:text-red-500 transition-colors"
                                    title="Remove file"
                                  >
                                    <Icon icon="tabler:x" width="13" height="13" />
                                  </button>
                                </span>
                              : <span className="inline-flex items-center gap-1 text-xs text-(--text) font-medium truncate max-w-100">
                                  <Icon icon="tabler:file" width="18" height="18" />
                                  {(form.documents[key] as File).name}
                                  <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, documents: { ...(prev.documents ?? {}), [key]: null } }))}
                                    className="ml-1 text-gray-500 hover:text-red-500 transition-colors"
                                    title="Remove file"
                                  >
                                    <Icon icon="tabler:x" width="18" height="18" />
                                  </button>
                                </span>
                            : <span className="text-sm text-(--muted)">No file selected</span>}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105" onClick={isModalOpen ? handleCloseModal : handleCloseEditModal} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="border-none text-white text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105" disabled={isSubmitting}>
                    {isSubmitting ? (isModalOpen ? "Creating..." : "Saving...") : (isModalOpen ? "Add Candidate" : "Save Changes")}
                  </button>
                </div>
                {error && <p className="col-span-2 mt-3 text-[#9f2d20] text-sm">{error}</p>}
              </form>
            </Modal>

            {/* Delete Modal */}
            <Modal open={isDeleteModalOpen} onClose={handleCloseDeleteModal} title="Archive Candidate">
              <form onSubmit={e => { e.preventDefault(); onDeleteSubmit(); }} className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                    <Icon icon="tabler:archive" width="38" height="38" className="text-red-500" />
                  </div>
                  <p className="text-base font-semibold text-(--text) mb-1">Are you sure you want to <span className="text-red-600 font-bold">archive</span> this candidate?</p>
                  <p className="text-sm text-(--muted)"><span className="font-bold">{deleteCandidate?.full_name}</span> ({deleteCandidate?.email})</p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold hover:bg-(--surface2)" onClick={handleCloseDeleteModal} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-md px-4 py-2 font-bold hover:brightness-110 shadow-md shadow-red-200" disabled={isSubmitting}>{isSubmitting ? "Archiving..." : "Archive"}</button>
                </div>
                {error && <p className="mt-3 text-[#9f2d20] text-sm text-center">{error}</p>}
              </form>
            </Modal>
          </section>

          <div className="mt-2 w-full">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} perPage={perPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
          </div>
        </main>
      </div>
    </div>
  );
}
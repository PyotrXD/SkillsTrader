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
import { generateResumeHtml } from "./resumeTemplate";
import { getUserRole, pb } from "../../lib/pocketbase/pb";
import { addAuditLog } from "../../utils/auditLog";
import { computeCandidateFlags } from "../../utils/candidateFlags";
import type {
  CandidateForm,
  ArchivedCandidate,
  CandidateRecord,
  DocumentRecord,
  InterviewSummary,
  PositionRecord,
  StatusRule,
} from "../../types/Candidate";
import { hasChanges } from "../../utils/hasChanges";

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
  profile_photo: null,
  documents: {},
};

// Flag display badges
const flagBadge: Record<string, string> = {
  "Not Interviewed": "bg-orange-100 text-orange-800",
  "Not Scheduled": "bg-sky-100 text-sky-800",
  "Missing Docs": "bg-red-100 text-red-800",
  Completed: "bg-green-100 text-green-800",
};

const quickFilters = [
  { key: "not-interviewed", label: "Not Interviewed" },
  { key: "not-scheduled", label: "Not Scheduled" },
  { key: "missing-docs", label: "Missing Docs" },
];

const documentTypes: Array<[string, string]> = [
  ["resume", "Resume"],
  ["passport", "Passport"],
  ["visa", "VISA"],
  ["nbi_clearance", "NBI Clearance"],
  ["police_clearance", "Police Clearance"],
  ["offer_letter", "Offer Letter"],
  ["dmw_approved_contract", "DMW Approved Contract"],
  ["overseas_employment_certificate", "Overseas Employment Certificate"],
  ["peos_certificate", "PEOS Certificate"],
  ["e_registration_file", "E-registration File"],
  ["other", "Other"],
];

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function createEmptyDocumentsMap(): Record<string, string | null> {
  const docs: Record<string, string | null> = {};
  for (const [key] of documentTypes) docs[key] = null;
  return docs;
}

const statusRules: Record<string, StatusRule> = {
  "Lined-Up": {
    warning: (c) =>
      (c.computed_flags ?? []).includes("Not Scheduled")
        ? "No interview scheduled yet. Please schedule first before setting as Lined-Up."
        : null,
  },
  "For final interview": {
    disabled: (c) =>
      !["Lined-Up", "For final interview"].includes(c.status ?? ""),
    disabledReason: "Must be Lined-Up first.",
    warning: (c) =>
      (c.computed_flags ?? []).includes("Not Interviewed")
        ? "No interview result yet. Proceed to Final Interview?"
        : null,
  },
  "For medical": {
    disabled: (c) => {
      const docs = c.documents ?? {};
      return !(
        docs["resume"] &&
        docs["nbi_clearance"] &&
        docs["police_clearance"]
      );
    },
    disabledReason:
      "Resume, NBI Clearance, and Police Clearance are required.",
  },
  "Fit to work": {
    disabled: (c) =>
      !["For medical", "Pending medical", "Fit to work"].includes(
        c.status ?? "",
      ),
    disabledReason: "Must be For Medical or Pending Medical first.",
  },
  "Unfit to work": {
    disabled: (c) =>
      !["For medical", "Pending medical", "Unfit to work"].includes(
        c.status ?? "",
      ),
    disabledReason: "Must be For Medical or Pending Medical first.",
  },
  "Pending medical": {
    disabled: (c) =>
      !["For medical", "Pending medical"].includes(c.status ?? ""),
    disabledReason: "Must be For Medical first.",
  },
  "For deployment": {
    disabled: (c) =>
      !["Fit to work", "For deployment"].includes(c.status ?? ""),
    disabledReason: "Must be Fit to Work first.",
    warning: (c) => {
      const docs = c.documents ?? {};
      const missing = ["offer_letter", "dmw_approved_contract"].filter(
        (key) => !docs[key],
      );
      return missing.length > 0
        ? `Missing deployment docs: ${missing.map((k) =>
            k.replace(/_/g, " "),
          ).join(", ")}.`
        : null;
    },
  },
  "Awaiting Visa": {
    disabled: (c) =>
      !["For deployment", "Awaiting Visa"].includes(c.status ?? ""),
    disabledReason: "Must be For Deployment first.",
  },
  "Visa Arrived": {
    disabled: (c) =>
      !["Awaiting Visa", "Visa Arrived"].includes(c.status ?? ""),
    disabledReason: "Must be Awaiting Visa first.",
  },
  Deployed: {
    disabled: (c) => !["Visa Arrived", "Deployed"].includes(c.status ?? ""),
    disabledReason: "Must be Visa Arrived first.",
    warning: (c) => {
      const docs = c.documents ?? {};
      const missing = [
        "overseas_employment_certificate",
        "peos_certificate",
        "e_registration_file",
      ].filter((key) => !docs[key]);
      return missing.length > 0
        ? `Missing deployment docs: ${missing.map((k) =>
            k.replace(/_/g, " "),
          ).join(", ")}.`
        : null;
    },
  },
};

export default function Candidates() {
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
  const [isListLoading, setIsListLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [positionsList, setPositionsList] = useState<
    Array<{ id: string; industry: string; title: string }>
  >([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [archivedCandidates, setArchivedCandidates] = useState<
    ArchivedCandidate[]
  >([]);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archivedPage, setArchivedPage] = useState(1);
  const [archivedTotalPages, setArchivedTotalPages] = useState(1);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [viewTab, setViewTab] = useState<
    "info" | "details" | "documents" | "notes"
  >("info");
  const [activeTab, setActiveTab] = useState<"info" | "details" | "documents">(
    "info",
  );
  const printRef = useRef<HTMLDivElement | null>(null);

  // ─── Status Warning Modal ─────────────────────────────────────────────────
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusWarning, setStatusWarning] = useState<string | null>(null);
  const [showStatusWarningModal, setShowStatusWarningModal] = useState(false);

  const userRole = useMemo(() => getUserRole() ?? "staff", []);
  const canManageCandidates =
    userRole === "administrator" || userRole === "manager";

  const canRestoreArchived = canManageCandidates;

  function getStatusOptions(candidate: CandidateForm | null) {
    return candidateStatuses.map((s) => {
      const rule = statusRules[s];
      const isDisabled = candidate
        ? (rule?.disabled?.(candidate) ?? false)
        : false;
      return {
        value: s,
        label:
          isDisabled && rule?.disabledReason
            ? `${s} — ${rule.disabledReason}`
            : s,
        disabled: isDisabled,
      };
    });
  }

  function handleStatusChange(newStatus: string) {
    if (!editCandidate) {
      // Add modal — walang existing data, set lang directly
      setForm((f) => ({ ...f, status: newStatus }));
      return;
    }

    const rule = statusRules[newStatus];
    const warning = rule?.warning?.(editCandidate) ?? null;

    if (warning) {
      setPendingStatus(newStatus);
      setStatusWarning(warning);
      setShowStatusWarningModal(true);
    } else {
      setForm((f) => ({ ...f, status: newStatus }));
    }
  }

  function confirmStatusChange() {
    if (pendingStatus) {
      setForm((f) => ({ ...f, status: pendingStatus }));
    }
    setPendingStatus(null);
    setStatusWarning(null);
    setShowStatusWarningModal(false);
  }

  function cancelStatusChange() {
    setPendingStatus(null);
    setStatusWarning(null);
    setShowStatusWarningModal(false);
  }

  // ─── Filter builder ───────────────────────────────────────────────────────

  function buildCandidateFilter(archived: boolean): string {
    const conditions: string[] = [
      `is_archived = ${archived ? "true" : "false"}`,
    ];

    const query = search.trim();
    if (query) {
      const value = escapeFilterValue(query);
      conditions.push(
        `(full_name ~ "${value}" || last_name ~ "${value}" || first_name ~ "${value}" || middle_name ~ "${value}" || email ~ "${value}" || position_screened ~ "${value}")`,
      );
    }

    if (statusFilter)
      conditions.push(`status = "${escapeFilterValue(statusFilter)}"`);
    if (dateFrom) conditions.push(`consent_at >= "${dateFrom}"`);
    if (dateTo) conditions.push(`consent_at <= "${dateTo}"`);

    // Quick filters: not-interviewed and not-scheduled exclude terminal statuses
    // missing-docs is handled client-side after documents are fetched
    if (quickFilter === "not-interviewed") {
      conditions.push(
        `(status != "Deployed" && status != "Rejected" && status != "Unfit to work")`,
      );
    } else if (quickFilter === "not-scheduled") {
      conditions.push(
        `(status != "Deployed" && status != "Rejected" && status != "Unfit to work")`,
      );
    }

    return conditions.join(" && ");
  }

  // ─── Data fetching ────────────────────────────────────────────────────────

  async function fetchDocumentsByCandidate(
    candidateIds: string[],
  ): Promise<Record<string, Record<string, string | null>>> {
    if (candidateIds.length === 0) return {};

    const candidateFilter = candidateIds
      .map((id) => `candidate = "${escapeFilterValue(id)}"`)
      .join(" || ");

    const documents: DocumentRecord[] = [];
    let currentPage = 1;
    const perPageSize = 200;

    while (true) {
      const result = await pb
        .collection("documents")
        .getList<DocumentRecord>(currentPage, perPageSize, {
          filter: candidateFilter,
          sort: "-created",
          requestKey: null,
        });
      documents.push(...result.items);
      if (currentPage >= result.totalPages) break;
      currentPage += 1;
    }

    const token = await pb.files.getToken({ requestKey: null });
    const documentsByCandidate: Record<
      string,
      Record<string, string | null>
    > = {};
    for (const id of candidateIds) {
      documentsByCandidate[id] = createEmptyDocumentsMap();
    }

    for (const doc of documents) {
      if (!doc.candidate || !doc.file || !doc.doc_type) continue;
      if (!documentsByCandidate[doc.candidate]) continue;
      if (documentsByCandidate[doc.candidate][doc.doc_type]) continue;
      documentsByCandidate[doc.candidate][doc.doc_type] = pb.files.getURL(
        doc,
        doc.file,
        { token },
      );
    }

    return documentsByCandidate;
  }

  /**
   * Fetch the latest interview record for each candidate in a single batch query.
   * Returns a map of candidateId → InterviewSummary (or null if none exists).
   */
  async function fetchInterviewsByCandidates(
    candidateIds: string[],
  ): Promise<Record<string, InterviewSummary | null>> {
    if (candidateIds.length === 0) return {};

    const interviewMap: Record<string, InterviewSummary | null> = {};
    for (const id of candidateIds) interviewMap[id] = null;

    try {
      const candidateFilter = candidateIds
        .map((id) => `candidate = "${escapeFilterValue(id)}"`)
        .join(" || ");

      // Fetch all interviews for these candidates in one query, sorted newest first
      const result = await pb.collection("interviews").getList<{
        id: string;
        candidate?: string;
        interview_date?: string;
        result?: string;
      }>(1, 500, {
        filter: candidateFilter,
        sort: "-created",
        requestKey: null,
      });

      // Keep only the first (latest) interview per candidate
      for (const item of result.items) {
        if (!item.candidate) continue;
        if (interviewMap[item.candidate] !== null) continue; // already have one
        interviewMap[item.candidate] = {
          interview_date: item.interview_date ?? null,
          result: item.result ?? null,
        };
      }
    } catch (err) {
      console.error("Failed to fetch interviews for candidates:", err);
    }

    return interviewMap;
  }

  async function mapCandidateRecords(
    items: CandidateRecord[],
  ): Promise<CandidateForm[]> {
    if (!pb.authStore.isValid) return [];

    const candidateIds = items.map((item) => item.id);
    const photoToken = await pb.files.getToken({ requestKey: null });

    // Fetch documents and interviews in parallel
    const [documentsByCandidate, interviewsByCandidate] = await Promise.all([
      fetchDocumentsByCandidate(candidateIds),
      fetchInterviewsByCandidates(candidateIds),
    ]);

    return items.map((item) => {
      const status = item.status ?? "New Applicant";
      const documents =
        documentsByCandidate[item.id] ?? createEmptyDocumentsMap();
      const interview = interviewsByCandidate[item.id] ?? null;

      // Compute flags fresh — never rely on stored action_required
      const computedFlags = computeCandidateFlags(
        { status, documents },
        interview,
      );

      return {
        id: item.id,
        full_name: item.full_name ?? "",
        last_name: item.last_name ?? "",
        first_name: item.first_name ?? "",
        middle_name: item.middle_name ?? "",
        prefix: item.prefix ?? "",
        suffix: item.suffix ?? "",
        marital_status: item.marital_status ?? "",
        home_address: item.home_address ?? "",
        permanent_address: item.permanent_address ?? "",
        pagibig_number: item.pagibig_number ?? "",
        highest_educ_attainment: item.highest_educ_attainment ?? "",
        school_elementary: item.school_elementary ?? "",
        school_junior_high: item.school_junior_high ?? "",
        school_senior_high: item.school_senior_high ?? "",
        school_college: item.school_college ?? "",
        school_other: item.school_other ?? "",
        school_other_name: item.school_other_name ?? "",
        email: item.email ?? "",
        phone: item.phone ?? "",
        address: item.address ?? "",
        education: item.education ?? "",
        work_history: item.work_history ?? "",
        skills: item.skills ?? "",
        certifications: item.certifications ?? "",
        desired_salary: item.desired_salary ?? "",
        position_screened: item.position_screened ?? "",
        notes: item.notes ?? "",
        status,
        consent_given: item.consent_given ?? false,
        consent_at: item.consent_at ?? "",
        consent_source: item.consent_source ?? "",
        consent_version: item.consent_version ?? "",
        // Store computed flags on the form object for rendering
        computed_flags: computedFlags,
        is_archived: item.is_archived ?? false,
        archived_at: item.archived_at ?? "",
        archived_by: item.archived_by ?? "",
        profile_photo: item.photo
          ? pb.files.getURL(item, item.photo, { token: photoToken })
          : null,
        documents,
      };
    });
  }

  async function fetchCandidatePage(targetPage: number) {
    if (!pb.authStore.isValid) return;
    setIsListLoading(true);
    try {
      const result = await pb
        .collection("candidates")
        .getList<CandidateRecord>(targetPage, perPage, {
          sort: "-updated",
          filter: buildCandidateFilter(false),
          requestKey: null,
        });

      let mapped = await mapCandidateRecords(result.items);

      // Client-side quick filter for missing-docs and fine-grained flag filters
      // (PocketBase can't query computed flags in related collections)
      if (quickFilter === "missing-docs") {
        mapped = mapped.filter((c) =>
          (c.computed_flags ?? []).includes("Missing Docs"),
        );
      } else if (quickFilter === "not-interviewed") {
        mapped = mapped.filter((c) =>
          (c.computed_flags ?? []).includes("Not Interviewed"),
        );
      } else if (quickFilter === "not-scheduled") {
        mapped = mapped.filter((c) =>
          (c.computed_flags ?? []).includes("Not Scheduled"),
        );
      }

      setPagedCandidates(mapped);
      setTotalPages(Math.max(1, result.totalPages));
      if (result.page !== page) setPage(result.page);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
      setPagedCandidates([]);
      setTotalPages(1);
    } finally {
      setIsListLoading(false);
    }
  }

  async function fetchArchivedCandidates(targetPage: number) {
    setArchivedLoading(true);
    try {
      const result = await pb
        .collection("candidates")
        .getList<CandidateRecord>(targetPage, perPage, {
          sort: "-archived_at",
          filter: `is_archived = true`,
          requestKey: null,
        });
      const mapped = await mapCandidateRecords(result.items);
      setArchivedCandidates(mapped);
      setArchivedTotalPages(Math.max(1, result.totalPages));
      if (result.page !== archivedPage) setArchivedPage(result.page);
    } catch (err) {
      console.error("Failed to fetch archived candidates:", err);
      setArchivedCandidates([]);
      setArchivedTotalPages(1);
    } finally {
      setArchivedLoading(false);
    }
  }

  useEffect(() => {
    if (!pb.authStore.isValid) return;
    void fetchCandidatePage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    perPage,
    search,
    statusFilter,
    dateFrom,
    dateTo,
    quickFilter,
    refreshToken,
  ]);

  useEffect(() => {
    if (!isArchiveOpen) return;
    void fetchArchivedCandidates(archivedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArchiveOpen, archivedPage, perPage, refreshToken]);

  useEffect(() => {
    let mounted = true;
    async function fetchPositions() {
      setPositionsLoading(true);
      try {
        const items = await pb
          .collection("positions")
          .getFullList<PositionRecord>({
            sort: "industry,title",
            requestKey: null,
          });
        if (!mounted) return;
        setPositionsList(
          items.map((it) => ({
            id: it.id,
            industry: it.industry ?? "",
            title: it.title ?? "",
          })),
        );
      } catch (err) {
        console.error("Failed to load positions from PocketBase", err);
        if (!mounted) return;
        setPositionsList([]);
      } finally {
        if (mounted) setPositionsLoading(false);
      }
    }
    fetchPositions();
    return () => {
      mounted = false;
    };
  }, []);

  // ─── Feedback ─────────────────────────────────────────────────────────────

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  // ─── Modal handlers ───────────────────────────────────────────────────────

  function handleOpenModal() {
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
    setActiveTab("info");
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setError("");
  }

  function handleEdit(candidate: CandidateForm) {
    setEditCandidate(candidate);
    setForm({
      ...candidate,
      position_screened: candidate.position_screened ?? "",
      notes: candidate.notes ?? "",
    });
    setIsEditModalOpen(true);
    setError("");
    setActiveTab("info");
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
    setViewTab("info");
    addAuditLog({
      actor_email: pb.authStore.record?.email ?? "unknown",
      actor_role: getUserRole() ?? "staff",
      action: "view",
      entity: "Candidate",
      entity_name: candidate.full_name || String(candidate.id ?? "—"),
    });
  }

  function handleCloseViewModal() {
    setViewCandidate(null);
  }

  // ─── Submit handlers ──────────────────────────────────────────────────────

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const computedFullName =
        [form.last_name, form.first_name, form.middle_name]
          .filter(Boolean)
          .join(" ") ||
        form.full_name ||
        "Unknown";

      // action_required is NOT sent — it's always computed from data
      const payload: Record<string, unknown> = {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name,
        prefix: form.prefix || null,
        suffix: form.suffix || null,
        full_name: computedFullName,
        marital_status: form.marital_status || null,
        home_address: form.home_address || null,
        permanent_address: form.permanent_address || null,
        pagibig_number: form.pagibig_number || null,
        highest_educ_attainment: form.highest_educ_attainment || null,
        school_elementary: form.school_elementary || null,
        school_junior_high: form.school_junior_high || null,
        school_senior_high: form.school_senior_high || null,
        school_college: form.school_college || null,
        school_other: form.school_other || null,
        school_other_name: form.school_other_name || null,
        email: form.email,
        phone: form.phone,
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
      };

      if (form.profile_photo instanceof File)
        payload["photo"] = form.profile_photo;

      const record = await pb.collection("candidates").create(payload);
      await createDocumentsForCandidate(record.id, form.documents || {});

      addAuditLog({
        actor_email: pb.authStore.record?.email ?? "unknown",
        actor_role: getUserRole() ?? "staff",
        action: "create",
        entity: "Candidate",
        entity_name:
          [form.last_name, form.first_name].filter(Boolean).join(", ") ||
          computedFullName,
      });

      showFeedback("success", "Candidate added successfully.");
      setIsModalOpen(false);
      setForm(initialForm);
      setRefreshToken((v) => v + 1);
    } catch (err: unknown) {
      const errorLike = err as { data?: unknown; message?: string };
      const detail = errorLike.data
        ? JSON.stringify(errorLike.data)
        : (errorLike.message ?? "");
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

    // action_required removed from change detection — it's computed, not stored
    const changed = hasChanges(editCandidate!, form, [
      "last_name",
      "first_name",
      "middle_name",
      "email",
      "phone",
      "home_address",
      "permanent_address",
      "suffix",
      "prefix",
      "marital_status",
      "status",
      "notes",
      "work_history",
      "certifications",
      "desired_salary",
      "position_screened",
      "skills",
      "pagibig_number",
      "highest_educ_attainment",
      "school_elementary",
      "school_junior_high",
      "school_senior_high",
      "school_college",
      "school_other_name",
      "consent_given",
      "profile_photo",
      "documents",
    ]);

    if (!changed) {
      showFeedback("info", "No changes detected. Nothing was updated.");
      setIsEditModalOpen(false);
      setIsSubmitting(false);
      return;
    }

    try {
      const computedFullNameEdit =
        [form.last_name, form.first_name, form.middle_name]
          .filter(Boolean)
          .join(" ") ||
        form.full_name ||
        "Unknown";

      // action_required is NOT sent — computed from data
      const payload: Record<string, unknown> = {
        last_name: form.last_name,
        first_name: form.first_name,
        middle_name: form.middle_name,
        prefix: form.prefix || null,
        suffix: form.suffix || null,
        full_name: computedFullNameEdit,
        marital_status: form.marital_status || null,
        home_address: form.home_address || null,
        permanent_address: form.permanent_address || null,
        pagibig_number: form.pagibig_number || null,
        highest_educ_attainment: form.highest_educ_attainment || null,
        school_elementary: form.school_elementary || null,
        school_junior_high: form.school_junior_high || null,
        school_senior_high: form.school_senior_high || null,
        school_college: form.school_college || null,
        school_other: form.school_other || null,
        school_other_name: form.school_other_name || null,
        email: form.email,
        phone: form.phone,
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
      };

      if (form.profile_photo instanceof File)
        payload["photo"] = form.profile_photo;

      await pb
        .collection("candidates")
        .update(String(editCandidate?.id), payload);
      await updateDocumentsForCandidate(
        String(editCandidate?.id),
        editCandidate?.documents || {},
        form.documents || {},
      );

      addAuditLog({
        actor_email: pb.authStore.record?.email ?? "unknown",
        actor_role: getUserRole() ?? "staff",
        action: "update",
        entity: "Candidate",
        entity_name:
          [form.last_name, form.first_name].filter(Boolean).join(", ") ||
          computedFullNameEdit,
      });

      showFeedback("success", "Candidate updated successfully.");
      setIsEditModalOpen(false);
      setRefreshToken((v) => v + 1);
    } catch (err: unknown) {
      const errorLike = err as { data?: unknown; message?: string };
      const detail = errorLike.data
        ? JSON.stringify(errorLike.data)
        : (errorLike.message ?? "");
      setError(`Failed to update candidate. ${detail}`);
      showFeedback("error", `Failed to update candidate. ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDeleteSubmit() {
    setIsSubmitting(true);
    try {
      if (!deleteCandidate) {
        showFeedback("error", "No candidate selected.");
        setIsDeleteModalOpen(false);
        return;
      }
      await pb.collection("candidates").update(String(deleteCandidate.id), {
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: pb.authStore.record?.id ?? null,
      });
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? "unknown",
        actor_role: getUserRole() ?? "staff",
        action: "archive",
        entity: "Candidate",
        entity_name:
          deleteCandidate.full_name || String(deleteCandidate.id ?? "—"),
      });
      setRefreshToken((v) => v + 1);
      showFeedback("success", "Candidate archived.");
      setIsDeleteModalOpen(false);
    } catch {
      showFeedback("error", "Failed to archive candidate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Document helpers ─────────────────────────────────────────────────────

  async function createDocumentsForCandidate(
    candidateId: string,
    documents: Record<string, string | File | null>,
  ) {
    const promises: Promise<unknown>[] = [];
    for (const [key, val] of Object.entries(documents)) {
      if (val instanceof File) {
        promises.push(
          pb.collection("documents").create({
            candidate: candidateId,
            doc_type: key,
            file: val,
            status: "Submitted",
          }),
        );
      }
    }
    if (promises.length > 0) await Promise.all(promises);
  }

  async function updateDocumentsForCandidate(
    candidateId: string,
    oldDocuments: Record<string, string | File | null>,
    newDocuments: Record<string, string | File | null>,
  ) {
    for (const [key, oldVal] of Object.entries(oldDocuments)) {
      const newVal = newDocuments[key];
      if (oldVal && !newVal) {
        try {
          let currentPage = 1;
          while (true) {
            const existingDocs = await pb
              .collection("documents")
              .getList<DocumentRecord>(currentPage, 200, {
                filter: `candidate = "${escapeFilterValue(candidateId)}" && doc_type = "${escapeFilterValue(key)}"`,
                requestKey: null,
              });
            for (const doc of existingDocs.items) {
              await pb.collection("documents").delete(doc.id);
            }
            if (currentPage >= existingDocs.totalPages) break;
            currentPage += 1;
          }
        } catch (err) {
          console.error(`Failed to delete document type ${key}:`, err);
        }
      }
    }
    await createDocumentsForCandidate(candidateId, newDocuments);
  }

  // ─── File input handlers ──────────────────────────────────────────────────

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showFeedback(
        "error",
        "Invalid file type. Please upload an image (JPG, PNG, etc.)",
      );
      e.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showFeedback("error", "File is too large. Maximum size is 2MB.");
      e.target.value = "";
      return;
    }
    setForm((f) => ({ ...f, profile_photo: file }));
  };

  const handleDocumentFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      showFeedback(
        "error",
        "Invalid file type. Only PDF documents are allowed.",
      );
      e.target.value = "";
      return;
    }
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

  // ─── Download helpers ─────────────────────────────────────────────────────

  const profileUrl = useMemo(() => {
    if (!viewCandidate) return defaultProfile;
    const pp = viewCandidate.profile_photo;
    if (pp) {
      if (typeof pp === "string" && pp) return pp;
      if (pp instanceof File) {
        try {
          return URL.createObjectURL(pp);
        } catch {
          return defaultProfile;
        }
      }
    }
    return defaultProfile;
  }, [viewCandidate]);

  useEffect(() => {
    return () => {
      try {
        if (profileUrl?.startsWith("blob:")) URL.revokeObjectURL(profileUrl);
      } catch {
        /* ignore */
      }
    };
  }, [profileUrl]);

  const [formProfilePreviewUrl, setFormProfilePreviewUrl] = useState<
    string | null
  >(null);
  useEffect(() => {
    const pp = form.profile_photo;
    if (!pp) {
      setFormProfilePreviewUrl(null);
      return;
    }
    if (typeof pp === "string") {
      setFormProfilePreviewUrl(pp);
      return;
    }
    if (pp instanceof File) {
      const url = URL.createObjectURL(pp);
      setFormProfilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return undefined;
  }, [form.profile_photo]);

  function handleDownloadPdf() {
    if (!viewCandidate) return;
    const html = generateResumeHtml(viewCandidate, profileUrl);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* ignore */
      }
    }, 500);
  }

  async function handleDocumentDownload(_key: string, doc: File | string) {
    if (typeof doc === "string") {
      try {
        const freshToken = await pb.files.getToken();
        const baseUrl = doc.split("?")[0];
        window.open(`${baseUrl}?token=${freshToken}`, "_blank", "noreferrer");
      } catch {
        window.open(doc.split("?")[0], "_blank", "noreferrer");
      }
    } else if (doc instanceof File) {
      const url = URL.createObjectURL(doc);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async function handleRestore(candidate: ArchivedCandidate) {
    try {
      await pb.collection("candidates").update(String(candidate.id), {
        is_archived: false,
        archived_at: null,
        archived_by: null,
      });
      addAuditLog({
        actor_email: pb.authStore.record?.email ?? "unknown",
        actor_role: getUserRole() ?? "staff",
        action: "restore",
        entity: "Candidate",
        entity_name: candidate.full_name || String(candidate.id ?? "—"),
      });
      setRefreshToken((v) => v + 1);
      showFeedback("success", "Candidate restored.");
    } catch {
      showFeedback("error", "Failed to restore candidate.");
    }
  }

  function handleOpenArchive() {
    setArchivedPage(1);
    setIsArchiveOpen(true);
  }

  // ─── Badge maps ───────────────────────────────────────────────────────────

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
    Deployed: "bg-teal-100 text-teal-700",
    Rejected: "bg-rose-100 text-rose-700",
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border rounded-md border-(--border) shadow-[var(--shadow),var(--inset)] px-4 py-6 flex flex-col gap-4">
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
                  className="border-none text-white flex items-center gap-1 text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-2.5 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                  onClick={handleOpenModal}
                >
                  <Icon icon="mynaui:plus" width="24" height="24" />
                  Add Candidate
                </button>
                <button
                  type="button"
                  onClick={handleOpenArchive}
                  className="border border-(--border) bg-white text-(--text) flex items-center gap-1.5 text-sm rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2)"
                >
                  <Icon icon="ion:archive-outline" width="20" height="20" />
                  Archive
                </button>
              </div>
            </div>

            {/* Search & Status Filter */}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="max-w-sm flex-1">
                <Searchbar
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                  }}
                  placeholder="Search by name, email, or position"
                  className="text-sm"
                />
              </div>
              <div className="min-w-45">
                <Filter
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "All Statuses" },
                    ...candidateStatuses.map((s) => ({ value: s, label: s })),
                  ]}
                  placeholder="Filter by status"
                  className="text-sm rounded-md"
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
                  className={`px-3.5 py-1.5 rounded-md text-sm font-semibold border transition-all duration-150 ${
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
                  className="px-4 py-1.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-xs hover:bg-red-200 transition-colors"
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
                  {isListLoading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center text-(--muted)"
                      >
                        Loading candidates...
                      </td>
                    </tr>
                  ) : pagedCandidates.length === 0 ? (
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
                      const flags = c.computed_flags ?? [];
                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleView(c)}
                          className="border-b border-(--border) last:border-b-0 hover:bg-(--surface2)/60 transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 text-(--muted) text-sm">
                            {(page - 1) * perPage + idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-(--text) text-sm">
                            {c.last_name
                              ? `${c.last_name}, ${c.first_name}${c.middle_name ? " " + c.middle_name : ""}`
                              : c.full_name || "No data available"}
                          </td>
                          <td className="px-4 py-3 text-(--text) font-semibold text-sm">
                            {c.phone || "No data available"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-4 py-1 rounded-xl text-sm font-medium capitalize ${statusBadge[c.status] ?? "bg-gray-100 text-gray-700"}`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {flags.map((flag) => (
                                <span
                                  key={flag}
                                  className={`inline-block px-4 py-1 rounded-xl text-sm font-medium ${flagBadge[flag] ?? "bg-gray-100 text-gray-700"}`}
                                >
                                  {flag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(c);
                                }}
                                className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-(--surface2) text-(--text) font-semibold text-sm hover:bg-(--border) transition-colors"
                              >
                                <Icon
                                  icon="tabler:eye"
                                  width="15"
                                  height="15"
                                />
                                View
                              </button>
                              {canManageCandidates && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(c);
                                    }}
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-blue-100 text-blue-700 font-semibold text-sm hover:bg-blue-200 transition-colors"
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(c);
                                    }}
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-red-100 text-red-700 font-semibold text-sm hover:bg-red-200 transition-colors"
                                  >
                                    <Icon
                                      icon="tabler:archive"
                                      width="15"
                                      height="15"
                                    />
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
                    <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-md">
                      {(["info", "details", "documents", "notes"] as const).map(
                        (tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setViewTab(tab)}
                            className={`px-3 py-1 rounded-md text-sm font-semibold transition ${viewTab === tab ? "bg-white text-(--primary) border border-(--border) shadow-sm" : "text-(--muted) hover:bg-(--surface3)"}`}
                          >
                            {tab === "info"
                              ? "Informations"
                              : tab === "details"
                                ? "Work Details"
                                : tab === "documents"
                                  ? "Documents"
                                  : "Notes"}
                          </button>
                        ),
                      )}
                    </div>
                    {viewTab === "info" && (
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="px-4 py-1.5 rounded-md bg-(--primary) flex items-center gap-1.5 text-white text-base font-semibold hover:brightness-95"
                      >
                        <Icon
                          icon="mynaui:download-solid"
                          width="20"
                          height="20"
                        />
                        Download PDF
                      </button>
                    )}
                  </div>

                  {viewTab === "info" ? (
                    <div
                      ref={printRef}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                      <div className="col-span-1 md:col-span-3 flex flex-col items-center gap-2 mb-2">
                        <img
                          src={profileUrl}
                          alt="profile"
                          className="w-24 h-24 rounded-full object-cover border border-(--border)"
                        />
                      </div>
                      {(
                        [
                          ["Last Name", viewCandidate.last_name],
                          ["First Name", viewCandidate.first_name],
                          ["Middle Name", viewCandidate.middle_name],
                          ["Email", viewCandidate.email],
                          ["Home Address", viewCandidate.home_address],
                          [
                            "Permanent Address",
                            viewCandidate.permanent_address,
                          ],
                          ["Suffix", viewCandidate.suffix],
                          ["Prefix", viewCandidate.prefix],
                          ["Phone Number", viewCandidate.phone],
                        ] as [string, string][]
                      ).map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">
                            {label}
                          </span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                            {val || (
                              <span className="text-(--muted) italic">
                                No data available
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(
                          [
                            ["Marital Status", viewCandidate.marital_status],
                            ["Status", viewCandidate.status],
                          ] as [string, string][]
                        ).map(([label, val]) => (
                          <div key={label} className="grid gap-1">
                            <span className="text-sm font-bold text-(--muted)">
                              {label}
                            </span>
                            <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                              {val || (
                                <span className="text-(--muted) italic">
                                  No data available
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Action Required — display-only, system generated */}
                      <div className="col-span-1 md:col-span-3 grid gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-(--muted)">
                            Action Required
                          </span>
                          <span className="text-xs text-(--muted) italic font-normal">
                            System generated
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {(viewCandidate.computed_flags ?? []).length > 0 ? (
                            (viewCandidate.computed_flags ?? []).map((flag) => (
                              <span
                                key={flag}
                                className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-sm font-medium border ${flagBadge[flag] ? flagBadge[flag] + " border-transparent" : "bg-white text-(--text) border-(--border)"}`}
                              >
                                {flag}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-(--muted) italic">
                              No flags
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : viewTab === "details" ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(
                        [
                          ["Work History", viewCandidate.work_history],
                          ["Certifications", viewCandidate.certifications],
                          ["Desired Salary", viewCandidate.desired_salary],
                          ["Position", viewCandidate.position_screened],
                        ] as [string, string][]
                      ).map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">
                            {label}
                          </span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                            {val || (
                              <span className="text-(--muted) italic">
                                No data available
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">
                          Skills
                        </span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                          {viewCandidate.skills || (
                            <span className="text-(--muted) italic">
                              No data available
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">
                          Pag-Ibig Number
                        </span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                          {viewCandidate.pagibig_number || (
                            <span className="text-(--muted) italic">
                              No data available
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">
                          Highest Educational Attainment
                        </span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                          {viewCandidate.highest_educ_attainment || (
                            <span className="text-(--muted) italic">
                              No data available
                            </span>
                          )}
                        </p>
                      </div>
                      {(
                        [
                          [
                            "Elementary School",
                            viewCandidate.school_elementary,
                          ],
                          [
                            "Junior High School",
                            viewCandidate.school_junior_high,
                          ],
                          [
                            "Senior High School",
                            viewCandidate.school_senior_high,
                          ],
                          ["College", viewCandidate.school_college],
                        ] as [string, string][]
                      ).map(([label, val]) => (
                        <div key={label} className="grid gap-1">
                          <span className="text-sm font-bold text-(--muted)">
                            {label}
                          </span>
                          <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                            {val || (
                              <span className="text-(--muted) italic">
                                No data available
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                      <div className="col-span-1 md:col-span-2 grid gap-1">
                        <span className="text-sm font-bold text-(--muted)">
                          Other School / Training Center
                        </span>
                        <p className="text-sm text-(--text) border border-(--border) rounded-md px-2.75 py-2.5 bg-(--surface2)">
                          {viewCandidate.school_other_name ||
                            viewCandidate.school_other || (
                              <span className="text-(--muted) italic">
                                No data available
                              </span>
                            )}
                        </p>
                      </div>
                    </div>
                  ) : viewTab === "documents" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {documentTypes.map(([key, label]) => (
                        <div
                          key={key}
                          className="p-3 border border-(--border) rounded-md bg-white"
                        >
                          <div className="text-sm font-bold text-(--muted) mb-2">
                            {label}
                          </div>
                          {viewCandidate.documents?.[key] ? (
                            <button
                              type="button"
                              onClick={() =>
                                handleDocumentDownload(
                                  key,
                                  viewCandidate.documents![key] as
                                    | File
                                    | string,
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-xl bg-white text-xs font-semibold text-(--primary) cursor-pointer hover:bg-(--surface2) transition-colors"
                            >
                              <Icon
                                icon="tabler:download"
                                width="14"
                                height="14"
                              />
                              {typeof viewCandidate.documents[key] === "string"
                                ? "Download File"
                                : (viewCandidate.documents[key] as File).name}
                            </button>
                          ) : (
                            <span className="text-sm text-(--muted) flex items-center gap-1.5">
                              <Icon
                                icon="teenyicons:file-no-access-outline"
                                width="20"
                                height="20"
                              />
                              No file uploaded
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-3 text-sm">
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-(--muted)">
                          Notes
                        </span>
                        <textarea
                          className="w-full min-h-44 border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none"
                          value={viewCandidate.notes ?? ""}
                          placeholder="No notes added."
                          readOnly
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </Modal>

            {/* Archive Modal */}
            <Modal
              open={isArchiveOpen}
              onClose={() => setIsArchiveOpen(false)}
              title="Archived Candidates"
            >
              <div className="grid gap-3 text-sm">
                {archivedLoading ? (
                  <div className="py-6 text-center text-(--muted)">
                    Loading archived candidates...
                  </div>
                ) : archivedCandidates.length === 0 ? (
                  <div className="py-10 text-center text-(--muted) flex flex-col items-center gap-2">
                    <Icon icon="tabler:archive-off" width="44" height="44" />
                    No archived candidates
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="bg-(--surface2)">
                          <th className="px-4 py-2 font-bold text-(--muted)">
                            Full name
                          </th>
                          <th className="px-4 py-2 font-bold text-(--muted)">
                            Email
                          </th>
                          <th className="px-4 py-2 font-bold text-(--muted)">
                            Archived At
                          </th>
                          <th className="px-4 py-2 font-bold text-(--muted)">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedCandidates.map((ac) => (
                          <tr
                            key={ac.id}
                            className="border-b border-(--border)"
                          >
                            <td className="px-4 py-2 font-semibold">
                              {ac.full_name || "—"}
                            </td>
                            <td className="px-4 py-2">{ac.email || "—"}</td>
                            <td className="px-4 py-2">
                              {ac.archived_at
                                ? new Date(ac.archived_at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-4 py-2">
                              {canRestoreArchived && (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(ac)}
                                  className="cursor-pointer px-3 py-1.5 rounded-xl bg-green-100 text-green-700 text-xs font-semibold"
                                >
                                  Restore
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {archivedCandidates.length > 0 && !archivedLoading && (
                  <div className="flex justify-end">
                    <Pagination
                      page={archivedPage}
                      totalPages={archivedTotalPages}
                      onPageChange={setArchivedPage}
                      perPage={perPage}
                      onPerPageChange={(value) => {
                        setPerPage(value);
                        setArchivedPage(1);
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsArchiveOpen(false)}
                    className="border border-(--border) bg-white text-(--text) mt-3 text-sm rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
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
                  <div className="inline-flex items-center gap-1 p-1 bg-(--surface2) rounded-md">
                    {(["info", "details", "documents"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md text-sm font-semibold transition ${activeTab === tab ? "bg-white text-(--primary) border border-(--border) shadow-sm" : "text-(--muted) hover:bg-(--surface3)"}`}
                      >
                        {tab === "info"
                          ? "Informations"
                          : tab === "details"
                            ? "Work Details"
                            : "Documents"}
                      </button>
                    ))}
                  </div>
                </div>

                {activeTab === "info" ? (
                  <>
                    <div className="col-span-2 flex flex-col items-center gap-3 mb-2">
                      <img
                        src={formProfilePreviewUrl ?? defaultProfile}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border border-(--border)"
                      />
                      <label className="inline-flex items-center gap-2 px-3 py-2 border border-(--border) rounded-md bg-white text-sm text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors">
                        <Icon icon="tabler:camera" width="16" height="16" />
                        <span className="font-medium">
                          Upload Profile Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfilePhotoChange}
                        />
                      </label>
                    </div>
                    <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Last Name
                        </span>
                        <input
                          className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                          placeholder="e.g., Dela Cruz"
                          value={form.last_name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              last_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          First Name
                        </span>
                        <input
                          className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                          placeholder="e.g., Juan"
                          value={form.first_name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              first_name: e.target.value,
                            }))
                          }
                          required
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Middle Name
                        </span>
                        <input
                          className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                          placeholder="e.g., Santos"
                          value={form.middle_name}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              middle_name: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Email
                        </span>
                        <input
                          className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                          placeholder="e.g., juan@example.com"
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Home Address
                        </span>
                        <input
                          className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                          placeholder="123 Brgy. Example"
                          value={form.home_address}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              home_address: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Permanent Address
                        </span>
                        <input
                          className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                          placeholder="123 Brgy. Example"
                          value={form.permanent_address}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              permanent_address: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Suffix
                        </span>
                        <input
                          className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                          placeholder="e.g., Jr., Sr."
                          value={form.suffix}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, suffix: e.target.value }))
                          }
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Prefix
                        </span>
                        <input
                          className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                          placeholder="e.g., Mr., Ms."
                          value={form.prefix}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, prefix: e.target.value }))
                          }
                        />
                      </label>
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Phone Number
                        </span>
                        <input
                          className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                          value={form.phone}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              phone: e.target.value.replace(/\D/g, ""),
                            }))
                          }
                          inputMode="numeric"
                          placeholder="e.g., 09171234567"
                        />
                      </label>
                      <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="grid gap-1.25">
                          <span className="text-sm text-(--muted) font-bold">
                            Marital Status
                          </span>
                          <Selection
                            value={form.marital_status}
                            onChange={(val) =>
                              setForm((f) => ({ ...f, marital_status: val }))
                            }
                            options={[
                              { value: "", label: "Select..." },
                              { value: "Single", label: "Single" },
                              { value: "Married", label: "Married" },
                              { value: "Widowed", label: "Widowed" },
                            ]}
                            placeholder="Select..."
                          />
                        </label>
                        <label className="grid gap-1.25">
                          <span className="text-sm text-(--muted) font-bold">
                            Status
                          </span>
                          <Selection
                            value={form.status}
                            onChange={handleStatusChange}
                            options={getStatusOptions(
                              isEditModalOpen ? editCandidate : null,
                            )}
                            placeholder="Select status"
                          />
                        </label>
                      </div>

                      {/* Action Required — display-only in modal, system generated */}
                      <div className="col-span-1 md:col-span-3 grid gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-(--muted) font-bold">
                            Action Required
                          </span>
                          <span className="text-xs text-(--muted) italic font-normal">
                            System generated
                          </span>
                        </div>
                        {isEditModalOpen && editCandidate ? (
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {(editCandidate.computed_flags ?? []).length > 0 ? (
                              (editCandidate.computed_flags ?? []).map(
                                (flag) => (
                                  <span
                                    key={flag}
                                    className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-sm font-medium border ${
                                      flagBadge[flag]
                                        ? flagBadge[flag] +
                                          " border-transparent"
                                        : "bg-white text-(--text) border-(--border)"
                                    }`}
                                  >
                                    {flag}
                                  </span>
                                ),
                              )
                            ) : (
                              <span className="text-sm text-(--muted) italic">
                                No flags
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-(--muted) bg-(--surface2) border border-(--border) rounded-md px-3 py-2">
                            Flags will be computed after saving. Upload required
                            documents (Resume, NBI Clearance, Police Clearance)
                            and schedule an interview to clear all flags.
                          </p>
                        )}
                      </div>

                      <label className="col-span-1 md:col-span-3 grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Notes
                        </span>
                        <textarea
                          className="w-full min-h-18 border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                          value={form.notes}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, notes: e.target.value }))
                          }
                          placeholder="e.g., Available immediately; willing to relocate."
                        />
                      </label>
                    </div>
                  </>
                ) : activeTab === "details" ? (
                  <div className="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Work History
                      </span>
                      <input
                        className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                        value={form.work_history}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            work_history: e.target.value,
                          }))
                        }
                        placeholder="e.g., Company - Role (2018-2020)"
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Certifications
                      </span>
                      <input
                        className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                        value={form.certifications}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            certifications: e.target.value,
                          }))
                        }
                        placeholder="e.g., NC II, First Aid"
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Desired Salary
                      </span>
                      <input
                        className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                        value={form.desired_salary}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            desired_salary: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Position
                      </span>
                      <IndustryPositionPicker
                        positions={positionsList}
                        value={form.position_screened}
                        onChange={(title) =>
                          setForm((f) => ({ ...f, position_screened: title }))
                        }
                        loading={positionsLoading}
                        placeholder="Select a position..."
                      />
                    </div>
                    <label className="col-span-1 md:col-span-2 grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Skills
                      </span>
                      <input
                        className="w-full border border-(--border) bg-white text-(--text) rounded-md px-2.75 py-2.5 text-sm outline-none"
                        value={form.skills}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, skills: e.target.value }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Pag-Ibig Number
                      </span>
                      <input
                        className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                        placeholder="XXXXXXXXXXXX"
                        value={form.pagibig_number}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            pagibig_number: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="col-span-1 md:col-span-2">
                      <Selection
                        value={form.highest_educ_attainment}
                        onChange={(val) =>
                          setForm((f) => ({
                            ...f,
                            highest_educ_attainment: val,
                          }))
                        }
                        options={[
                          { value: "", label: "Select..." },
                          { value: "Elementary", label: "Elementary" },
                          { value: "Highschool", label: "Highschool" },
                          { value: "College", label: "College" },
                          { value: "Postgraduate", label: "Postgraduate" },
                        ]}
                        label="Highest Educational Attainment"
                        placeholder="Select..."
                      />
                    </div>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Elementary School
                      </span>
                      <input
                        className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                        value={form.school_elementary}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            school_elementary: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Junior High School
                      </span>
                      <input
                        className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                        value={form.school_junior_high}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            school_junior_high: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        Senior High School
                      </span>
                      <input
                        className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                        value={form.school_senior_high}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            school_senior_high: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-1.25">
                      <span className="text-sm text-(--muted) font-bold">
                        College
                      </span>
                      <input
                        className="border border-(--border) rounded-md px-2.75 py-2.5 text-sm"
                        value={form.school_college}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            school_college: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="col-span-1 md:col-span-2 grid gap-1.25">
                      <label className="grid gap-1.25">
                        <span className="text-sm text-(--muted) font-bold">
                          Other School / Training Center
                        </span>
                        <input
                          className="w-full border border-(--border) rounded-md px-3 py-2.5 text-sm"
                          value={form.school_other_name || ""}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              school_other_name: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    {documentTypes.map(([key, label]) => (
                      <div
                        key={key}
                        className="col-span-1 p-3 border border-(--border) rounded-md bg-white"
                      >
                        <div className="text-sm font-bold text-(--muted) mb-2">
                          {label}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <label
                            htmlFor={`file-${key}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-(--border) rounded-md bg-white text-sm text-(--text) cursor-pointer hover:bg-(--surface2) transition-colors"
                          >
                            <Icon icon="tabler:upload" width="14" height="14" />
                            Upload
                          </label>
                          <input
                            id={`file-${key}`}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => handleDocumentFileChange(e, key)}
                            className="hidden"
                          />
                          {form.documents?.[key] ? (
                            typeof form.documents[key] === "string" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-(--primary) font-medium truncate max-w-40">
                                <Icon
                                  icon="tabler:file"
                                  width="13"
                                  height="13"
                                />
                                Uploaded file
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      documents: {
                                        ...(prev.documents ?? {}),
                                        [key]: null,
                                      },
                                    }))
                                  }
                                  className="ml-1 text-(--muted) hover:text-red-500 transition-colors"
                                  title="Remove file"
                                >
                                  <Icon
                                    icon="tabler:x"
                                    width="13"
                                    height="13"
                                  />
                                </button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-(--text) font-medium truncate max-w-100">
                                <Icon
                                  icon="tabler:file"
                                  width="18"
                                  height="18"
                                />
                                {(form.documents[key] as File).name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      documents: {
                                        ...(prev.documents ?? {}),
                                        [key]: null,
                                      },
                                    }))
                                  }
                                  className="ml-1 text-gray-500 hover:text-red-500 transition-colors"
                                  title="Remove file"
                                >
                                  <Icon
                                    icon="tabler:x"
                                    width="18"
                                    height="18"
                                  />
                                </button>
                              </span>
                            )
                          ) : (
                            <span className="text-sm text-(--muted)">
                              No file selected
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:bg-(--surface2) hover:scale-105"
                    onClick={
                      isModalOpen ? handleCloseModal : handleCloseEditModal
                    }
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-4 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
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

            {/* Archive confirmation Modal */}
            <Modal
              open={isDeleteModalOpen}
              onClose={handleCloseDeleteModal}
              title="Archive Candidate"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onDeleteSubmit();
                }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-100 mb-2">
                    <Icon
                      icon="tabler:archive"
                      width="38"
                      height="38"
                      className="text-red-500"
                    />
                  </div>
                  <p className="text-base font-semibold text-(--text) mb-1">
                    Are you sure you want to{" "}
                    <span className="text-red-600 font-bold">archive</span> this
                    candidate?
                  </p>
                  <p className="text-sm text-(--muted)">
                    <span className="font-bold">
                      {deleteCandidate?.full_name}
                    </span>
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold hover:bg-(--surface2)"
                    onClick={handleCloseDeleteModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border-none text-white bg-linear-to-br from-red-500 to-red-700 rounded-md px-4 py-2 font-bold hover:brightness-110 shadow-md shadow-red-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Archiving..." : "Archive"}
                  </button>
                </div>
                {error && (
                  <p className="mt-3 text-[#9f2d20] text-sm text-center">
                    {error}
                  </p>
                )}
              </form>
            </Modal>

            {/* Status Warning Confirmation Modal */}
            <Modal
              open={showStatusWarningModal}
              onClose={cancelStatusChange}
              title="Confirm Status Change"
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-100">
                    <Icon
                      icon="tabler:alert-triangle"
                      width="38"
                      height="38"
                      className="text-amber-500"
                    />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-(--text) mb-1">
                      I-set as{" "}
                      <span className="text-amber-600 font-bold">
                        "{pendingStatus}"
                      </span>
                      ?
                    </p>
                    <p className="text-sm text-(--muted) mt-2 leading-relaxed">
                      {statusWarning}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelStatusChange}
                    className="border border-(--border) bg-white text-(--text) rounded-md px-4 py-2 font-bold hover:bg-(--surface2)"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmStatusChange}
                    className="border-none text-white bg-linear-to-br from-amber-500 to-amber-600 rounded-md px-4 py-2 font-bold hover:brightness-110"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            </Modal>
          </section>

          {pagedCandidates.length > 0 && !isListLoading && (
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
          )}
        </main>
      </div>
    </div>
  );
}

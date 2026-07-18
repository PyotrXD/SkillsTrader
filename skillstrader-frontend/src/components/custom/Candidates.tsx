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
  sss_number: "",
  philhealth: "",
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

// Flag display badges — updated for yellow-blue-red theme
const flagBadge: Record<string, string> = {
  "Not Interviewed": "bg-yellow-100 text-yellow-800",
  "Not Scheduled": "bg-yellow-100 text-yellow-800",
  "Missing Docs": "bg-[var(--accent)]/20 text-[var(--accent)]",
  Completed: "bg-blue-100 text-blue-700",
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
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2" | "tab3" | "info">(
    "tab1",
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

      for (const item of result.items) {
        if (!item.candidate) continue;
        if (interviewMap[item.candidate] !== null) continue;
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

    const [documentsByCandidate, interviewsByCandidate] = await Promise.all([
      fetchDocumentsByCandidate(candidateIds),
      fetchInterviewsByCandidates(candidateIds),
    ]);

    return items.map((item) => {
      const status = item.status ?? "New Applicant";
      const documents =
        documentsByCandidate[item.id] ?? createEmptyDocumentsMap();
      const interview = interviewsByCandidate[item.id] ?? null;

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
        sss_number: item.sss_number ?? "",
        philhealth: item.philhealth ?? "",
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

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  function handleOpenModal() {
    console.log("DEBUG: handleOpenModal called");
    setForm(initialForm);
    setIsModalOpen(true);
    setError("");
    setActiveTab("tab1");
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
    setViewTab("info");
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
        sss_number: form.sss_number || null,
        philhealth: form.philhealth || null,
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
    
    // Fix: Declare the changed variable
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
      "sss_number",
      "philhealth",
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
        sss_number: form.sss_number || null,
        philhealth: form.philhealth || null,
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

  // Status badges — updated for new theme
  const statusBadge: Record<string, string> = {
    "New Applicant": "bg-gray-100 text-gray-700",
    "Lined-Up": "bg-blue-100 text-blue-700",
    "For final interview": "bg-yellow-100 text-yellow-700",
    "For medical": "bg-purple-100 text-purple-700",
    "Fit to work": "bg-green-100 text-green-700",
    "Unfit to work": "bg-[var(--accent)]/20 text-[var(--accent)]",
    "Pending medical": "bg-orange-100 text-orange-700",
    "For deployment": "bg-sky-100 text-sky-700",
    "Visa Arrived": "bg-emerald-100 text-emerald-700",
    "Awaiting Visa": "bg-amber-100 text-amber-700",
    Deployed: "bg-teal-100 text-teal-700",
    Rejected: "bg-[var(--accent)]/20 text-[var(--accent)]",
  };

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

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl text-(--text) font-bold">Candidates</h1>
                <p className="text-(--muted) text-sm font-medium">
                  Manage candidate records and status.
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {canManageCandidates && (
                  <button
                    className="border-none text-white flex items-center gap-1 text-sm bg-linear-to-br from-(--primary) to-(--primary2) rounded-md px-2.5 py-2 font-bold transition-all duration-150 hover:brightness-110 hover:scale-105"
                    onClick={handleOpenModal}
                    aria-label="Add new candidate"
                    data-testid="add-candidate-button"
                  >
                    <Icon icon="mynaui:plus" width="24" height="24" />
                    Add Candidate
                  </button>
                )}
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

            {/* Modal for adding new candidate */}
            {isModalOpen && (
              <Modal
                open={isModalOpen}
                onClose={handleCloseModal}
                title="Add New Candidate"
              >
                <div className="p-4">
                  {/* Tab Navigation */}
                  <div className="flex border-b border-gray-200 mb-6">
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "tab1"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("tab1")}
                    >
                      Information
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "tab2"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("tab2")}
                    >
                      Pre-Employment Requirements
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === "tab3"
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      onClick={() => setActiveTab("tab3")}
                    >
                      Employment and Education History
                    </button>
                  </div>

                  {/* Tab Content */}
                  <form onSubmit={onSubmit}>
                     {/* Tab 1 Content */}
                    {activeTab === "tab1" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Personal Information & Contact Details
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              First Name *
                            </label>
                            <input
                              type="text"
                              value={form.first_name}
                              onChange={(e) => setForm({...form, first_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Last Name *
                            </label>
                            <input
                              type="text"
                              value={form.last_name}
                              onChange={(e) => setForm({...form, last_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Middle Name
                            </label>
                            <input
                              type="text"
                              value={form.middle_name}
                              onChange={(e) => setForm({...form, middle_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Prefix
                            </label>
                            <input
                              type="text"
                              value={form.prefix}
                              onChange={(e) => setForm({...form, prefix: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Suffix
                            </label>
                            <input
                              type="text"
                              value={form.suffix}
                              onChange={(e) => setForm({...form, suffix: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({...form, email: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone *
                            </label>
                            <input
                              type="tel"
                              value={form.phone}
                              onChange={(e) => setForm({...form, phone: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Documents
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pag-IBIG Number
                              </label>
                              <input
                                type="text"
                                value={form.pagibig_number}
                                onChange={(e) => setForm({...form, pagibig_number: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                SSS Number
                              </label>
                              <input
                                type="text"
                                value={form.sss_number}
                                onChange={(e) => setForm({...form, sss_number: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Philhealth
                              </label>
                              <input
                                type="text"
                                value={form.philhealth}
                                onChange={(e) => setForm({...form, philhealth: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                NBI/Police Clearance
                              </label>
                              <input
                                type="file"
                                onChange={(e) => handleDocumentFileChange(e, "nbi_clearance")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2 Content */}
                    {activeTab === "tab2" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Pre-Employment Requirements
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Pag-IBIG Number
                            </label>
                            <input
                              type="text"
                              value={form.pagibig_number}
                              onChange={(e) => setForm({...form, pagibig_number: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Highest Educational Attainment
                            </label>
                            <input
                              type="text"
                              value={form.highest_educ_attainment}
                              onChange={(e) => setForm({...form, highest_educ_attainment: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Elementary School
                            </label>
                            <input
                              type="text"
                              value={form.school_elementary}
                              onChange={(e) => setForm({...form, school_elementary: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Junior High School
                            </label>
                            <input
                              type="text"
                              value={form.school_junior_high}
                              onChange={(e) => setForm({...form, school_junior_high: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Senior High School
                            </label>
                            <input
                              type="text"
                              value={form.school_senior_high}
                              onChange={(e) => setForm({...form, school_senior_high: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              College
                            </label>
                            <input
                              type="text"
                              value={form.school_college}
                              onChange={(e) => setForm({...form, school_college: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Other School
                            </label>
                            <input
                              type="text"
                              value={form.school_other}
                              onChange={(e) => setForm({...form, school_other: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Other School Name
                            </label>
                            <input
                              type="text"
                              value={form.school_other_name}
                              onChange={(e) => setForm({...form, school_other_name: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3 Content */}
                    {activeTab === "tab3" && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          Employment and Education History
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Work History
                            </label>
                            <textarea
                              value={form.work_history}
                              onChange={(e) => setForm({...form, work_history: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows={4}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Skills
                            </label>
                            <textarea
                              value={form.skills}
                              onChange={(e) => setForm({...form, skills: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows={4}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Certifications
                            </label>
                            <textarea
                              value={form.certifications}
                              onChange={(e) => setForm({...form, certifications: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows={4}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Desired Salary
                            </label>
                            <input
                              type="text"
                              value={form.desired_salary}
                              onChange={(e) => setForm({...form, desired_salary: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Position Screened
                            </label>
                            <input
                              type="text"
                              value={form.position_screened}
                              onChange={(e) => setForm({...form, position_screened: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={form.notes}
                              onChange={(e) => setForm({...form, notes: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              rows={4}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-6">
                      <div>
                        {activeTab !== "tab1" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (activeTab === "tab2") setActiveTab("tab1");
                              else if (activeTab === "tab3") setActiveTab("tab2");
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Back
                          </button>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cancel
                        </button>
                        
                        {activeTab !== "tab3" ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (activeTab === "tab1") setActiveTab("tab2");
                              else if (activeTab === "tab2") setActiveTab("tab3");
                            }}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Next
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {isSubmitting ? "Adding..." : "Add Candidate"}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
              </Modal>
            )}

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
                  className="px-4 py-1.5 flex items-center gap-1 rounded-md bg-(--accent)/20 text-(--accent) font-semibold text-xs hover:bg-(--accent)/30 transition-colors"
                >
                  <Icon icon="tabler:x" width="15" height="15" />
                  Clear Filter
                </button>
              )}
            </div>

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
                                    className="px-3 py-1.5 flex items-center gap-1 rounded-md bg-[var(--accent)]/20 text-[var(--accent)] font-semibold text-sm hover:bg-[var(--accent)]/30 transition-colors"
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
           </section>
         </main>
       </div>

        {/* View Modal */}
        {viewCandidate && (
          <Modal
            open={!!viewCandidate}
            onClose={handleCloseViewModal}
            title={`Candidate Details: ${viewCandidate.full_name || viewCandidate.last_name ? `${viewCandidate.last_name}, ${viewCandidate.first_name}` : 'Unnamed Candidate'}`}
          >
            <div className="p-4">
             {/* Header with profile photo and basic info */}
             <div className="flex flex-col md:flex-row items-start gap-4 mb-6">
               <img
                 src={profileUrl}
                 alt="Profile"
                 className="w-24 h-24 rounded-full object-cover border-2 border-(--border)"
               />
               <div className="flex-1">
                 <h2 className="text-xl font-bold text-(--text)">
                   {viewCandidate.last_name
                     ? `${viewCandidate.last_name}, ${viewCandidate.first_name}${
                         viewCandidate.middle_name ? " " + viewCandidate.middle_name : ""
                       }`
                     : viewCandidate.full_name || "Unnamed Candidate"}
                 </h2>
                 <div className="mt-2">
                   <span
                     className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                       statusBadge[viewCandidate.status] ?? "bg-gray-100 text-gray-700"
                     }`}
                   >
                     {viewCandidate.status}
                   </span>
                 </div>
                 <div className="mt-3 flex flex-wrap gap-2">
                   <div className="text-sm">
                     <span className="text-(--muted)">Email:</span>{" "}
                     <span className="text-(--text)">{viewCandidate.email || "N/A"}</span>
                   </div>
                   <div className="text-sm">
                     <span className="text-(--muted)">Phone:</span>{" "}
                     <span className="text-(--text)">{viewCandidate.phone || "N/A"}</span>
                   </div>
                 </div>
               </div>
               <div className="ml-auto">
                 <button
                   type="button"
                   onClick={handleDownloadPdf}
                   className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                 >
                   <Icon icon="tabler:download" width="16" height="16" />
                   Download PDF
                 </button>
               </div>
             </div>

             {/* Tab Navigation */}
             <div className="flex border-b border-gray-200 mb-6">
               <button
                 type="button"
                 className={`px-4 py-2 font-medium text-sm ${
                   viewTab === "info"
                     ? "text-blue-600 border-b-2 border-blue-600"
                     : "text-gray-500 hover:text-gray-700"
                 }`}
                 onClick={() => setViewTab("info")}
               >
                 Info
               </button>
               <button
                 type="button"
                 className={`px-4 py-2 font-medium text-sm ${
                   viewTab === "details"
                     ? "text-blue-600 border-b-2 border-blue-600"
                     : "text-gray-500 hover:text-gray-700"
                 }`}
                 onClick={() => setViewTab("details")}
               >
                 Details
               </button>
               <button
                 type="button"
                 className={`px-4 py-2 font-medium text-sm ${
                   viewTab === "documents"
                     ? "text-blue-600 border-b-2 border-blue-600"
                     : "text-gray-500 hover:text-gray-700"
                 }`}
                 onClick={() => setViewTab("documents")}
               >
                 Documents
               </button>
               <button
                 type="button"
                 className={`px-4 py-2 font-medium text-sm ${
                   viewTab === "notes"
                     ? "text-blue-600 border-b-2 border-blue-600"
                     : "text-gray-500 hover:text-gray-700"
                 }`}
                 onClick={() => setViewTab("notes")}
               >
                 Notes
               </button>
             </div>

             {/* Tab Content */}
             <div>
               {viewTab === "info" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h3 className="text-lg font-medium text-(--text) mb-3">Personal Information</h3>
                     <dl className="grid grid-cols-1 gap-2">
                       <div>
                         <dt className="text-sm text-(--muted)">Last Name</dt>
                         <dd className="text-(--text)">{viewCandidate.last_name || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">First Name</dt>
                         <dd className="text-(--text)">{viewCandidate.first_name || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Middle Name</dt>
                         <dd className="text-(--text)">{viewCandidate.middle_name || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Prefix</dt>
                         <dd className="text-(--text)">{viewCandidate.prefix || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Suffix</dt>
                         <dd className="text-(--text)">{viewCandidate.suffix || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Marital Status</dt>
                         <dd className="text-(--text)">{viewCandidate.marital_status || "N/A"}</dd>
                       </div>
                     </dl>
                   </div>
                   <div>
                     <h3 className="text-lg font-medium text-(--text) mb-3">Contact Information</h3>
                     <dl className="grid grid-cols-1 gap-2">
                       <div>
                         <dt className="text-sm text-(--muted)">Email</dt>
                         <dd className="text-(--text)">{viewCandidate.email || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Phone</dt>
                         <dd className="text-(--text)">{viewCandidate.phone || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Home Address</dt>
                         <dd className="text-(--text)">{viewCandidate.home_address || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Permanent Address</dt>
                         <dd className="text-(--text)">{viewCandidate.permanent_address || "N/A"}</dd>
                       </div>
                     </dl>
                   </div>
                 </div>
               )}

               {viewTab === "details" && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <h3 className="text-lg font-medium text-(--text) mb-3">Government IDs</h3>
                     <dl className="grid grid-cols-1 gap-2">
                       <div>
                         <dt className="text-sm text-(--muted)">Pag-IBIG Number</dt>
                         <dd className="text-(--text)">{viewCandidate.pagibig_number || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">SSS Number</dt>
                         <dd className="text-(--text)">{viewCandidate.sss_number || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">PhilHealth</dt>
                         <dd className="text-(--text)">{viewCandidate.philhealth || "N/A"}</dd>
                       </div>
                     </dl>
                   </div>
                   <div>
                     <h3 className="text-lg font-medium text-(--text) mb-3">Education</h3>
                     <dl className="grid grid-cols-1 gap-2">
                       <div>
                         <dt className="text-sm text-(--muted)">Highest Educational Attainment</dt>
                         <dd className="text-(--text)">{viewCandidate.highest_educ_attainment || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Elementary School</dt>
                         <dd className="text-(--text)">{viewCandidate.school_elementary || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Junior High School</dt>
                         <dd className="text-(--text)">{viewCandidate.school_junior_high || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Senior High School</dt>
                         <dd className="text-(--text)">{viewCandidate.school_senior_high || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">College</dt>
                         <dd className="text-(--text)">{viewCandidate.school_college || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Other School</dt>
                         <dd className="text-(--text)">{viewCandidate.school_other || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Other School Name</dt>
                         <dd className="text-(--text)">{viewCandidate.school_other_name || "N/A"}</dd>
                       </div>
                     </dl>
                   </div>
                   <div className="md:col-span-2">
                     <h3 className="text-lg font-medium text-(--text) mb-3">Work Experience</h3>
                     <div className="text-(--text)">
                       {viewCandidate.work_history || "No work history provided"}
                     </div>
                   </div>
                   <div className="md:col-span-2">
                     <h3 className="text-lg font-medium text-(--text) mb-3">Skills</h3>
                     <div className="text-(--text)">
                       {viewCandidate.skills || "No skills provided"}
                     </div>
                   </div>
                   <div className="md:col-span-2">
                     <h3 className="text-lg font-medium text-(--text) mb-3">Certifications</h3>
                     <div className="text-(--text)">
                       {viewCandidate.certifications || "No certifications provided"}
                     </div>
                   </div>
                   <div className="md:col-span-2">
                     <h3 className="text-lg font-medium text-(--text) mb-3">Application Details</h3>
                     <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       <div>
                         <dt className="text-sm text-(--muted)">Desired Salary</dt>
                         <dd className="text-(--text)">{viewCandidate.desired_salary || "N/A"}</dd>
                       </div>
                       <div>
                         <dt className="text-sm text-(--muted)">Position Screened</dt>
                         <dd className="text-(--text)">{viewCandidate.position_screened || "N/A"}</dd>
                       </div>
                     </dl>
                   </div>
                 </div>
               )}

               {viewTab === "documents" && (
                 <div>
                   <h3 className="text-lg font-medium text-(--text) mb-3">Uploaded Documents</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {documentTypes.map(([key, label]) => {
                       const docUrl = viewCandidate.documents?.[key];
                       return (
                         <div key={key} className="border border-(--border) rounded-lg p-3">
                           <div className="flex justify-between items-start">
                             <div>
                               <h4 className="font-medium text-(--text)">{label}</h4>
                               {docUrl ? (
                                 <p className="text-sm text-(--muted)">Uploaded</p>
                               ) : (
                                 <p className="text-sm text-(--muted)">Not uploaded</p>
                               )}
                             </div>
                             {docUrl && (
                               <button
                                 type="button"
                                 onClick={() => handleDocumentDownload(key, docUrl)}
                                 className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                               >
                                 Download
                               </button>
                             )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

               {viewTab === "notes" && (
                 <div>
                   <h3 className="text-lg font-medium text-(--text) mb-3">Notes</h3>
                   <div className="border border-(--border) rounded-lg p-4">
                     <p className="text-(--text)">
                       {viewCandidate.notes || "No notes provided"}
                     </p>
                   </div>
                   <div className="mt-4">
                     <h3 className="text-lg font-medium text-(--text) mb-3">Position Screened</h3>
                     <div className="border border-(--border) rounded-lg p-4">
                       <p className="text-(--text)">
                         {viewCandidate.position_screened || "No position screened information"}
                       </p>
                     </div>
                   </div>
                 </div>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
  );
}

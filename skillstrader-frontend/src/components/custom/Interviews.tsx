import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@iconify/react";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import Searchbar from "../ui/Searchbar";
import Pagination from "../ui/Pagination";
import Selection from "../ui/Selection";
import { getPocketBaseUiError, getUserRole, pb } from "../../lib/pocketbase/pb";
import type { InterviewRecord, InterviewForm } from "../../types/Interviews";


type CandidateRow = {
  id: string;
  full_name?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  status?: string;
};

type QueueRow = {
  candidate: CandidateRow;
  interview: InterviewRecord | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const initialForm: InterviewForm = {
  candidate: "",
  interview_date: "",
  result: "",
  notes: "",
  assessment_score: "",
  assessment_max_score: "",
  assessment_notes: "",
};

const resultOptions = [
  { value: "Passed", label: "Passed" },
  { value: "Failed", label: "Failed" },
];

// Updated result badges with new theme
const resultBadge: Record<string, string> = {
  Passed: "bg-green-100 text-green-700",
  Failed: "bg-[var(--accent)]/20 text-[var(--accent)]",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function candidateName(candidate?: CandidateRow): string {
  if (!candidate) return "No data available";
  if (candidate.full_name) return candidate.full_name;
  const parts = [candidate.last_name, candidate.first_name, candidate.middle_name]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : candidate.id;
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10) || "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function toDateInputValue(value?: string): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function scoreLabel(interview: InterviewRecord | null): string {
  if (!interview) return "—";
  const { assessment_score: score, assessment_max_score: maxScore } = interview;
  if (score === null || score === undefined) return "—";
  if (maxScore === null || maxScore === undefined) return String(score);
  return `${score} / ${maxScore}`;
}

// Updated candidate status badges with new theme
const candidateStatusBadge: Record<string, string> = {
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
  "Deployed": "bg-teal-100 text-teal-700",
  "Rejected": "bg-[var(--accent)]/20 text-[var(--accent)]",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Interviews() {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<InterviewForm>(initialForm);
  const [scheduleCandidate, setScheduleCandidate] = useState<CandidateRow | null>(null);
  const [editRow, setEditRow] = useState<QueueRow | null>(null);
  const [viewRow, setViewRow] = useState<QueueRow | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const [refreshToken, setRefreshToken] = useState(0);

  const userRole = useMemo(() => getUserRole() ?? "staff", []);
  const canManage = userRole === "administrator" || userRole === "manager";

  // ─── Feedback ───────────────────────────────────────────────────────────────

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setToastType(type);
    setSuccess(message);
    setShowToast(true);
  }

  // ─── Data fetching ───────────────────────────────────────────────────────────

  async function fetchInterviewsBatch(
    candidateIds: string[]
  ): Promise<Record<string, InterviewRecord | null>> {
    if (candidateIds.length === 0) return {};

    const map: Record<string, InterviewRecord | null> = {};
    for (const id of candidateIds) map[id] = null;

    try {
      const filter = candidateIds
        .map((id) => `candidate = "${escapeFilterValue(id)}"`)
        .join(" || ");

      const result = await pb.collection("interviews").getList<InterviewRecord>(1, 500, {
        filter,
        sort: "-created",
        requestKey: null,
      });

      for (const item of result.items) {
        if (!item.candidate) continue;
        if (map[item.candidate] !== null) continue;
        map[item.candidate] = item;
      }
    } catch (err) {
      console.error("Failed to batch-fetch interviews:", err);
    }

    return map;
  }

  async function fetchQueue(targetPage: number) {
    if (!pb.authStore.isValid) return;
    setIsListLoading(true);
    setError("");

    try {
      const baseFilter = `is_archived = false && status != "Deployed" && status != "Rejected" && status != "Unfit to work"`;

      const candidatesResult = await pb.collection("candidates").getFullList<CandidateRow>({
        filter: baseFilter,
        sort: "-updated",
        requestKey: null,
      });

      if (candidatesResult.length === 0) {
        setQueue([]);
        setTotalPages(1);
        return;
      }

      const candidateIds = candidatesResult.map((c) => c.id);
      const interviewsByCandidate = await fetchInterviewsBatch(candidateIds);

      // Only include candidates without a result yet
      let rows: QueueRow[] = candidatesResult.map((candidate) => ({
        candidate,
        interview: interviewsByCandidate[candidate.id] ?? null,
      }));

      const query = search.trim().toLowerCase();
      if (query) {
        rows = rows.filter((row) =>
          candidateName(row.candidate).toLowerCase().includes(query)
        );
      }

      const total = rows.length;
      const totalPagesCount = Math.max(1, Math.ceil(total / perPage));
      const safePage = Math.min(targetPage, totalPagesCount);
      const start = (safePage - 1) * perPage;

      setQueue(rows.slice(start, start + perPage));
      setTotalPages(totalPagesCount);
      if (safePage !== page) setPage(safePage);
    } catch (err) {
      setError(getPocketBaseUiError(err, "Failed to load interview queue.") ?? "Failed to load interview queue.");
      setQueue([]);
      setTotalPages(1);
    } finally {
      setIsListLoading(false);
    }
  }

  useEffect(() => {
    void fetchQueue(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, search, refreshToken]);

  // ─── Modal handlers ──────────────────────────────────────────────────────────

  function handleView(row: QueueRow) {
    setViewRow(row);
  }

  function handleSchedule(candidate: CandidateRow) {
    setScheduleCandidate(candidate);
    setForm({ ...initialForm, candidate: candidate.id });
  }

  function handleEdit(row: QueueRow) {
    setEditRow(row);
    const iv = row.interview;
    setForm({
      candidate: row.candidate.id,
      interview_date: toDateInputValue(iv?.interview_date),
      result: iv?.result ?? "",
      notes: iv?.notes ?? "",
      assessment_score: iv?.assessment_score != null ? String(iv.assessment_score) : "",
      assessment_max_score: iv?.assessment_max_score != null ? String(iv.assessment_max_score) : "",
      assessment_notes: iv?.assessment_notes ?? "",
    });
  }

  function handleCloseFormModal() {
    setScheduleCandidate(null);
    setEditRow(null);
    setError("");
  }

  // ─── Submit handlers ─────────────────────────────────────────────────────────

  async function handleInterviewSubmit(e: FormEvent, isEdit: boolean) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        candidate: form.candidate,
        interview_date: form.interview_date || null,
        result: form.result || null,
        notes: form.notes.trim() || null,
        assessment_score: form.assessment_score ? Number(form.assessment_score) : null,
        assessment_max_score: form.assessment_max_score ? Number(form.assessment_max_score) : null,
        assessment_notes: form.assessment_notes.trim() || null,
      };

      if (isEdit && editRow?.interview) {
        await pb.collection("interviews").update(editRow.interview.id, payload);
      } else {
        await pb.collection("interviews").create(payload);
      }

      showFeedback("success", isEdit ? "Interview updated." : "Interview scheduled.");
      handleCloseFormModal();
      setRefreshToken((v) => v + 1);
    } catch (err) {
      setError(getPocketBaseUiError(err, "Operation failed.") ?? "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Render helpers ──────────────────────────────────────────────────────────

  function renderFormFields() {
    return (
      <>
        <label className="grid gap-1">
          <span className="text-sm text-(--muted) font-bold">Interview Date</span>
          <input
            type="date"
            value={form.interview_date}
            onChange={(e) => setForm((f) => ({ ...f, interview_date: e.target.value }))}
            className="w-full border border-(--border) bg-white text-(--text) rounded-md px-3 py-2.5 text-sm outline-none"
          />
        </label>

        <Selection
          label="Result"
          value={form.result}
          onChange={(val) => setForm((f) => ({ ...f, result: val }))}
          options={resultOptions}
          placeholder="Awaiting result..."
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-(--muted) font-bold">Score</span>
            <input
              type="number"
              value={form.assessment_score}
              onChange={(e) => setForm((f) => ({ ...f, assessment_score: e.target.value }))}
              className="border border-(--border) rounded-md px-3 py-2.5 text-sm"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-(--muted) font-bold">Max Score</span>
            <input
              type="number"
              value={form.assessment_max_score}
              onChange={(e) => setForm((f) => ({ ...f, assessment_max_score: e.target.value }))}
              className="border border-(--border) rounded-md px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm text-(--muted) font-bold">General Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="border border-(--border) rounded-md px-3 py-2.5 text-sm min-h-20"
          />
        </label>
      </>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="w-full mx-auto">
        <main className="grid gap-3">
          <section className="w-full bg-white border rounded-md border-(--border) shadow-[var(--shadow),var(--inset)] px-4 py-6 flex flex-col gap-4">

            {showToast && success && (
              <Toast type={toastType} message={success} onClose={() => setShowToast(false)} />
            )}

            {/* Header */}
            <div>
              <h1 className="text-2xl text-(--text) font-bold">Interviews</h1>
              <p className="text-(--muted) text-sm font-medium">Manage pending schedules and interview results.</p>
            </div>

            {/* Search */}
            <div className="max-w-sm">
              <Searchbar
                value={search}
                onChange={(v) => { setSearch(v); setPage(1); }}
                placeholder="Search candidates"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="bg-(--surface2)">
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tl-xl">#</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Candidate</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Status</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Interview Date</th>
                    <th className="px-4 py-3 font-bold text-(--muted)">Result</th>
                    <th className="px-4 py-3 font-bold text-(--muted) rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isListLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-(--muted)">
                        Loading...
                      </td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-(--muted)">
                        <div className="flex flex-col items-center gap-2">
                          <Icon icon="tabler:calendar-off" width="44" height="44" className="text-(--muted) mb-1" />
                          <span className="text-base font-semibold">No pending interviews</span>
                          <span className="text-sm">All candidates have been interviewed or there are no active candidates.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    queue.map((row, idx) => (
                      <tr
                        key={row.candidate.id}
                        className="border-b border-(--border) hover:bg-(--surface2)/60 transition-colors"
                      >
                        <td className="px-4 py-3 text-(--muted)">{(page - 1) * perPage + idx + 1}</td>
                        <td className="px-4 py-3 font-semibold">{candidateName(row.candidate)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-3 py-1 rounded-xl text-sm font-medium ${candidateStatusBadge[row.candidate.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                            {row.candidate.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.interview?.interview_date ? (
                            formatDate(row.interview.interview_date)
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-xl text-sm font-medium bg-yellow-100 text-yellow-700">
                              Not Scheduled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.interview?.result ? (
                            <span className={`inline-block px-3 py-1 rounded-xl text-sm font-medium ${resultBadge[row.interview.result] ?? "bg-gray-100 text-gray-700"}`}>
                              {row.interview.result}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 italic">
                              Awaiting
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleView(row)}
                              className="px-3 py-1.5 bg-(--surface2) rounded-md font-semibold flex items-center gap-1 text-sm hover:bg-(--border) transition-colors"
                            >
                              <Icon icon="tabler:eye" width="15" height="15" /> View
                            </button>
                            {canManage && (
                              row.interview
                                ? (
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(row)}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md font-semibold flex items-center gap-1 text-sm hover:bg-blue-200 transition-colors"
                                  >
                                    <Icon icon="tabler:edit" width="15" height="15" /> Update Result
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSchedule(row.candidate)}
                                    className="px-3 py-1.5 bg-(--primary)/20 text-[var(--primary)] rounded-md font-semibold flex items-center gap-1 text-sm hover:bg-(--primary)/30 transition-colors"
                                  >
                                    <Icon icon="tabler:calendar-plus" width="15" height="15" /> Schedule
                                  </button>
                                )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {queue.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
              />
            )}

          </section>

          {/* View Modal */}
          <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Interview Info">
            {viewRow && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-(--muted) uppercase mb-1">Candidate</p>
                    <p className="font-semibold">{candidateName(viewRow.candidate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-(--muted) uppercase mb-1">Status</p>
                    <p>{viewRow.candidate.status}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-(--muted) uppercase mb-1">Date</p>
                    <p>{formatDate(viewRow.interview?.interview_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-(--muted) uppercase mb-1">Assessment</p>
                    <p>{scoreLabel(viewRow.interview)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-(--muted) uppercase mb-1">Result</p>
                    {viewRow.interview?.result ? (
                      <span className={`inline-block px-3 py-1 rounded-xl text-xs font-semibold ${resultBadge[viewRow.interview.result] ?? "bg-gray-100 text-gray-700"}`}>
                        {viewRow.interview.result}
                      </span>
                    ) : (
                      <span className="text-(--muted) italic text-sm">Awaiting result</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-(--muted) uppercase mb-1">Notes</p>
                  <p className="p-3 bg-(--surface2) rounded-md text-sm">
                    {viewRow.interview?.notes || "No notes."}
                  </p>
                </div>
              </div>
            )}
          </Modal>

          {/* Schedule / Update Modal */}
          <Modal
            open={!!scheduleCandidate || !!editRow}
            onClose={handleCloseFormModal}
            title={editRow ? "Update Interview Result" : "Schedule Interview"}
          >
            <form onSubmit={(e) => handleInterviewSubmit(e, !!editRow)} className="grid gap-4">
              {renderFormFields()}
              {error && <p className="text-[var(--accent)] text-sm">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseFormModal}
                  className="px-4 py-2 border border-(--border) rounded-md font-bold hover:bg-(--surface2)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-(--primary) text-white rounded-md font-bold disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Modal>

        </main>
      </div>
    </div>
  );
}

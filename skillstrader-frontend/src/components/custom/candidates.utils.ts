import type { CandidateForm } from "../../types/Candidate";
import { documentTypes } from "./candidates.constants";

export const initialForm: CandidateForm = {
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

export function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function createEmptyDocumentsMap(): Record<string, string | null> {
  const docs: Record<string, string | null> = {};
  for (const [key] of documentTypes) docs[key] = null;
  return docs;
}

export function getCandidateDisplayName(
  candidate:
    | Pick<
        CandidateForm,
        "last_name" | "first_name" | "middle_name" | "full_name"
      >
    | null
    | undefined,
): string {
  if (!candidate) return "Unnamed Candidate";

  if (candidate.last_name) {
    return `${candidate.last_name}, ${candidate.first_name}${
      candidate.middle_name ? ` ${candidate.middle_name}` : ""
    }`;
  }

  return candidate.full_name?.trim() || "Unnamed Candidate";
}

export function buildCandidatePayload(form: CandidateForm): Record<string, unknown> {
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

  if (form.profile_photo instanceof File) {
    payload.photo = form.profile_photo;
  }

  return payload;
}

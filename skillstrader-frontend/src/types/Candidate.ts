import type { CandidateFlag } from "../utils/candidateFlags";

// ─── Status Transition Rule ───────────────────────────────────────────────────
export type StatusRule = {
  warning?: (candidate: CandidateForm) => string | null;
  disabled?: (candidate: CandidateForm) => boolean;
  disabledReason?: string;
};

// ─── PocketBase raw record shape (from API) ───────────────────────────────────
export type CandidateRecord = {
  id: string;
  full_name?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  prefix?: string;
  suffix?: string;
  marital_status?: string;
  home_address?: string;
  permanent_address?: string;
  pagibig_number?: string;
  highest_educ_attainment?: string;
  school_elementary?: string;
  school_junior_high?: string;
  school_senior_high?: string;
  school_college?: string;
  school_other?: string;
  school_other_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  education?: string;
  work_history?: string;
  skills?: string;
  certifications?: string;
  desired_salary?: string;
  position_screened?: string;
  notes?: string;
  status?: string;
  consent_given?: boolean;
  consent_at?: string;
  consent_source?: string;
  consent_version?: string;
  is_archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  photo?: string;
};

// ─── Document record from PocketBase ─────────────────────────────────────────
export type DocumentRecord = {
  id: string;
  candidate?: string;
  doc_type?: string;
  file?: string;
};

// ─── Interview summary (minimal, for flag computation) ────────────────────────
export type InterviewSummary = {
  interview_date?: string | null;
  result?: string | null;
};

// ─── Position record ──────────────────────────────────────────────────────────
export type PositionRecord = {
  id: string;
  industry?: string;
  title?: string;
};

// ─── Main form/state shape used throughout the app ───────────────────────────
export type CandidateForm = {
  id?: number | string;

  // Personal info
  last_name: string;
  first_name: string;
  middle_name: string;
  prefix: string;
  suffix: string;
  full_name?: string;
  marital_status: string;

  // Address
  home_address: string;
  permanent_address: string;

  // Government IDs
  pagibig_number: string;

  // Education
  highest_educ_attainment: string;
  school_elementary: string;
  school_junior_high: string;
  school_senior_high: string;
  school_college: string;
  school_other: string;
  school_other_name?: string;

  // Contact
  email: string;
  phone: string;

  // Work details
  work_history: string;
  skills: string;
  certifications: string;
  desired_salary: string;
  position_screened: string;

  // Application
  notes: string;
  status: string;

  // Consent
  consent_given: boolean;
  consent_at: string;
  consent_source: string;
  consent_version: string;

  // System computed — never stored in PocketBase
  computed_flags?: CandidateFlag[];

  // Archive metadata
  is_archived?: boolean;
  archived_at?: string;
  archived_by?: string;

  // Files
  profile_photo?: File | string | null;
  documents?: Record<string, string | File | null>;
};

// ArchivedCandidate is the same shape — alias lang
export type ArchivedCandidate = CandidateForm;
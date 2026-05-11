export type CandidateFlag = 'Not Scheduled' | 'Not Interviewed' | 'Missing Docs' | 'Completed';

/**
 * Required documents — ALL three must be present for "Missing Docs" to clear.
 */
export const REQUIRED_DOCUMENT_TYPES = ['resume', 'nbi_clearance', 'police_clearance'] as const;

/**
 * Terminal statuses — pipeline is ended, no flags are computed.
 * Staff manually set these; the system stops tracking action items.
 */
export const TERMINAL_STATUSES = ['Deployed', 'Rejected', 'Unfit to work'] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export function isTerminalStatus(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Minimal shapes needed by this utility.
 * Kept generic so both Candidates and Interviews pages can pass their own types.
 */
export type FlagCandidateInput = {
  status: string;
  documents?: Record<string, string | File | null | undefined> | null;
};

export type FlagInterviewInput = {
  interview_date?: string | null;
  result?: string | null;
} | null | undefined;

/**
 * Compute the Action Required flags for a candidate.
 *
 * Rules:
 *  - Terminal status (Deployed / Rejected / Unfit to work) → always []
 *  - Missing Docs  → resume, nbi_clearance, and police_clearance must ALL exist
 *  - Not Scheduled → no interview record, OR interview_date is empty/null
 *  - Not Interviewed → no interview record, OR result is empty/null
 *  - Completed     → none of the above flags triggered
 */
export function computeCandidateFlags(
  candidate: FlagCandidateInput,
  interview: FlagInterviewInput,
): CandidateFlag[] {
  // Terminal — pipeline ended, nothing to flag
  if (isTerminalStatus(candidate.status)) return [];

  const flags: CandidateFlag[] = [];

  // --- Missing Docs ---
  const docs = candidate.documents ?? {};
  const hasRequiredDocs = REQUIRED_DOCUMENT_TYPES.every(
    (key) => {
      const val = docs[key];
      return val !== null && val !== undefined && val !== '';
    },
  );
  if (!hasRequiredDocs) flags.push('Missing Docs');

  // --- Not Scheduled ---
  const hasInterviewDate = !!interview?.interview_date;
  if (!hasInterviewDate) flags.push('Not Scheduled');

  // --- Not Interviewed ---
  const hasResult = !!interview?.result;
  if (!hasResult) flags.push('Not Interviewed');

  // --- Completed ---
  if (flags.length === 0) flags.push('Completed');

  return flags;
}

/**
 * Returns true if a candidate still needs action in the interview queue.
 * Used by the Interviews page to decide which candidates to show.
 */
export function needsInterviewAction(
  candidate: FlagCandidateInput,
  interview: FlagInterviewInput,
): boolean {
  const flags = computeCandidateFlags(candidate, interview);
  return flags.includes('Not Scheduled') || flags.includes('Not Interviewed');
}
export type CandidateRecord = {
  id: string;
  full_name?: string;
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  status?: string;
};

export type InterviewRecord = {
  id: string;
  candidate?: string;
  interview_date?: string;
  result?: string;
  notes?: string;
  assessment_score?: number | null;
  assessment_max_score?: number | null;
  assessment_notes?: string;
  expand?: {
    candidate?: CandidateRecord;
  };
};

export type InterviewForm = {
  candidate: string;
  interview_date: string;
  result: string;
  notes: string;
  assessment_score: string;
  assessment_max_score: string;
  assessment_notes: string;
};
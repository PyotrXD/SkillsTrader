import { useEffect, useState } from 'react';
import { getPocketBaseUiError, pb } from '../lib/pocketbase/pb';

type CandidateRecord = {
  id: string;
};

type InterviewRecord = {
  candidate?: string | null;
  interview_date?: string | null;
  result?: string | null;
};

type DocumentRecord = {
  candidate?: string | null;
  doc_type?: string | null;
  status?: string | null;
};

type MetricState = {
  notInterviewed: number;
  notScheduled: number;
  missingDocuments: number;
};

const REQUIRED_DOCUMENT_TYPES = ['resume', 'passport', 'visa', 'nbi_clearance', 'police_clearance'];
const ACCEPTED_DOCUMENT_STATUSES = new Set(['Submitted', 'Verified']);

function toCandidateId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function isPastOrToday(dateText: string, todayISO: string): boolean {
  const normalized = dateText.slice(0, 10);
  return normalized <= todayISO;
}

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricState>({
    notInterviewed: 0,
    notScheduled: 0,
    missingDocuments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      setLoading(true);
      setError(null);

      try {
        const [candidates, interviews, documents] = await Promise.all([
          pb.collection('candidates').getFullList<CandidateRecord>({ sort: '-updated' }),
          pb.collection('interviews').getFullList<InterviewRecord>({ sort: '-updated' }),
          pb.collection('documents').getFullList<DocumentRecord>({ sort: '-updated' }),
        ]);

        const candidateIds = new Set(candidates.map((candidate) => candidate.id));
        const todayISO = new Date().toISOString().slice(0, 10);

        const scheduledCandidateIds = new Set<string>();
        const interviewedCandidateIds = new Set<string>();

        for (const interview of interviews) {
          const candidateId = toCandidateId(interview.candidate);
          if (!candidateId || !candidateIds.has(candidateId)) continue;

          scheduledCandidateIds.add(candidateId);

          const hasResult = typeof interview.result === 'string' && interview.result.trim().length > 0;
          const hasPastDate =
            typeof interview.interview_date === 'string' &&
            interview.interview_date.trim().length > 0 &&
            isPastOrToday(interview.interview_date.trim(), todayISO);

          if (hasResult || hasPastDate) interviewedCandidateIds.add(candidateId);
        }

        const docsByCandidate = new Map<string, Set<string>>();
        for (const doc of documents) {
          const candidateId = toCandidateId(doc.candidate);
          const docType = typeof doc.doc_type === 'string' ? doc.doc_type.trim() : '';
          const status = typeof doc.status === 'string' ? doc.status.trim() : '';
          if (!candidateId || !candidateIds.has(candidateId) || !docType) continue;
          if (!ACCEPTED_DOCUMENT_STATUSES.has(status)) continue;

          if (!docsByCandidate.has(candidateId)) docsByCandidate.set(candidateId, new Set<string>());
          docsByCandidate.get(candidateId)?.add(docType);
        }

        let missingDocuments = 0;
        for (const candidate of candidates) {
          const available = docsByCandidate.get(candidate.id) ?? new Set<string>();
          const hasAllRequired = REQUIRED_DOCUMENT_TYPES.every((docType) => available.has(docType));
          if (!hasAllRequired) missingDocuments += 1;
        }

        if (!mounted) return;
        setMetrics({
          notInterviewed: candidates.length - interviewedCandidateIds.size,
          notScheduled: candidates.length - scheduledCandidateIds.size,
          missingDocuments,
        });
      } catch (err) {
        const message = getPocketBaseUiError(err, 'Failed to load dashboard metrics.');
        if (!mounted) return;
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-3" aria-label="Candidate dashboard metrics">
      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates not interviewed</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics.notInterviewed}</p>
      </article>

      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates not scheduled</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics.notScheduled}</p>
      </article>

      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates with missing documents</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics.missingDocuments}</p>
      </article>

      {error ? <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}
    </section>
  );
}

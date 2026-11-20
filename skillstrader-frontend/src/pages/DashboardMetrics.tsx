import { useEffect, useState } from 'react';
import { getPocketBaseUiError, pb } from '../lib/pocketbase/pb';
import { computeCandidateFlags, hasMissingRequiredDocuments, type FlagCandidateInput } from '../utils/candidateFlags';
import { EXPIRY_WARNING_DAYS, summariseExpiry } from '../utils/documentExpiry';

type CandidateRecord = {
  id: string;
  status?: string;
};

type InterviewRecord = {
  candidate?: string | null;
  interview_date?: string | null;
  result?: string | null;
};

type DocumentRecord = {
  candidate?: string | null;
  doc_type?: string | null;
  file?: string | null;
  expiry_date?: string | null;
};

type MetricState = {
  notInterviewed: number;
  notScheduled: number;
  missingDocuments: number;
  /** Documents already past their expiry date. */
  expiredDocuments: number;
  /** Documents whose expiry lands within EXPIRY_WARNING_DAYS, today included. */
  expiringDocuments: number;
};

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMetrics() {
      setLoading(true);
      setError(null);

      try {
        const [candidates, interviews, documents] = await Promise.all([
          pb.collection('candidates').getFullList<CandidateRecord>({
            filter: 'is_archived = false', fields: 'id,status', requestKey: null,
          }),
          pb.collection('interviews').getFullList<InterviewRecord>({
            sort: '-created', fields: 'candidate,interview_date,result', requestKey: null,
          }),
          pb.collection('documents').getFullList<DocumentRecord>({
            fields: 'candidate,doc_type,file,expiry_date', requestKey: null,
          }),
        ]);

        const candidateIds = new Set(candidates.map((candidate) => candidate.id));
        // The Candidates page uses the newest interview for each candidate.
        const latestInterviews = new Map<string, InterviewRecord>();
        for (const interview of interviews) {
          const candidateId = interview.candidate;
          if (candidateId && candidateIds.has(candidateId) && !latestInterviews.has(candidateId)) {
            latestInterviews.set(candidateId, interview);
          }
        }

        const docsByCandidate = new Map<string, NonNullable<FlagCandidateInput['documents']>>();
        for (const doc of documents) {
          const { candidate, doc_type: type, file } = doc;
          if (!candidate || !candidateIds.has(candidate) || !type || !file) continue;
          const files = docsByCandidate.get(candidate) ?? {};
          files[type] = file;
          docsByCandidate.set(candidate, files);
        }

        let notInterviewed = 0;
        let notScheduled = 0;
        let missingDocuments = 0;
        for (const candidate of candidates) {
          const status = candidate.status ?? '';
          const candidateDocuments = docsByCandidate.get(candidate.id);
          if (status === 'Deployed') {
            if (hasMissingRequiredDocuments(candidateDocuments)) missingDocuments += 1;
            continue;
          }

          const flags = computeCandidateFlags({ status, documents: candidateDocuments }, latestInterviews.get(candidate.id));
          if (flags.includes('Not Interviewed')) notInterviewed += 1;
          if (flags.includes('Not Scheduled')) notScheduled += 1;
          if (flags.includes('Missing Docs')) missingDocuments += 1;
        }

        // Expiry is counted over every document row, not only candidate-linked ones:
        // employer-level paperwork (OEC, DMW contract) blocks deployment the same way,
        // and filtering to live candidates would hide those rows from the count.
        const expiry = summariseExpiry(documents);

        if (!mounted) return;
        setMetrics({
          notInterviewed,
          notScheduled,
          missingDocuments,
          expiredDocuments: expiry.expired,
          expiringDocuments: expiry.expiring,
        });
      } catch (err) {
        if (!mounted) return;
        const fallback = 'Failed to load dashboard metrics.';
        setError(getPocketBaseUiError(err, fallback) ?? fallback);
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
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Candidate dashboard metrics">
      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates not interviewed</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics?.notInterviewed ?? '—'}</p>
      </article>

      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates not scheduled</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics?.notScheduled ?? '—'}</p>
      </article>

      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Candidates with missing documents</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">{loading ? '...' : metrics?.missingDocuments ?? '—'}</p>
      </article>

      <article className="bg-white border border-[var(--border)] rounded-2xl shadow-[0_10px_26px_rgba(13,27,110,0.06)] p-4 grid gap-2">
        <p className="m-0 text-[var(--muted)] text-[12px] font-bold tracking-[0.04em] uppercase">Documents needing expiry action</p>
        <p className="m-0 text-[clamp(28px,4vw,34px)] font-extrabold leading-none text-[var(--navy)]">
          {loading ? '...' : metrics ? metrics.expiredDocuments + metrics.expiringDocuments : '—'}
        </p>
        {/* The window is stated, not implied: a bare count gives no way to tell how urgent it is. */}
        <p className="m-0 text-[var(--muted)] text-[11px]">
          {loading
            ? `Loading`
            : metrics && `${metrics.expiredDocuments} lapsed · ${metrics.expiringDocuments} due within ${EXPIRY_WARNING_DAYS} days`}
        </p>
      </article>

      {error ? <p role="alert" className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}
    </section>
  );
}

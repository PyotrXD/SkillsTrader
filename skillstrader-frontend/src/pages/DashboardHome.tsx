import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getPocketBaseUiError, pb } from '../lib/pocketbase/pb';
import DashboardMetrics from './DashboardMetrics';
import jobOrdersData from '../data/job-orders.json';

type JobOrderRecord = {
  status?: string;
};

type Props = {
  email: string;
  onNavigate?: (key: string) => void;
};

export default function DashboardHome({ email, onNavigate }: Props) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [activeJobs, setActiveJobs] = useState<number | null>(null);
  const [unprocessedApplicants, setUnprocessedApplicants] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      try {
        const openJobs = (jobOrdersData as JobOrderRecord[]).filter(
          (job) => job.status === 'Open'
        ).length;

        const result = await pb.collection('candidates').getList(1, 1, {
          filter: 'status = "New Applicant"',
        });

        if (!mounted) return;
        setActiveJobs(openJobs);
        setUnprocessedApplicants(result.totalItems);
      } catch (err) {
        const message = getPocketBaseUiError(err, 'Failed to load dashboard counts.');
        if (!mounted) return;
        setError(message);
      }
    }

    void loadCounts();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid gap-5">
      {/* Refresh reminder banner */}
      {!bannerDismissed && (
        <div className="relative bg-gradient-to-r from-[var(--navy)] to-[var(--navy2)] rounded-2xl px-6 py-5 text-center text-white">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setBannerDismissed(true)}
            className="absolute top-3 right-3 text-white/70 hover:text-white bg-transparent border-none cursor-pointer"
          >
            <Icon icon="tabler:x" width="18" height="18" />
          </button>
          <p className="m-0 text-[14px] font-medium">
            Don't let your job posts get buried! Bump to the top or extend duration with a quick refresh.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('job_orders')}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary2)] text-white font-bold text-[13px] px-5 py-2.5 cursor-pointer border-none hover:brightness-105 transition-all"
          >
            Refresh Now
          </button>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="m-0 text-[20px] font-bold text-[var(--navy)]">
          Welcome to your Recruitment Dashboard
        </h1>
        <span className="text-[12px] text-[var(--muted)]">Signed in as {email}</span>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Job and applicant summary">
        <button
          type="button"
          onClick={() => onNavigate?.('job_orders')}
          className="text-left bg-gradient-to-br from-[var(--navy)] to-[var(--navy2)] rounded-2xl p-4 flex items-center justify-between cursor-pointer border-none hover:brightness-110 transition-all"
        >
          <div>
            <p className="m-0 text-white/70 text-[12px] font-bold tracking-wide uppercase">Active Jobs</p>
            <p className="m-0 text-white text-[30px] font-extrabold leading-none">
              {activeJobs === null ? '...' : activeJobs}
            </p>
          </div>
          <Icon icon="tabler:briefcase" width="32" height="32" className="text-white/40" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('candidates')}
          className="text-left bg-gradient-to-br from-[#3a3f4b] to-[#23262e] rounded-2xl p-4 flex items-center justify-between cursor-pointer border-none hover:brightness-110 transition-all"
        >
          <div>
            <p className="m-0 text-white/70 text-[12px] font-bold tracking-wide uppercase">Unprocessed Applicants</p>
            <p className="m-0 text-white text-[30px] font-extrabold leading-none">
              {unprocessedApplicants === null ? '...' : unprocessedApplicants}
            </p>
          </div>
          <Icon icon="tabler:users" width="32" height="32" className="text-white/40" />
        </button>
      </section>

      {error ? <p className="m-0 text-[#9f2d20] text-[13px]">{error}</p> : null}

      {/* Quick links */}
      <section aria-label="Quick links" className="grid gap-2.5">
        <h2 className="m-0 text-[14px] font-bold text-[var(--navy)]">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate?.('job_orders')}
            className="flex items-center gap-2.5 border border-[var(--border)] bg-white rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--navy2)] cursor-pointer hover:bg-[var(--surface2)] transition-colors"
          >
            <Icon icon="tabler:file-plus" width="18" height="18" className="text-[var(--primary)]" />
            Create Job Ad
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('candidates')}
            className="flex items-center gap-2.5 border border-[var(--border)] bg-white rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--navy2)] cursor-pointer hover:bg-[var(--surface2)] transition-colors"
          >
            <Icon icon="tabler:search" width="18" height="18" className="text-[var(--primary)]" />
            Talent Sourcing
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('employer')}
            className="flex items-center gap-2.5 border border-[var(--border)] bg-white rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--navy2)] cursor-pointer hover:bg-[var(--surface2)] transition-colors"
          >
            <Icon icon="tabler:building" width="18" height="18" className="text-[var(--primary)]" />
            View Employer Inquiries
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('positions')}
            className="flex items-center gap-2.5 border border-[var(--border)] bg-white rounded-xl px-4 py-3 text-[13px] font-semibold text-[var(--navy2)] cursor-pointer hover:bg-[var(--surface2)] transition-colors"
          >
            <Icon icon="tabler:list-details" width="18" height="18" className="text-[var(--primary)]" />
            Manage Positions
          </button>
        </div>
      </section>

      {/* Candidate metrics (existing component, restyled via shared CSS vars) */}
      <DashboardMetrics />
    </div>
  );
}

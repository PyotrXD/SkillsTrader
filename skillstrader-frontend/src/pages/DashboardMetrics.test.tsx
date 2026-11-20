import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DashboardHome from './DashboardHome';

afterEach(() => vi.unstubAllGlobals());

const candidates = [
  { id: 'new', status: 'New Applicant' },
  { id: 'scheduled', status: 'Lined-Up' },
  { id: 'needs-docs', status: 'Lined-Up' },
  { id: 'deployed-missing', status: 'Deployed' },
  { id: 'deployed-complete', status: 'Deployed' },
  { id: 'rejected', status: 'Rejected' },
];
const interviews = [
  { candidate: 'scheduled', interview_date: '2020-10-10', result: '' },
  { candidate: 'scheduled', interview_date: '2020-10-01', result: 'Passed' },
  { candidate: 'needs-docs', interview_date: '2020-10-01', result: 'Passed' },
];
const documents = [
  { candidate: 'scheduled', doc_type: 'resume', file: 'resume.pdf' },
  { candidate: 'scheduled', doc_type: 'nbi_clearance', file: 'nbi.pdf' },
  { candidate: 'scheduled', doc_type: 'police_clearance', file: 'police.pdf' },
  { candidate: 'deployed-complete', doc_type: 'resume', file: 'resume.pdf' },
  { candidate: 'deployed-complete', doc_type: 'nbi_clearance', file: 'nbi.pdf' },
  { candidate: 'deployed-complete', doc_type: 'police_clearance', file: 'police.pdf' },
  { candidate: 'needs-docs', doc_type: 'resume', file: '' },
  { candidate: null, doc_type: 'other', file: 'employer.pdf', expiry_date: '2000-01-01' },
];

function listResponse(items: object[]) {
  return Response.json({ items, totalItems: items.length, totalPages: 1, page: 1 });
}

it('loads candidate metrics while the applicant count calls the same PocketBase endpoint', async () => {
  let finishCandidateList: (() => void) | undefined;
  const fetchRecords = vi.fn((input: string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/candidates/records')) {
      if (url.searchParams.get('perPage') === '1') {
        finishCandidateList?.();
        return Promise.resolve(listResponse([candidates[0]]));
      }
      expect(url.searchParams.get('filter')).toBe('is_archived = false');
      return new Promise<Response>((resolve, reject) => {
        finishCandidateList = () => resolve(listResponse(candidates));
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    }
    if (url.pathname.endsWith('/interviews/records')) {
      expect(url.searchParams.get('sort')).toBe('-created');
      return Promise.resolve(listResponse(interviews));
    }
    if (url.pathname.endsWith('/documents/records')) return Promise.resolve(listResponse(documents));
    return Promise.resolve(listResponse([]));
  });
  vi.stubGlobal('fetch', fetchRecords);

  render(<DashboardHome email="staff@example.test" />);

  expect(await screen.findByRole('button', { name: /unprocessed applicants 1/i })).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('Candidates not interviewed').nextElementSibling).toHaveTextContent(/^2$/);
    expect(screen.getByText('Candidates not scheduled').nextElementSibling).toHaveTextContent(/^1$/);
    expect(screen.getByText('Candidates with missing documents').nextElementSibling).toHaveTextContent(/^3$/);
    expect(screen.getByText('Documents needing expiry action').nextElementSibling).toHaveTextContent(/^1$/);
  });
});

it('shows unavailable counts when PocketBase cannot load the metrics', async () => {
  vi.stubGlobal('fetch', async (input: string) => new URL(input).pathname.endsWith('/documents/records')
    ? Response.json({ message: 'Could not load documents.' }, { status: 500 })
    : listResponse([]));

  render(<DashboardHome email="staff@example.test" />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load documents.');
  expect(screen.getByText('Candidates not interviewed').nextElementSibling).toHaveTextContent('—');
  expect(screen.getByText('Candidates not scheduled').nextElementSibling).toHaveTextContent('—');
  expect(screen.getByText('Candidates with missing documents').nextElementSibling).toHaveTextContent('—');
});

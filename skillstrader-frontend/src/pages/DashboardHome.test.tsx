import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import Staff from '../components/user-role/Staff';

const { getCandidates } = vi.hoisted(() => ({
  getCandidates: vi.fn(),
}));

const emptyPage = { items: [], totalItems: 0, totalPages: 0, page: 1 };

beforeEach(() => {
  getCandidates.mockReset().mockResolvedValue(emptyPage);
});

vi.mock('@iconify/react', () => ({ Icon: () => null }));

vi.mock('../lib/pocketbase/pb', () => ({
  pb: {
    authStore: { isValid: true, record: { email: 'staff@example.com' } },
    files: { getToken: vi.fn().mockResolvedValue('test-token') },
    collection: (name: string) => ({
      getList: name === 'candidates' ? getCandidates : vi.fn().mockResolvedValue(emptyPage),
      getFullList: vi.fn().mockResolvedValue([]),
    }),
  },
  getUserRole: () => 'staff',
}));

it('opens Candidates from the dashboard with the unprocessed applicant filter already applied', async () => {
  render(<MemoryRouter><Staff /></MemoryRouter>);

  const card = await screen.findByRole('button', { name: /unprocessed applicants 0/i });
  expect(getCandidates).toHaveBeenCalledWith(1, 1, {
    filter: 'status = "New Applicant" && is_archived = false',
    requestKey: null,
  });
  getCandidates.mockClear();

  fireEvent.click(card);

  expect(screen.getByRole('tab', { name: 'Candidates' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('combobox')).toHaveValue('New Applicant');
  expect(getCandidates).toHaveBeenNthCalledWith(1, 1, 5, expect.objectContaining({
    filter: 'is_archived = false && status = "New Applicant"',
  }));
  await screen.findByText('No candidates found');

  fireEvent.click(screen.getByRole('button', { name: 'Clear Filter' }));

  expect(screen.getByRole('combobox')).toHaveValue('');
  expect(getCandidates).toHaveBeenLastCalledWith(1, 5, expect.objectContaining({
    filter: 'is_archived = false',
  }));
  await waitFor(() => expect(screen.queryByText('Loading candidates...')).toBeNull());
});

it.each(['succeeds', 'fails'])('keeps the latest candidate results when an earlier request %s', async (outcome) => {
  render(<MemoryRouter><Staff /></MemoryRouter>);
  const card = await screen.findByRole('button', { name: /unprocessed applicants 0/i });

  let settleOlderRequest!: () => void;
  const olderRequest = new Promise<typeof emptyPage>((resolve, reject) => {
    settleOlderRequest = outcome === 'fails'
      ? () => reject(new Error('Earlier request failed'))
      : () => resolve(emptyPage);
  });
  getCandidates
    .mockReturnValueOnce(olderRequest)
    .mockResolvedValueOnce({
      ...emptyPage,
      items: [{ id: 'newer', full_name: 'Lined-Up Candidate', status: 'Lined-Up' }],
      totalItems: 1,
      totalPages: 1,
    });
  fireEvent.click(card);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Lined-Up' } });
  await screen.findByText('Lined-Up Candidate');

  await act(async () => {
    settleOlderRequest();
  });

  expect(screen.getByText('Lined-Up Candidate')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

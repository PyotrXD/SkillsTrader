import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A failed read used to look exactly like an empty table: every one of these screens logged to
// console.error and then rendered "No X found". The guard is therefore twofold -- the reason must
// appear, AND the empty message must not. Asserting only the first would still pass on a screen
// that shows both.
const h = vi.hoisted(() => {
  const getList = vi.fn();
  const getFullList = vi.fn();
  return {
    getList,
    getFullList,
    collection: vi.fn(() => ({ getList, getFullList })),
  };
});

vi.mock('@iconify/react', () => ({ Icon: () => null }));

vi.mock('../../lib/pocketbase/pb', () => ({
  pb: {
    authStore: {
      isValid: true,
      token: 'test-token',
      record: { id: 'u1', role: 'administrator', collectionName: 'users' },
      clear: vi.fn(),
    },
    collection: h.collection,
    files: { getURL: () => 'blob:mock' },
  },
  getUserRole: () => 'administrator',
  getPocketBaseUiError: (_err: unknown, fallback: string) => fallback,
  isPocketBaseAutoCancelledError: () => false,
}));

import AuditLog from './AuditLog';
import Employers from './Employers';
import JobOrders from './JobOrders';
import Placements from './Placements';
import Positions from './Positions';

// Every screen's failure mode is the same call. Rejections are created per test via
// mockRejectedValue rather than shared as a module-scope promise: a rejected promise that exists
// before a handler is attached is reported as an unhandled rejection during test collection.

beforeEach(() => {
  h.getList.mockReset();
  h.getFullList.mockReset();
  h.collection.mockClear();
  // Every screen's failure mode is the same call, so one rejected read drives all of them.
  h.getList.mockRejectedValue(new Error('offline'));
  h.getFullList.mockRejectedValue(new Error('offline'));
});

function emptyMessages(): string[] {
  return [
    'No employers found',
    'No audit logs found',
    'No placements found',
    'No job orders found',
    'No positions found',
  ];
}

describe('a failed read is not an empty list', () => {
  it.each([
    ['Employers', <Employers />, 'Could not load employers.'],
    ['AuditLog', <AuditLog />, 'Could not load the audit trail.'],
    ['Placements', <Placements />, 'Could not load placements.'],
    ['JobOrders', <JobOrders />, 'Could not load job orders.'],
    ['Positions', <Positions />, 'Could not load positions.'],
  ])('%s states the failure instead of claiming there is nothing to show', async (_label, ui, message) => {
    render(ui);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(message);

    // The lie this replaces: the empty state must not also render.
    for (const text of emptyMessages()) {
      expect(screen.queryByText(text)).toBeNull();
    }
  });

  it('gives the reader a way to recover without leaving the page', async () => {
    render(<Employers />);

    const alert = await screen.findByRole('alert');
    expect(h.getList).toHaveBeenCalledTimes(1);

    fireEvent.click(withinRetry());

    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    expect(alert.textContent).toBeTruthy();
  });

  it('shows a reason while a page is in flight on the screens that had none', async () => {
    // A promise that has not settled yet: previously these three rendered a bare table.
    let release: (v: unknown) => void = () => {};
    h.getList.mockReturnValue(new Promise((res) => { release = res; }));

    render(<Employers />);
    expect(screen.getByText(/Loading employers\.\.\./i)).toBeInTheDocument();

    release({ items: [], totalPages: 1, page: 1, perPage: 5, totalItems: 0 });
    await waitFor(() => expect(screen.queryByText(/Loading employers\.\.\./i)).toBeNull());
  });

  it('renders neither message when the read succeeds, so a real empty list still says so', async () => {
    h.getList.mockResolvedValue({ items: [], totalPages: 1, page: 1, perPage: 5, totalItems: 0 });

    render(<Employers />);

    await waitFor(() => expect(screen.getByText('No employers found')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

function withinRetry(): HTMLElement {
  const button = screen.getByRole('button', { name: /try again/i });
  return button;
}

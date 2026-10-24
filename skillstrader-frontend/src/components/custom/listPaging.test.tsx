import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Each screen reaches PocketBase through the pb module singleton, so one mock of
// that module captures every collection call the three components make.
const h = vi.hoisted(() => {
  const getList = vi.fn();
  const getFullList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  return {
    getList,
    getFullList,
    create,
    update,
    remove,
    collection: vi.fn(() => ({ getList, getFullList, create, update, delete: remove })),
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
  },
  getUserRole: () => 'administrator',
  getPocketBaseUiError: (_err: unknown, fallback: string) => fallback,
  isPocketBaseAutoCancelledError: () => false,
}));

import AuditLog from './AuditLog';
import Employers from './Employers';
import Placements from './Placements';

const TOTAL_ITEMS = 15;

function serverPage(items: unknown[], requestedPage: number, perPage: number) {
  return {
    items,
    totalItems: TOTAL_ITEMS,
    totalPages: Math.ceil(TOTAL_ITEMS / perPage),
    page: requestedPage,
    perPage,
  };
}

function auditRows(tag: string) {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${tag}-${i}`,
    timestamp: `2026-10-0${i + 1} 08:00:00.000Z`,
    actor_email: `actor${tag}${i}@example.com`,
    actor_role: 'administrator',
    action: 'update',
    entity: 'Candidate',
    entity_name: `AUDIT_${tag.toUpperCase()}_${i}`,
  }));
}

function employerRows(tag: string) {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${tag}-${i}`,
    company_name: `EMPLOYER_${tag.toUpperCase()}_${i}`,
    contact_person: 'Person',
    contact_email: 'person@example.com',
    contact_phone: '0000000',
    country: 'Philippines',
    industry: 'Manpower',
    billing_name: '',
    billing_email: '',
    billing_phone: '',
    billing_address: '',
    payment_terms: '',
    billing_notes: '',
  }));
}

function placementRows(tag: string) {
  return Array.from({ length: 5 }, (_, i) => ({
    id: `${tag}-${i}`,
    candidate: `c${i}`,
    job_order: `j${i}`,
    status: 'Pending',
    departure_date: `PLACEMENT_${tag.toUpperCase()}_${i}`,
    arrival_date: '',
    placement_date: '',
    placement_fee_date: '',
    placement_fee_amount: 0,
  }));
}

beforeEach(() => {
  h.getList.mockReset();
  h.getFullList.mockReset();
  h.collection.mockClear();
});

describe('AuditLog paging', () => {
  beforeEach(() => {
    h.getList.mockImplementation((page: number, perPage: number) =>
      Promise.resolve(serverPage(auditRows(`p${page}`), page, perPage)),
    );
  });

  it('offers every server page, not just the one it holds in state', async () => {
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByText('AUDIT_P1_0')).toBeInTheDocument());

    // 15 entries at 5 per page is 3 pages; the pager must say so.
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('requests page 2 from the server and renders page 2 rows', async () => {
    render(<AuditLog />);
    await waitFor(() => expect(screen.getByText('AUDIT_P1_0')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(screen.getByText('AUDIT_P2_0')).toBeInTheDocument());
    expect(screen.queryByText('No audit logs found')).toBeNull();
    expect(h.getList).toHaveBeenLastCalledWith(2, 5, expect.anything());
  });
});

describe('Employers paging', () => {
  beforeEach(() => {
    h.getList.mockImplementation((page: number, perPage: number) =>
      Promise.resolve(serverPage(employerRows(`p${page}`), page, perPage)),
    );
  });

  it('fetches at the page size the pager advertises', async () => {
    render(<Employers />);
    await waitFor(() => expect(screen.getByText('EMPLOYER_P1_0')).toBeInTheDocument());

    expect(h.getList).toHaveBeenCalledWith(1, 5, expect.anything());
  });

  it('requests page 2 from the server and renders page 2 rows', async () => {
    render(<Employers />);
    await waitFor(() => expect(screen.getByText('EMPLOYER_P1_0')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(screen.getByText('EMPLOYER_P2_0')).toBeInTheDocument());
    expect(screen.queryByText('No employers found')).toBeNull();
  });

  it('pushes the search term into the server filter', async () => {
    render(<Employers />);
    await waitFor(() => expect(screen.getByText('EMPLOYER_P1_0')).toBeInTheDocument());

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'oceanic' } });

    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    const options = h.getList.mock.calls[1][2] as { filter?: string };
    expect(options.filter ?? '').toContain('oceanic');
  });
});

describe('Placements paging', () => {
  beforeEach(() => {
    h.getFullList.mockResolvedValue([]);
    h.getList.mockImplementation((page: number, perPage: number) =>
      Promise.resolve(serverPage(placementRows(`p${page}`), page, perPage)),
    );
  });

  it('requests page 2 from the server and renders page 2 rows', async () => {
    render(<Placements />);
    await waitFor(() => expect(screen.getByText('PLACEMENT_P1_0')).toBeInTheDocument());

    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(screen.getByText('PLACEMENT_P2_0')).toBeInTheDocument());
    expect(screen.queryByText('No placements found')).toBeNull();
    expect(h.getList).toHaveBeenLastCalledWith(2, 5, expect.anything());
  });
});

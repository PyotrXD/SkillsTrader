import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A list screen used to raise "Could not load X. This is a connection or server problem" while its
// own table rendered rows underneath the banner. The read had not failed: React StrictMode mounts,
// cleans up and re-runs each effect in development, so every list effect sends two byte-identical
// requests, and pocketbase@0.26.8 auto-cancels the first of those. The catch then reported that
// abort as a load failure. Employers and Job Orders were the only two screens that never opted out
// with `requestKey: null`, the convention AuditLog, Placements, Positions, Candidates and Users
// already follow.
//
// The mock below reproduces the SDK rule instead of asserting it: an identical pending request key
// (collection + method + options, ignoring requestKey itself) aborts the earlier request, and
// `requestKey: null` opts out of that. Drop the opt-out from a screen and this suite goes red the
// same way the browser did.

const AUTO_CANCEL_MESSAGE =
  'The request was aborted (most likely autocancelled; you can find more info in https://github.com/pocketbase/js-sdk#auto-cancellation).';

function autoCancelError() {
  const err = new Error(AUTO_CANCEL_MESSAGE) as Error & { isAbort: boolean; status: number };
  err.isAbort = true;
  err.status = 0;
  return err;
}

const h = vi.hoisted(() => ({
  pending: new Map<string, () => void>(),
  reads: [] as { collection: string; method: string; options: Record<string, unknown> }[],
}));

function settle(promise: Promise<unknown>, label: string) {
  return promise.then(
    (value) => ({ label, ok: true, value }),
    (error) => ({ label, ok: false, error }),
  );
}

function listRead(collection: string, method: string, options: Record<string, unknown>, makeResult: () => unknown) {
  h.reads.push({ collection, method, options });

  const cancels = options.requestKey !== null;
  const key = `${collection}.${method}.${JSON.stringify({ ...options, requestKey: undefined })}`;

  if (cancels) {
    h.pending.get(key)?.();
  }

  return new Promise((resolve, reject) => {
    const abort = () => reject(autoCancelError());
    if (cancels) h.pending.set(key, abort);

    queueMicrotask(() => {
      // A cancelled request no longer owns its key, so it resolves for nobody and stays rejected.
      if (!cancels || h.pending.get(key) === abort) {
        h.pending.delete(key);
        resolve(makeResult());
      }
    });
  });
}

const EMPLOYER_ROW = {
  id: 'e1',
  company_name: 'Acme Co',
  contact_person: 'Ada Byron',
  contact_email: 'ada@acme.test',
  contact_phone: '+1',
  country: 'Singapore',
  industry: 'Hospitality',
};

const JOB_ORDER_ROW = {
  id: 'j1',
  title: 'Welder',
  openings: 4,
  status: 'open',
  employer: 'e1',
  location: 'Dubai',
  description: '',
  expand: { employer: { company_name: 'Acme Co' } },
};

function resultFor(collection: string, method: string) {
  const rows =
    collection === 'employer'
      ? [EMPLOYER_ROW]
      : collection === 'job_orders'
        ? [JOB_ORDER_ROW]
        : [];

  if (method === 'getFullList') {
    return collection === 'employer' ? [{ id: 'e1', company_name: 'Acme Co' }] : rows;
  }
  return { items: rows, page: 1, perPage: 5, totalItems: rows.length, totalPages: 1 };
}

vi.mock('@iconify/react', () => ({ Icon: () => null }));

vi.mock('../../lib/pocketbase/pb', () => ({
  pb: {
    authStore: {
      isValid: true,
      token: 'test-token',
      record: { id: 'u1', role: 'administrator', collectionName: 'users' },
      clear: vi.fn(),
    },
    collection: (name: string) => ({
      getList: (page: number, perPage: number, options: Record<string, unknown> = {}) =>
        listRead(name, 'getList', options, () => resultFor(name, 'getList')),
      getFullList: (options: Record<string, unknown> = {}) =>
        listRead(name, 'getFullList', options, () => resultFor(name, 'getFullList')),
    }),
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

beforeEach(() => {
  h.pending.clear();
  h.reads.length = 0;
});

describe('a list read does not cancel its own retry', () => {
  it.each([
    ['Employers', <Employers />],
    ['JobOrders', <JobOrders />],
    ['AuditLog', <AuditLog />],
    ['Placements', <Placements />],
    ['Positions', <Positions />],
  ])('%s opts every read out of SDK auto-cancellation', async (_label, ui) => {
    render(
      <StrictMode>
        {ui}
      </StrictMode>,
    );

    await settle(Promise.resolve(), 'flush');
    // Two more task turns so every queued continuation above has landed.
    await new Promise((res) => setTimeout(res, 0));
    await new Promise((res) => setTimeout(res, 0));

    expect(h.reads.length).toBeGreaterThan(0);
    for (const read of h.reads) {
      expect(read.options.requestKey).toBeNull();
    }
  });

  it.each([
    ['Employers', <Employers />, 'Acme Co', 'Could not load employers.'],
    ['JobOrders', <JobOrders />, 'Welder', 'Could not load job orders.'],
  ])('%s never claims a failed read while %s rows are on screen', async (_label, ui, row, banner) => {
    render(
      <StrictMode>
        {ui}
      </StrictMode>,
    );

    // The data arrived, which is the only claim the banner has to contradict.
    await screen.findByText(row);
    expect(screen.queryByText(banner)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

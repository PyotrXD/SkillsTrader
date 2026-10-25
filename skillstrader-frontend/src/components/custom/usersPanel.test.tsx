import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// UsersPanel reaches PocketBase through the pb module singleton, so one mock captures create,
// update and getList. getUserRole decides which controls the panel renders, so it is driven by a
// mutable hoisted value rather than a fixed return: the same assertions have to hold for an
// administrator and fail for a manager.
const h = vi.hoisted(() => {
  const getList = vi.fn();
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const state = { role: 'administrator' as string };
  return {
    getList,
    create,
    update,
    remove,
    state,
    collection: vi.fn(() => ({ getList, create, update, delete: remove })),
  };
});

vi.mock('@iconify/react', () => ({ Icon: () => null }));

// UsersPanel never renders these; only the file's default export does. Stubbed so this unit test
// does not pull in the whole workspace module graph behind Sidebar.
vi.mock('../ui/Navbar', () => ({ default: () => null }));
vi.mock('./Sidebar', () => ({ default: () => null }));

vi.mock('../../lib/pocketbase/pb', () => ({
  pb: {
    authStore: {
      isValid: true,
      token: 'test-token',
      record: { id: 'admin1', role: 'administrator', collectionName: 'users' },
      clear: vi.fn(),
    },
    collection: h.collection,
  },
  getUserRole: () => h.state.role,
  getPocketBaseUiError: (_err: unknown, fallback: string) => fallback,
  isPocketBaseAutoCancelledError: () => false,
}));

import { UsersPanel } from './Users';

const ADMIN_SELF = { id: 'admin1', email: 'admin@example.com', name: 'Ada Admin', role: 'administrator' };
const STAFF_ROW = { id: 'staff1', email: 'staff@example.com', name: 'Sam Staff', role: 'staff' };

function userPage(items: Record<string, unknown>[], requestedPage: number, perPage: number) {
  return {
    items,
    totalItems: items.length,
    totalPages: 1,
    page: requestedPage,
    perPage,
  };
}

beforeEach(() => {
  h.getList.mockReset();
  h.create.mockReset();
  h.update.mockReset();
  h.remove.mockReset();
  h.collection.mockClear();
  h.state.role = 'administrator';
  h.getList.mockImplementation((page: number, perPage: number) =>
    Promise.resolve(userPage([ADMIN_SELF, STAFF_ROW], page, perPage)),
  );
});

describe('UsersPanel create', () => {
  it('sends the provisioned account with the fields the roster needs', async () => {
    h.create.mockResolvedValue({ id: 'new1' });
    render(<UsersPanel />);
    await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: '  recruit@example.com  ' } });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: '  Ro Quinn  ' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'sup3rsecret' } });
    fireEvent.change(within(dialog).getByLabelText('Password confirm'), { target: { value: 'sup3rsecret' } });
    fireEvent.change(within(dialog).getByLabelText('Role'), { target: { value: 'manager' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    expect(h.create).toHaveBeenCalledWith({
      email: 'recruit@example.com',
      password: 'sup3rsecret',
      passwordConfirm: 'sup3rsecret',
      name: 'Ro Quinn',
      role: 'manager',
      // The roster reads email, so a provisioned account must not land with it hidden; see the
      // comment at the create call in Users.tsx.
      emailVisibility: true,
    });
    // She declined auto-verification: an admin-created account must not arrive pre-verified.
    expect(h.create.mock.calls[0][0]).not.toHaveProperty('verified');
  });

  it('offers no create, edit or delete controls to a manager', async () => {
    h.state.role = 'manager';
    render(<UsersPanel />);
    await waitFor(() => expect(h.getList).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: 'Create User' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    // The rows themselves are still readable: 1794000000 widened listRule/viewRule only.
    expect(screen.getByText('staff@example.com')).toBeInTheDocument();
  });

  it('hides Delete on the signed-in row so the last administrator cannot lock themselves out', async () => {
    render(<UsersPanel />);
    await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument());

    // Ada Admin is this session's own record (id admin1), so no Delete next to her.
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole('button', { name: /^Delete/ });
    expect(deleteButtons).toHaveLength(1);
    expect(screen.getByText('Sam Staff').closest('tr')?.textContent).toContain('Delete');
    expect(screen.getByText('Ada Admin').closest('tr')?.textContent).not.toContain('Delete');
  });
});

describe('UsersPanel edit', () => {
  async function openEditForRow(name: string) {
    render(<UsersPanel />);
    await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
    const row = screen.getByText(name).closest('tr');
    fireEvent.click(within(row as HTMLElement).getByRole('button', { name: /Edit/ }));
    return screen.findByRole('dialog');
  }

  it('omits a blank password pair so the current password is kept', async () => {
    h.update.mockResolvedValue({ id: STAFF_ROW.id });
    const dialog = await openEditForRow('Sam Staff');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    const [, payload] = h.update.mock.calls[0];
    expect(payload).toEqual({ email: 'staff@example.com', name: 'Sam Staff', role: 'staff' });
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('passwordConfirm');
  });

  it('sends both password fields when one is typed', async () => {
    h.update.mockResolvedValue({ id: STAFF_ROW.id });
    const dialog = await openEditForRow('Sam Staff');

    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'rotated12345' } });
    fireEvent.change(within(dialog).getByLabelText('Password confirm'), { target: { value: 'rotated12345' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(h.update).toHaveBeenCalledTimes(1));
    const [, payload] = h.update.mock.calls[0];
    expect(payload.password).toBe('rotated12345');
    expect(payload.passwordConfirm).toBe('rotated12345');
  });

  it('leaves the password fields optional so a role change needs no new password', async () => {
    h.update.mockResolvedValue({ id: STAFF_ROW.id });
    const dialog = await openEditForRow('Sam Staff');

    expect(within(dialog).getByLabelText('Password')).not.toBeRequired();
    expect(within(dialog).getByLabelText('Password confirm')).not.toBeRequired();
  });

  it('an administrator row is editable, since 1794000000 left updateRule administrator-or-self', async () => {
    h.update.mockResolvedValue({ id: ADMIN_SELF.id });
    render(<UsersPanel />);
    await waitFor(() => expect(screen.getByText('Ada Admin')).toBeInTheDocument());

    const adminRow = screen.getByText('Ada Admin').closest('tr');
    expect(adminRow?.textContent).toContain('Edit');
  });

  it('requires a password when creating, which is the mode PocketBase validates it in', async () => {
    h.create.mockResolvedValue({ id: 'new1' });
    render(<UsersPanel />);
    await waitFor(() => expect(screen.getByText('admin@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Password')).toBeRequired();
    expect(within(dialog).getByLabelText('Password confirm')).toBeRequired();
  });
});

describe('UsersPanel search', () => {
  it('pushes the term into the server filter instead of filtering one loaded page', async () => {
    render(<UsersPanel />);
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'quinn' } });

    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    const options = h.getList.mock.calls[1][2] as { filter?: string };
    expect(options.filter ?? '').toContain('quinn');
    expect(options.filter ?? '').toContain('name ~');
  });

  it('combines the role filter and the search term in one request', async () => {
    render(<UsersPanel />);
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));

    // The role Filter is the first select in the panel; the second is Pagination's rows-per-page.
    const [roleFilterSelect] = screen.getAllByRole('combobox');
    fireEvent.change(roleFilterSelect, { target: { value: 'staff' } });
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sam' } });

    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(3));
    const options = h.getList.mock.calls[2][2] as { filter?: string };
    expect(options.filter).toContain(`role = 'staff'`);
    expect(options.filter).toContain('email ~ "sam"');
  });

  it('escapes quotes so a term cannot break out of the filter string', async () => {
    render(<UsersPanel />);
    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'a" || role="administrator' } });

    await waitFor(() => expect(h.getList).toHaveBeenCalledTimes(2));
    const options = h.getList.mock.calls[1][2] as { filter?: string };
    expect(options.filter).toContain('\\"');
    expect(options.filter).not.toContain('a" ||');
  });
});

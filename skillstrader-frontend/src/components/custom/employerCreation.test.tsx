import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  create: vi.fn(),
  getList: vi.fn(),
  authStore: { isValid: true },
}));

vi.mock('@iconify/react', () => ({ Icon: () => null }));
vi.mock('../../lib/pocketbase/pb', () => ({
  pb: {
    authStore: h.authStore,
    collection: () => ({ create: h.create, getList: h.getList }),
  },
  getUserRole: () => 'staff',
  getPocketBaseUiError: (_err: unknown, fallback: string) => fallback,
}));

import Employers from './Employers';

const sample = {
  company_name: 'asdasd',
  contact_person: 'asdasdads',
  contact_email: 'asd@gmail.com',
  contact_phone: '123123132',
  country: 'sdsda',
  industry: 'sadsdasda',
};

beforeEach(() => {
  h.authStore.isValid = true;
  h.create.mockReset();
  h.getList.mockReset().mockResolvedValue({ items: [], totalPages: 1 });
});

async function openAndFill() {
  render(<Employers />);
  await screen.findByText('No employers found');
  fireEvent.click(screen.getByRole('button', { name: '+ Add Employer' }));
  const dialog = screen.getByRole('dialog');
  for (const [placeholder, value] of [
    ['Enter company name', sample.company_name],
    ['Enter contact person', sample.contact_person],
    ['Enter contact email', sample.contact_email],
    ['Enter contact phone', sample.contact_phone],
    ['Enter country', sample.country],
    ['Enter industry', sample.industry],
  ]) {
    fireEvent.change(within(dialog).getByPlaceholderText(placeholder), { target: { value } });
  }
  return dialog;
}

describe('employer creation fix', () => {
  it('submits the documented sample and displays the created employer', async () => {
    h.create.mockResolvedValue({ id: 'employer1', ...sample });
    const dialog = await openAndFill();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Employer' }));
    await screen.findByText('Employer created');
    expect(h.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining(sample));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: sample.company_name })).toBeInTheDocument();
  });

  it('blocks unauthenticated creation and visibly explains why', async () => {
    h.authStore.isValid = false;
    render(<Employers />);
    await screen.findByText('No employers found');
    fireEvent.click(screen.getByRole('button', { name: '+ Add Employer' }));
    expect(h.create).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Please log in to add employers')).toBeVisible();
  });

  it.each([
    [400, 'Validation failed. Please check all required fields.'],
    [401, 'Authentication required. Please log in.'],
    [403, 'Access denied. Insufficient permissions.'],
  ])('shows feedback for API status %s and allows another attempt', async (status, message) => {
    h.create.mockRejectedValue({ status });
    const dialog = await openAndFill();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Employer' }));
    await waitFor(() => expect(within(dialog).getByText(message)).toBeVisible());
    expect(within(dialog).getByRole('button', { name: 'Add Employer' })).toBeEnabled();
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Employer created')).not.toBeInTheDocument();
  });
});

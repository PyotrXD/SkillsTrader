import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Pagination from './Pagination';

function renderPagination(overrides: Partial<React.ComponentProps<typeof Pagination>> = {}) {
  const props = {
    page: 3,
    totalPages: 10,
    perPage: 10,
    onPageChange: vi.fn(),
    onPerPageChange: vi.fn(),
    ...overrides,
  };
  render(<Pagination {...props} />);
  return props;
}

describe('Pagination', () => {
  it('marks the active page for assistive tech and does not mark the others', () => {
    renderPagination();
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '4' })).not.toHaveAttribute('aria-current');
  });

  it('windows the page list around the current page instead of rendering every page', () => {
    renderPagination();
    for (const page of [1, 2, 3, 4, 5]) {
      expect(screen.queryByRole('button', { name: String(page) })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: '9' })).toBeNull();
  });

  it('disables Previous on the first page', () => {
    renderPagination({ page: 1 });
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('disables Next when already on the last page', () => {
    const { onPageChange } = renderPagination({ page: 10, totalPages: 10 });
    const next = screen.getByRole('button', { name: 'Next page' });
    expect(next).toBeDisabled();
    fireEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('requests the adjacent page when the arrows are used', () => {
    const { onPageChange } = renderPagination();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('reports a page number change from the number buttons', () => {
    const { onPageChange } = renderPagination();
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('converts the rows-per-page selection back to a number', () => {
    const { onPerPageChange } = renderPagination();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '20' } });
    expect(onPerPageChange).toHaveBeenCalledWith(20);
  });

  it('renders no interactive page buttons when there are no records', () => {
    renderPagination({ page: 1, totalPages: 0 });
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.queryAllByRole('button')).toHaveLength(2);
  });
});

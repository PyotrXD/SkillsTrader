import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { EducationEntry, WorkExperienceEntry } from '../../types/Candidate';
import { EducationFields, WorkExperienceFields } from './CandidateHistoryFields';
import { emptyEducationEntry, emptyWorkExperience } from './candidateHistory';

function work(overrides: Partial<WorkExperienceEntry> = {}): WorkExperienceEntry {
  return { ...emptyWorkExperience(), ...overrides };
}

function edu(overrides: Partial<EducationEntry> = {}): EducationEntry {
  return { ...emptyEducationEntry(), ...overrides };
}

describe('WorkExperienceFields', () => {
  it('shows the empty hint until a row is added, then appends a blank entry', () => {
    const onChange = vi.fn();
    render(<WorkExperienceFields entries={[]} onChange={onChange} />);

    expect(screen.getByText('No entries yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add work history entry' }));

    expect(onChange).toHaveBeenCalledWith([work()]);
  });

  it('patches only the row being edited and keeps the others intact', () => {
    const onChange = vi.fn();
    const entries = [work({ id: 'w1', position: 'Nurse' }), work({ id: 'w2', position: 'Aide' })];
    render(<WorkExperienceFields entries={entries} onChange={onChange} />);

    // Label text repeats across rows, so each query is scoped to its own row.
    fireEvent.change(
      within(screen.getByRole('group', { name: 'Entry 1' })).getByLabelText('Position'),
      { target: { value: 'Midwife' } },
    );

    expect(onChange).toHaveBeenCalledWith([
      work({ id: 'w1', position: 'Midwife' }),
      work({ id: 'w2', position: 'Aide' }),
    ]);
  });

  it('removes just the row the button belongs to', () => {
    const onChange = vi.fn();
    const entries = [work({ id: 'w1', position: 'Nurse' }), work({ id: 'w2', position: 'Aide' })];
    render(<WorkExperienceFields entries={entries} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove work history entry 2' }));

    expect(onChange).toHaveBeenCalledWith([work({ id: 'w1', position: 'Nurse' })]);
  });

  it('locks and clears the end date when the role is marked current', () => {
    const onChange = vi.fn();
    render(
      <WorkExperienceFields
        entries={[work({ id: 'w1', start_date: '2021-01-01', end_date: '2024-01-01' })]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Currently employed here'));

    expect(onChange).toHaveBeenCalledWith([
      work({ id: 'w1', start_date: '2021-01-01', is_current: true, end_date: '' }),
    ]);
  });

  it('disables the end date input for a row that is already current', () => {
    render(<WorkExperienceFields entries={[work({ id: 'w1', is_current: true })]} onChange={vi.fn()} />);

    expect(screen.getByLabelText('End date')).toBeDisabled();
  });
});

describe('EducationFields', () => {
  it('appends a blank entry when adding a school row', () => {
    const onChange = vi.fn();
    render(<EducationFields entries={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add school entry' }));

    expect(onChange).toHaveBeenCalledWith([edu()]);
  });

  it('writes the chosen level back to the entry', () => {
    const onChange = vi.fn();
    render(<EducationFields entries={[edu({ id: 'e1', school_name: 'UP' })]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Level'), { target: { value: 'college' } });

    expect(onChange).toHaveBeenCalledWith([edu({ id: 'e1', school_name: 'UP', level: 'college' })]);
  });

  it('labels each remove button with its position so the target is unambiguous', () => {
    const entries = [edu({ id: 'e1', school_name: 'UP' }), edu({ id: 'e2', school_name: 'DLSU' })];
    render(<EducationFields entries={entries} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Remove school entry 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove school entry 2' })).toBeInTheDocument();
  });
});

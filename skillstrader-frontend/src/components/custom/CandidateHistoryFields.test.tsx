import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EducationEntry, WorkExperienceEntry } from "../../types/Candidate";
import { emptyEducationEntry, emptyWorkExperience } from "./candidateHistory";
import { EducationFields, WorkExperienceFields } from "./CandidateHistoryFields";

vi.mock("@iconify/react", () => ({ Icon: () => null }));

function WorkForm({ initial = [] }: { initial?: WorkExperienceEntry[] }) {
  const [entries, setEntries] = useState(initial);
  return <><WorkExperienceFields entries={entries} onChange={setEntries} />
    <output data-testid="entries">{JSON.stringify(entries)}</output></>;
}

describe("employment history editing", () => {
  it("accepts a year typed one digit at a time", async () => {
    render(<WorkForm />);
    await userEvent.type(screen.getByLabelText("Start year"), "2020");
    expect(screen.getByLabelText("Start year")).toHaveValue(2020);
    expect(screen.getByTestId("entries")).toHaveTextContent('"start_date":"2020-01-01"');
  });
  it("shows years immediately without creating a blank saved entry", () => {
    render(<WorkForm />);
    expect(screen.getByLabelText("Start year")).toBeVisible();
    expect(screen.getByLabelText("End year")).toBeVisible();
    expect(screen.getByTestId("entries")).toHaveTextContent("[]");
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Hospital" } });
    fireEvent.change(screen.getByLabelText("Start year"), { target: { value: "2020" } });
    expect(screen.getByTestId("entries")).toHaveTextContent('"start_date":"2020-01-01"');
    expect(screen.getByLabelText("Company")).toHaveValue("Hospital");
  });

  it("preserves precise dates and optional details when editing another field", () => {
    render(<WorkForm initial={[{ ...emptyWorkExperience(), start_date: "2020-06-12", location: "Singapore" }]} />);
    fireEvent.change(screen.getByLabelText("Position"), { target: { value: "Nurse" } });
    expect(screen.getByTestId("entries")).toHaveTextContent('"start_date":"2020-06-12"');
    expect(screen.getByLabelText("Location")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Start year"), { target: { value: "2021" } });
    expect(screen.getByTestId("entries")).toHaveTextContent('"start_date":"2021-06-12"');
  });

  it("keeps leap-day edits valid and clears the end year for a current role", () => {
    render(<WorkForm initial={[{ ...emptyWorkExperience(), start_date: "2020-02-29", end_date: "2024-05-10" }]} />);
    fireEvent.change(screen.getByLabelText("Start year"), { target: { value: "2021" } });
    expect(screen.getByTestId("entries")).toHaveTextContent('"start_date":"2021-02-28"');
    fireEvent.click(screen.getByLabelText("Currently employed here"));
    expect(screen.getByLabelText("End year")).toBeDisabled();
    expect(screen.getByTestId("entries")).toHaveTextContent('"end_date":""');
  });

  it("adds and removes jobs without changing the remaining job", () => {
    render(<WorkForm initial={[{ ...emptyWorkExperience(), company: "Hospital" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add work history entry" }));
    expect(screen.getAllByLabelText("Start year")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Remove work history entry 1" }));
    expect(screen.getByLabelText("Company")).toHaveValue("");
    expect(screen.getAllByLabelText("Start year")).toHaveLength(1);
  });
});

function work(overrides: Partial<WorkExperienceEntry> = {}): WorkExperienceEntry {
  return { ...emptyWorkExperience(), ...overrides };
}

function edu(overrides: Partial<EducationEntry> = {}): EducationEntry {
  return { ...emptyEducationEntry(), ...overrides };
}

describe('WorkExperienceFields', () => {
  it('shows the first row immediately, then appends another blank entry', () => {
    const onChange = vi.fn();
    render(<WorkExperienceFields entries={[]} onChange={onChange} />);

    expect(screen.getByLabelText('Start year')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Add work history entry' }));

    expect(onChange).toHaveBeenCalledWith([work(), work()]);
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

    expect(screen.getByLabelText('End year')).toBeDisabled();
  });
});

describe('EducationFields', () => {
  it('appends a blank entry when adding a school row', () => {
    const onChange = vi.fn();
    render(<EducationFields entries={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add school entry' }));

    expect(onChange).toHaveBeenCalledWith([edu(), edu()]);
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

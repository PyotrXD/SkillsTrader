import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CandidateForm } from "../../types/Candidate";
import CandidateFormFields from "./CandidateFormFields";
import { initialForm, buildCandidatePayload } from "./candidates.utils";
import { emptyEducationEntry } from "./candidateHistory";

vi.mock("@iconify/react", () => ({ Icon: () => null }));

function EducationForm({ initial = initialForm }: { initial?: CandidateForm }) {
  const [form, setForm] = useState(initial);
  return <><CandidateFormFields form={form} setForm={setForm} positions={[]}
    tab="education" onTabChange={() => {}} />
    <output data-testid="form">{JSON.stringify(form)}</output>
    <output data-testid="payload">{JSON.stringify(buildCandidatePayload(form))}</output></>;
}

describe("the consolidated education form", () => {
  it("shows school and years immediately without duplicating school inputs", () => {
    render(<EducationForm />);
    expect(screen.getAllByLabelText("School name")).toHaveLength(1);
    expect(screen.getByLabelText("Start year")).toBeVisible();
    expect(screen.getByLabelText("End year")).toBeVisible();
    expect(screen.queryByText("Elementary School", { selector: "label" })).not.toBeInTheDocument();
    expect(screen.getByTestId("form")).toHaveTextContent('"educations":[]');
  });

  it("keeps legacy and structured schools when editing years, with no duplicates", () => {
    render(<EducationForm initial={{ ...initialForm, school_elementary: "Primary School",
      school_college: "University", educations: [{ ...emptyEducationEntry(), id: "edu1",
        level: "college", school_name: "University", course: "Nursing", end_year: "2020" }] }} />);
    expect(screen.getAllByLabelText("School name")).toHaveLength(2);
    fireEvent.change(screen.getAllByLabelText("Start year")[1], { target: { value: "2000" } });
    expect(screen.getByTestId("form")).toHaveTextContent('"start_year":"2000"');
    expect(screen.getByTestId("form")).toHaveTextContent('"id":"edu1"');
    expect(screen.getByTestId("form")).toHaveTextContent('"course":"Nursing"');
    expect(screen.getByTestId("form")).toHaveTextContent('"school_name":"Primary School"');
    expect(screen.getByTestId("payload")).toHaveTextContent('"school_elementary":null');
    expect(screen.getByTestId("payload")).toHaveTextContent('"school_college":null');
  });

  it("removes a legacy school without bringing it back from the old fields", () => {
    render(<EducationForm initial={{ ...initialForm, school_college: "University" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove school entry 1" }));
    expect(screen.getByLabelText("School name")).toHaveValue("");
    expect(screen.getByTestId("payload")).toHaveTextContent('"school_college":null');
    expect(screen.getByTestId("form")).toHaveTextContent('"educations":[]');
  });
});

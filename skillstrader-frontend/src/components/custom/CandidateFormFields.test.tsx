import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CandidateForm } from "../../types/Candidate";
import CandidateFormFields from "./CandidateFormFields";
import { initialForm, buildCandidatePayload } from "./candidates.utils";
import { emptyEducationEntry } from "./candidateHistory";

vi.mock("@iconify/react", () => ({ Icon: () => null }));

function EducationForm({ initial = initialForm, tab = "education" }: { initial?: CandidateForm; tab?: "personal" | "education" }) {
  const [form, setForm] = useState(initial);
  return <><CandidateFormFields form={form} setForm={setForm} positions={[]}
    tab={tab} onTabChange={() => {}} />
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


describe("candidate languages", () => {
  it("adds multiple languages, saves their levels, and removes entries", () => {
    render(<EducationForm tab="personal" />);
    fireEvent.click(screen.getByRole("button", { name: "Add language" }));
    expect(Array.from(screen.getByLabelText("Competency 1").querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["Beginner", "Intermediate", "Fluent", "Native"]);
    fireEvent.change(screen.getByLabelText("Language 1"), { target: { value: " English " } });
    fireEvent.change(screen.getByLabelText("Competency 1"), { target: { value: "Fluent" } });
    fireEvent.click(screen.getByRole("button", { name: "Add language" }));
    fireEvent.change(screen.getByLabelText("Language 2"), { target: { value: "Tagalog" } });
    fireEvent.change(screen.getByLabelText("Competency 2"), { target: { value: "Native" } });
    fireEvent.change(screen.getByLabelText("Spoken 1"), { target: { value: "Native" } });
    fireEvent.change(screen.getByLabelText("Written 1"), { target: { value: "Intermediate" } });
    expect(JSON.parse(screen.getByTestId("payload").textContent!).languages).toEqual([
      { language: "English", proficiency: "Fluent", spoken: "Native", written: "Intermediate" }, { language: "Tagalog", proficiency: "Native" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Remove language 1" }));
    expect(screen.getByLabelText("Language 1")).toHaveValue("Tagalog");
    fireEvent.click(screen.getByRole("button", { name: "Remove language 1" }));
    expect(JSON.parse(screen.getByTestId("payload").textContent!).languages).toEqual([]);
  });

  it("loads saved languages and ignores blank added rows", () => {
    render(<EducationForm tab="personal" initial={{ ...initialForm, languages: [{ language: "Japanese", proficiency: "Intermediate" }] }} />);
    expect(screen.getByLabelText("Language 1")).toHaveValue("Japanese");
    expect(screen.getByLabelText("Competency 1")).toHaveValue("Intermediate");
    fireEvent.click(screen.getByRole("button", { name: "Add language" }));
    expect(JSON.parse(screen.getByTestId("payload").textContent!).languages).toEqual([{ language: "Japanese", proficiency: "Intermediate" }]);
  });
});

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  candidateCreate: vi.fn(), candidateUpdate: vi.fn(), candidateList: vi.fn(),
  workCreate: vi.fn(), workList: vi.fn(), educationCreate: vi.fn(), educationList: vi.fn(),
  educationUpdate: vi.fn(), educationDelete: vi.fn(),
}));
vi.mock("@iconify/react", () => ({ Icon: () => null }));
vi.mock("../../utils/auditLog", () => ({ addAuditLog: vi.fn() }));
vi.mock("../../lib/pocketbase/pb", () => ({
  getUserRole: () => "manager",
  pb: {
    authStore: { isValid: true, record: { email: "manager@example.test" } },
    files: { getToken: vi.fn().mockResolvedValue(""), getURL: vi.fn() },
    collection: (name: string) => {
      if (name === "candidates") return { create: h.candidateCreate, update: h.candidateUpdate, getList: h.candidateList };
      if (name === "candidate_work_experiences") return { create: h.workCreate, getList: h.workList };
      if (name === "candidate_educations") return { create: h.educationCreate, getList: h.educationList,
        update: h.educationUpdate, delete: h.educationDelete };
      return { getList: vi.fn().mockResolvedValue({ items: [], totalPages: 1 }), getFullList: vi.fn().mockResolvedValue([]) };
    },
  },
}));

import Candidates from "./Candidates";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.candidateList.mockResolvedValue({ items: [], totalPages: 1, page: 1 });
  h.candidateCreate.mockResolvedValue({ id: "candidate1" });
  h.candidateUpdate.mockResolvedValue({ id: "candidate1" });
  h.workCreate.mockResolvedValue({ id: "work1" });
  h.educationCreate.mockResolvedValue({ id: "education1" });
  h.educationUpdate.mockResolvedValue({ id: "education1" });
  h.educationDelete.mockResolvedValue(true);
  h.workList.mockResolvedValue({ items: [], totalPages: 1 });
  h.educationList.mockResolvedValue({ items: [], totalPages: 1 });
});

describe("school names after a failed save", () => {
  function schoolStorage(storage: string) {
    const candidate: Record<string, unknown> = { id: "candidate1", first_name: "Test", last_name: "Sample",
      email: "sample@example.test", phone: "123456789", school_college: "Old University" };
    const schools: Record<string, unknown>[] = storage === "structured" ? [{ id: "college1", candidate: "candidate1",
      level: "college", school_name: "Old University", start_year: 2010, end_year: 2014 }] : [];
    h.candidateList.mockImplementation(async () => ({ items: [{ ...candidate }], totalPages: 1, page: 1 }));
    h.educationList.mockImplementation(async () => ({ items: schools.map((row) => ({ ...row })), totalPages: 1 }));
    h.candidateUpdate.mockImplementation(async (_id, payload) => { Object.assign(candidate, payload); return { ...candidate }; });
    let nextId = 0;
    h.educationCreate.mockImplementation(async (payload) => {
      const row = { ...payload, id: `new-school-${++nextId}` }; schools.push(row); return { ...row };
    });
    h.educationUpdate.mockImplementation(async (id, payload) => {
      Object.assign(schools.find((row) => row.id === id)!, payload); return { id };
    });
    h.educationDelete.mockImplementation(async (id) => {
      const index = schools.findIndex((row) => row.id === id);
      if (index < 0) throw new Error("School not found");
      schools.splice(index, 1);
      return true;
    });
    return { candidate, schools };
  }

  async function editEducation() {
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Education History" }));
  }

  it.each([
    ["structured", "reload"], ["legacy-only", "reload"],
    ["structured", "same form"], ["legacy-only", "same form"],
  ])("keeps one original school after a failed %s rename and retries from %s", async (storage, retry) => {
    const { candidate, schools } = schoolStorage(storage);
    h.educationUpdate.mockRejectedValueOnce(new Error("School update failed"));

    const view = render(<Candidates />);
    await editEducation();
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "New University" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("alert"))
      .toHaveTextContent("history failed to save"));
    expect(screen.getByLabelText("School name")).toHaveValue("New University");
    expect(schools).toHaveLength(1);
    expect(schools[0].school_name).toBe("Old University");
    expect(candidate.school_college).toBeNull();

    // A real reload must show the saved original, rather than an extra school
    // fabricated by merging a newly written summary with the old history row.
    if (retry === "reload") {
      view.unmount();
      render(<Candidates />);
      await editEducation();
      expect(screen.getAllByLabelText("School name")).toHaveLength(1);
      expect(screen.getByLabelText("School name")).toHaveValue("Old University");
      fireEvent.change(screen.getByLabelText("School name"), { target: { value: "New University" } });
    }
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(schools).toHaveLength(1);
    expect(schools[0].school_name).toBe("New University");
  });

  it.each(["copy", "candidate update"])("preserves legacy originals when the %s fails, then retries without duplicate schools", async (failure) => {
    const { candidate, schools } = schoolStorage("legacy-only");
    if (failure === "copy") h.educationCreate.mockRejectedValueOnce(new Error("Copy failed"));
    else h.candidateUpdate.mockRejectedValueOnce(new Error("Parent update failed"));
    render(<Candidates />);
    await editEducation();
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "New University" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("alert"))
      .toHaveTextContent("Failed to update candidate"));
    expect(candidate.school_college).toBe("Old University");
    if (failure === "copy") expect(h.candidateUpdate).not.toHaveBeenCalled();
    else expect(schools[0].school_name).toBe("Old University");
    expect(screen.getByLabelText("School name")).toHaveValue("New University");
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(schools).toHaveLength(1);
    expect(schools[0].school_name).toBe("New University");
    expect(candidate.school_college).toBeNull();
    if (failure === "candidate update") expect(h.educationCreate).toHaveBeenCalledTimes(1);
  });

  it("retains completed copies when copying another legacy school fails", async () => {
    const { candidate, schools } = schoolStorage("legacy-only");
    candidate.school_elementary = "Primary School";
    h.educationCreate.mockImplementationOnce(async (payload) => {
      const row = { ...payload, id: "primary1" }; schools.push(row); return row;
    }).mockRejectedValueOnce(new Error("Second copy failed"));
    render(<Candidates />);
    await editEducation();
    fireEvent.change(screen.getAllByLabelText("School name")[1], { target: { value: "New University" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("alert"))
      .toHaveTextContent("Failed to update candidate"));
    expect(h.candidateUpdate).not.toHaveBeenCalled();
    expect(schools).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(schools.map((row) => row.school_name).sort()).toEqual(["New University", "Primary School"]);
    expect(candidate.school_elementary).toBeNull();
    expect(candidate.school_college).toBeNull();
  });

  it("removes a legacy school without restoring it from its old summary", async () => {
    const { candidate, schools } = schoolStorage("legacy-only");
    render(<Candidates />);
    await editEducation();
    fireEvent.click(screen.getByRole("button", { name: "Remove school entry 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(schools).toEqual([]);
    expect(candidate.school_college).toBeNull();
  });
});

describe("saving across candidate form sessions", () => {
  const candidates = ["Alpha", "Beta"].map((first_name, index) => ({
    id: `candidate${index + 1}`, first_name, last_name: "Sample",
    email: `${first_name.toLowerCase()}@example.test`, phone: "123456789",
  }));

  function loadCandidates() {
    h.candidateList.mockResolvedValue({ items: candidates, totalPages: 1, page: 1 });
  }

  async function startFirstSave() {
    loadCandidates();
    render(<Candidates />);
    const editButtons = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editButtons[0]);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Work History" }));
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Alpha employer" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(h.workCreate).toHaveBeenCalledTimes(1));
  }

  function openSecondForm() {
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Work History" }));
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Beta employer" } });
  }

  it.each(["Cancel", "Close", "Escape", "overlay"])(
    "keeps the next candidate's form and pending save isolated after closing with %s",
    async (closeMethod) => {
      const firstHistory = deferred<{ id: string }>();
      const secondCandidate = deferred<{ id: string }>();
      h.workCreate.mockReturnValueOnce(firstHistory.promise);
      h.candidateUpdate.mockResolvedValueOnce({ id: "candidate1" }).mockReturnValueOnce(secondCandidate.promise);
      await startFirstSave();
      const dialog = screen.getByRole("dialog");
      if (closeMethod === "Escape") fireEvent.keyDown(document, { key: "Escape" });
      else if (closeMethod === "overlay") fireEvent.click(dialog.querySelector('[aria-hidden="true"]')!);
      else fireEvent.click(within(dialog).getByRole("button", { name: closeMethod }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      openSecondForm();
      expect(screen.getByLabelText("Company")).toBeEnabled();
      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
      await waitFor(() => expect(h.candidateUpdate).toHaveBeenCalledTimes(2));
      await act(async () => { firstHistory.resolve({ id: "alpha-work" }); });

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("Company")).toHaveValue("Beta employer");
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
      expect(screen.queryByText("Candidate updated successfully.")).not.toBeInTheDocument();
      await act(async () => { secondCandidate.resolve({ id: "candidate2" }); });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(h.workCreate).toHaveBeenLastCalledWith(expect.objectContaining({
        candidate: "candidate2", company: "Beta employer",
      }));
    },
  );

  it("does not put a closed form's history error into the next candidate's form", async () => {
    const firstHistory = deferred<{ id: string }>();
    h.workCreate.mockReturnValueOnce(firstHistory.promise);
    await startFirstSave();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    openSecondForm();
    await act(async () => { firstHistory.reject(new Error("Alpha history failed")); });
    expect(screen.getByLabelText("Company")).toHaveValue("Beta employer");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(h.candidateUpdate).toHaveBeenLastCalledWith("candidate2", expect.any(Object));
    expect(h.workCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      candidate: "candidate2", company: "Beta employer",
    }));
  });

  it("isolates a pending legacy-school copy from the next candidate's form", async () => {
    const copy = deferred<{ id: string }>();
    loadCandidates();
    h.candidateList.mockResolvedValue({ items: [{ ...candidates[0], school_college: "Alpha University" }, candidates[1]],
      totalPages: 1, page: 1 });
    h.educationCreate.mockReturnValueOnce(copy.promise);
    render(<Candidates />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Edit" }))[0]);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Education History" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Renamed Alpha University" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(h.educationCreate).toHaveBeenCalledTimes(1));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[1]);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Education History" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "Beta University" } });
    await act(async () => { copy.resolve({ id: "alpha-school" }); });
    expect(screen.getByLabelText("School name")).toHaveValue("Beta University");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
    expect(h.educationUpdate).toHaveBeenLastCalledWith("alpha-school",
      expect.objectContaining({ school_name: "Renamed Alpha University" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(h.educationCreate).toHaveBeenLastCalledWith(expect.objectContaining({
      candidate: "candidate2", school_name: "Beta University",
    }));
  });

  it.each(["success", "failure", "history failure"])("does not reset or reopen a closed add form on late %s", async (outcome) => {
    const firstCreate = deferred<{ id: string }>();
    h.candidateCreate.mockReturnValueOnce(firstCreate.promise);
    loadCandidates();
    render(<Candidates />);
    await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(screen.getByRole("button", { name: "Add new candidate" }));
    const dialog = screen.getByRole("dialog");
    for (const [label, value] of [["Last Name *", "Sample"], ["First Name *", "New"],
      ["Email *", "new@example.test"], ["Phone *", "123456789"]]) {
      fireEvent.change(within(dialog).getByText(label, { selector: "label" }).parentElement!.querySelector("input")!,
        { target: { value } });
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Work History" }));
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "New employer" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Candidate" }));
    await waitFor(() => expect(h.candidateCreate).toHaveBeenCalledTimes(1));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    openSecondForm();
    await act(async () => {
      if (outcome === "failure") firstCreate.reject(new Error("Creation failed"));
      else {
        if (outcome === "history failure") h.workCreate.mockRejectedValueOnce(new Error("History failed"));
        firstCreate.resolve({ id: "new-candidate" });
      }
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toHaveValue("Beta employer");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("candidate history save and load failures", () => {
  it("passes both older and structured histories from loaded records into the print document", async () => {
    h.candidateList.mockResolvedValue({ items: [{ id: "candidate1", first_name: "Test", last_name: "Sample",
      school_elementary: "Primary School", education: "Older education summary", work_history: "Earlier employer" }],
      totalPages: 1, page: 1 });
    h.workList.mockResolvedValue({ items: [{ id: "work1", candidate: "candidate1", company: "Current employer",
      position: "Nurse", start_date: "2020-01-01", is_current: true }], totalPages: 1 });
    h.educationList.mockResolvedValue({ items: [{ id: "edu1", candidate: "candidate1", level: "college",
      school_name: "University", start_year: 2010, end_year: 2014 }], totalPages: 1 });
    const write = vi.fn();
    const popup = { document: { open: vi.fn(), write, close: vi.fn() }, focus: vi.fn(), __resumePrinted: true };
    const open = vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    try {
      render(<Candidates />);
      fireEvent.click(await screen.findByRole("button", { name: "View" }));
      fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
      expect(write).toHaveBeenCalledTimes(1);
      const doc = new DOMParser().parseFromString(write.mock.calls[0][0], "text/html");
      for (const content of ["Primary School", "University", "2010 - 2014", "Older education summary",
        "Current employer", "Earlier employer", "Present"]) expect(doc.body.textContent).toContain(content);
      expect(doc.body.textContent).not.toContain("No work experience information provided");
    } finally { open.mockRestore(); }
  });
  it("keeps a partial-save error visible and retries without duplicating the candidate or job", async () => {
    h.educationCreate.mockRejectedValueOnce(new Error("Connection lost"));
    render(<Candidates />);
    await screen.findByText("No candidates found");
    fireEvent.click(screen.getByRole("button", { name: "Add new candidate" }));
    let dialog = screen.getByRole("dialog");
    for (const [label, value] of [["Last Name *", "Sample"], ["First Name *", "Test"],
      ["Email *", "sample@example.test"], ["Phone *", "123456789"]]) {
      const input = within(dialog).getByText(label, { selector: "label" }).parentElement!.querySelector("input")!;
      fireEvent.change(input, { target: { value } });
    }
    fireEvent.click(within(dialog).getByRole("button", { name: "Work History" }));
    fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Hospital" } });
    fireEvent.change(screen.getByLabelText("Start year"), { target: { value: "2020" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Education History" }));
    fireEvent.change(screen.getByLabelText("School name"), { target: { value: "University" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "college" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Candidate" }));

    await screen.findByRole("button", { name: "Save Changes" });
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent("work/school history failed to save");
    expect(screen.queryByText("Candidate added successfully.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("School name")).toHaveValue("University");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(h.candidateCreate).toHaveBeenCalledTimes(1);
    expect(h.workCreate).toHaveBeenCalledTimes(1);
    expect(h.educationCreate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("Candidate updated successfully.");
  });

  it("shows a failed history load as a retryable list error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      h.candidateList.mockResolvedValue({ items: [{ id: "candidate1", first_name: "Test", last_name: "Sample" }], totalPages: 1, page: 1 });
      h.workList.mockRejectedValue(new Error("Connection lost"));
      render(<Candidates />);
      expect(await screen.findByRole("alert")).toHaveTextContent("Could not load candidates");
      expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
      expect(screen.queryByText("No candidates found")).not.toBeInTheDocument();
      h.workList.mockResolvedValue({ items: [], totalPages: 1 });
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByRole("button", { name: "View" })).toBeInTheDocument();
    } finally { log.mockRestore(); }
  });
});


describe("candidate language persistence", () => {
  it("saves a language-only edit, reloads it, and clears the last language", async () => {
    const candidate = { id: "candidate1", first_name: "Test", last_name: "Sample",
      email: "sample@example.test", phone: "123456789", languages: [] };
    h.candidateList.mockImplementation(async () => ({ items: [{ ...candidate }], totalPages: 1, page: 1 }));
    h.candidateUpdate.mockImplementation(async (_id, payload) => { Object.assign(candidate, payload); return { ...candidate }; });
    const view = render(<Candidates />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Add language" }));
    fireEvent.change(screen.getByLabelText("Language 1"), { target: { value: "English" } });
    fireEvent.change(screen.getByLabelText("Competency 1"), { target: { value: "Fluent" } });
    fireEvent.change(screen.getByLabelText("Spoken 1"), { target: { value: "Native" } });
    fireEvent.change(screen.getByLabelText("Written 1"), { target: { value: "Intermediate" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(h.candidateUpdate).toHaveBeenCalledWith("candidate1", expect.objectContaining({ languages: [{ language: "English", proficiency: "Fluent", spoken: "Native", written: "Intermediate" }] }));
    view.unmount();
    render(<Candidates />);
    fireEvent.click(await screen.findByRole("button", { name: "View" }));
    expect(screen.getByText("English - Fluent")).toBeVisible();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByLabelText("Language 1")).toHaveValue("English");
    expect(screen.getByLabelText("Competency 1")).toHaveValue("Fluent");
    expect(screen.getByLabelText("Spoken 1")).toHaveValue("Native");
    expect(screen.getByLabelText("Written 1")).toHaveValue("Intermediate");
    fireEvent.click(screen.getByRole("button", { name: "Remove language 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(candidate.languages).toEqual([]);
  });
});

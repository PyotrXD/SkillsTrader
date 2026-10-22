import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const collection = {
    create: vi.fn().mockResolvedValue({ id: "new1" }),
    update: vi.fn().mockResolvedValue({ id: "updated" }),
    delete: vi.fn().mockResolvedValue(true),
  };
  return { collection, pb: { collection: vi.fn(() => collection) } };
});

vi.mock("../../lib/pocketbase/pb", () => ({ pb: mocks.pb }));

import type { EducationEntry, WorkExperienceEntry } from "../../types/Candidate";
import {
  buildEducationPayload,
  buildWorkExperiencePayload,
  educationLevelLabel,
  emptyEducationEntry,
  emptyWorkExperience,
  formatEducationPeriod,
  formatWorkPeriod,
  getMostRecentRole,
  sortEducations,
  sortWorkExperiences,
  syncEducations,
  syncWorkExperiences,
  EDUCATION_COLLECTION,
  WORK_EXPERIENCE_COLLECTION,
} from "./candidateHistory";

function work(overrides: Partial<WorkExperienceEntry> = {}): WorkExperienceEntry {
  return { ...emptyWorkExperience(), ...overrides };
}

function edu(overrides: Partial<EducationEntry> = {}): EducationEntry {
  return { ...emptyEducationEntry(), ...overrides };
}

beforeEach(() => {
  mocks.collection.create.mockClear();
  mocks.collection.update.mockClear();
  mocks.collection.delete.mockClear();
  mocks.pb.collection.mockClear();
  mocks.pb.collection.mockReturnValue(mocks.collection);
});

describe("latest work history derivation", () => {
  it("prefers the row marked current over a later end date", () => {
    const entries = [
      work({ position: "Older", end_date: "2024-12-31" }),
      work({ position: "Now", is_current: true, start_date: "2020-01-01" }),
    ];

    expect(getMostRecentRole(entries)).toBe("Now (2020 - Present)");
  });

  it("falls back to the newest end date when nothing is current", () => {
    const entries = [
      work({ position: "First", company: "A", end_date: "2019-06-30" }),
      work({ position: "Second", company: "B", end_date: "2023-06-30" }),
      work({ position: "Third", company: "C", end_date: "2021-06-30" }),
    ];

    expect(sortWorkExperiences(entries).map((e) => e.position)).toEqual([
      "Second",
      "Third",
      "First",
    ]);
  });

  it("uses start_date when a row has no end date and is not current", () => {
    const entries = [
      work({ position: "Stale", start_date: "2010-01-01" }),
      work({ position: "Recent", start_date: "2022-01-01" }),
    ];

    expect(sortWorkExperiences(entries)[0].position).toBe("Recent");
  });

  it("returns an empty string when there are no rows", () => {
    expect(getMostRecentRole([])).toBe("");
    expect(getMostRecentRole(undefined)).toBe("");
  });

  it("omits the period when no dates are filled in", () => {
    expect(getMostRecentRole([work({ position: "Freelance" })])).toBe("Freelance");
  });
});

describe("period formatting", () => {
  it("renders Present for a current role and a year range otherwise", () => {
    expect(formatWorkPeriod(work({ start_date: "2021-03-01", is_current: true }))).toBe(
      "2021 - Present",
    );
    expect(
      formatWorkPeriod(work({ start_date: "2021-03-01", end_date: "2024-05-01" })),
    ).toBe("2021 - 2024");
  });

  it("tolerates a one-sided education range", () => {
    expect(formatEducationPeriod(edu({ start_year: "2018" }))).toBe("2018");
    expect(formatEducationPeriod(edu({ start_year: "2018", end_year: "2022" }))).toBe(
      "2018 - 2022",
    );
  });
});

describe("education ordering and labels", () => {
  it("sorts by the most recent year and keeps unknown levels readable", () => {
    const entries = [
      edu({ school_name: "Elem", level: "elementary", end_year: "2012" }),
      edu({ school_name: "College", level: "college", end_year: "2020" }),
      edu({ school_name: "SHS", level: "senior_high", end_year: "2016" }),
    ];

    expect(sortEducations(entries).map((e) => e.school_name)).toEqual([
      "College",
      "SHS",
      "Elem",
    ]);
    expect(educationLevelLabel("junior_high")).toBe("Junior High School");
    expect(educationLevelLabel("")).toBe("");
  });
});

describe("payload builders", () => {
  it("clears end_date for a current role and blanks empty strings to null", () => {
    expect(
      buildWorkExperiencePayload(
        work({ position: " Dev ", is_current: true, end_date: "2024-01-01" }),
      ),
    ).toMatchObject({ position: "Dev", end_date: null, is_current: true, company: null });
  });

  it("defaults an unlabelled education row to other and coerces years to numbers", () => {
    expect(buildEducationPayload(edu({ school_name: "Up", start_year: "2019" }))).toMatchObject(
      { level: "other", start_year: 2019, end_year: null },
    );
  });

  it("drops a non-numeric year instead of sending NaN", () => {
    expect(buildEducationPayload(edu({ start_year: "abc" })).start_year).toBeNull();
  });
});

describe("syncWorkExperiences", () => {
  it("creates rows that have no id, tagging them with the candidate", async () => {
    await syncWorkExperiences("cand1", [], [work({ position: "Nurse" })]);

    expect(mocks.collection.create).toHaveBeenCalledWith({
      ...buildWorkExperiencePayload(work({ position: "Nurse" })),
      candidate: "cand1",
    });
    expect(mocks.pb.collection).toHaveBeenCalledWith(WORK_EXPERIENCE_COLLECTION);
  });

  it("skips rows that are completely blank", async () => {
    await syncWorkExperiences("cand1", [], [work()]);

    expect(mocks.collection.create).not.toHaveBeenCalled();
  });

  it("updates only rows whose payload actually changed", async () => {
    const before = work({ id: "w1", position: "Nurse" });
    await syncWorkExperiences("cand1", [before], [before]);
    expect(mocks.collection.update).not.toHaveBeenCalled();

    await syncWorkExperiences("cand1", [before], [{ ...before, company: "Hospital" }]);
    expect(mocks.collection.update).toHaveBeenCalledWith("w1", expect.objectContaining({
      company: "Hospital",
    }));
  });

  it("deletes rows that were removed from the form", async () => {
    await syncWorkExperiences(
      "cand1",
      [work({ id: "w1", position: "Nurse" }), work({ id: "w2", position: "Aide" })],
      [work({ id: "w2", position: "Aide" })],
    );

    expect(mocks.collection.delete).toHaveBeenCalledTimes(1);
    expect(mocks.collection.delete).toHaveBeenCalledWith("w1");
  });

  it("deletes a persisted row that the user blanked out", async () => {
    await syncWorkExperiences(
      "cand1",
      [work({ id: "w1", position: "Nurse" })],
      [work({ id: "w1" })],
    );

    expect(mocks.collection.delete).toHaveBeenCalledWith("w1");
    expect(mocks.collection.update).not.toHaveBeenCalled();
  });
});

describe("syncEducations", () => {
  it("routes writes to the education collection", async () => {
    await syncEducations("cand1", [], [edu({ level: "college", school_name: "UP" })]);

    expect(mocks.pb.collection).toHaveBeenCalledWith(EDUCATION_COLLECTION);
    expect(mocks.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({ level: "college", candidate: "cand1" }),
    );
  });
});

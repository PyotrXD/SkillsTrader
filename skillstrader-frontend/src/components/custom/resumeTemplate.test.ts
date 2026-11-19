import { describe, expect, it } from "vitest";
import { generateResumeHtml } from "./resumeTemplate";
import { emptyEducationEntry, emptyWorkExperience } from "./candidateHistory";

/*
 * These are static guards on the generated print document, not layout tests: jsdom has no layout
 * engine, so the geometry itself is only provable in a real browser. What they do protect is the two
 * invariants whose breakage was found by printing candidate 06 in headless Edge -- a document that
 * stamped "Page 1 / 2" while the PDF ran to three pages.
 */
const html = generateResumeHtml(
  {
    id: "sample000000000",
    full_name: "Sample Candidate",
    email: "candidate06@example.test",
    status: "Unfit to work",
  },
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
);

describe("the print document's page geometry", () => {
  it("declares A4 as the paper size with no page margin", () => {
    // Without this the export inherits the OS driver default, which is how Letter output appears.
    expect(html).toMatch(/@page\s*\{[^}]*size:\s*A4[^}]*margin:\s*0[^}]*\}/s);
  });

  it("sizes each sheet to exactly one A4 page", () => {
    expect(html).toMatch(/\.sheet\s*\{[^}]*width:\s*210mm[^}]*height:\s*297mm/s);
  });

  it("keeps the screen sheet gap out of print media", () => {
    // The regression that produced a blank third page: a 6mm gap on a 297mm sheet inside a 297mm
    // page overflows by 6mm, and that overflow printed as an empty trailing page.
    const gap = html.indexOf("margin-top: 6mm");
    expect(gap).toBeGreaterThan(-1);

    const screen = html.indexOf("@media screen");
    const print = html.indexOf("@media print");
    expect(screen).toBeLessThan(gap);
    expect(gap).toBeLessThan(print);
  });

  it("stamps the real page count instead of a literal, on a footer repeated per sheet", () => {
    // The footer used to carry a hardcoded "1/1", which lied on every multi-page resume.
    expect(html).not.toContain("1/1");
    expect(html).toContain("SkillsTrader");
    expect(html).toContain("page-number");
  });

  it("ships the pacer inline, since the popup has no bundle to import", () => {
    expect(html).toContain("getBoundingClientRect");
    expect(html).toContain("data-resume-live");
    expect(html).toContain("resume-measure");
  });

  it("prints no work experience section as empty rather than as the deleted free text", () => {
    expect(html).toContain("No work experience information provided");
    expect(html).not.toContain("Work History (free text)");
  });
});

describe("resume history content", () => {
  function documentFor(candidate: Record<string, unknown>) {
    return new DOMParser().parseFromString(generateResumeHtml(candidate, ""), "text/html");
  }

  it("prints structured schools, jobs, years and additional details", () => {
    const doc = documentFor({ educations: [{ ...emptyEducationEntry(), level: "college",
      school_name: "University", course: "Nursing", start_year: "2010", end_year: "2014", notes: "Honors" }],
      work_experiences: [{ ...emptyWorkExperience(), company: "Hospital", position: "Nurse",
        start_date: "2015-01-01", is_current: true, location: "Singapore", description: "Patient care" }] });
    expect(doc.body.textContent).toContain("University - Nursing - 2010 - 2014 - Honors");
    for (const value of ["Hospital", "Nurse", "2015", "Present", "Singapore", "Patient care"]) {
      expect(doc.body.textContent).toContain(value);
    }
    expect(doc.body.textContent).not.toContain("No work experience information provided");
    expect(doc.body.textContent).not.toContain("No education information provided");
  });

  it("includes legacy schools alongside structured schools without duplicating them", () => {
    const doc = documentFor({ school_elementary: "Primary School", school_college: "University",
      educations: [{ ...emptyEducationEntry(), level: "college", school_name: "University" }] });
    expect(doc.body.textContent).toContain("Primary School");
    expect([...doc.querySelectorAll("td")].filter((cell) => cell.textContent === "University")).toHaveLength(1);
  });

  it("prints older rich-text history safely, preserving line breaks", () => {
    const doc = documentFor({ work_history: '<p>Earlier employer &amp; Co</p><p>2010–2012</p><script>bad()</script>',
      education: '<p>Earlier school</p><img src=x onerror="bad()">' });
    expect(doc.body.textContent).toContain("Earlier employer & Co");
    expect(doc.body.textContent).toContain("2010–2012");
    expect(doc.body.textContent).toContain("Earlier school");
    expect(doc.querySelector("[onerror]")).toBeNull();
    expect(doc.body.textContent).not.toContain("bad()");
    expect(doc.body.textContent).not.toContain("No work experience information provided");
  });

  it("escapes structured history and treats blank draft rows as empty", () => {
    const doc = documentFor({ educations: [{ ...emptyEducationEntry(), level: '<img src=x onerror="bad()">',
      school_name: "<script>school()</script>", end_year: "<b>2020</b>" }],
      work_experiences: [emptyWorkExperience()] });
    expect(doc.querySelector("[onerror]")).toBeNull();
    expect(doc.body.textContent).toContain("<script>school()</script>");
    expect(doc.body.textContent).toContain("<b>2020</b>");
    expect(doc.body.textContent).toContain("No work experience information provided");
    expect(documentFor({ educations: [emptyEducationEntry()] }).body.textContent)
      .toContain("No education information provided");
  });
});

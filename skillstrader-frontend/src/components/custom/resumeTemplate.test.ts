import { describe, expect, it } from "vitest";
import { generateResumeHtml } from "./resumeTemplate";

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

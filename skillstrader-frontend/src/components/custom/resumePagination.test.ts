import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectResumeAtoms,
  labelResumeSheets,
  packResumeSheets,
  resumePaginationScript,
  runResumePrintBootstrap,
} from "./resumePagination";

/*
 * jsdom has no layout engine, so getBoundingClientRect is stubbed: every sheet measures as the sum of
 * the synthetic row heights stamped in the fixture. That is enough to prove the packer's decisions --
 * where a break falls, which rows survive on which page, whether a header repeats -- and it is the
 * same code path the popup runs. It says nothing about Chrome's real line wrapping, which still needs
 * one manual print to confirm.
 */
const PX_PER_MM = 4;
const PAGE_HEIGHT = 297 * PX_PER_MM;
const ROW_HEIGHT = 300;
const HEAD_HEIGHT = 50;
const HEADER_HEIGHT = 200;

function rect(height: number): DOMRect {
  return {
    height,
    width: 0,
    top: 0,
    left: 0,
    bottom: height,
    right: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as unknown as DOMRect;
}

function measureHeight(el: Element): number {
  const node = el as HTMLElement;
  if (node.classList.contains("sheet")) {
    // The probe carries an explicit mm height; a real sheet measures as its content.
    if (node.style.height === "100mm") return 100 * PX_PER_MM;
    let total = 0;
    node.querySelectorAll("[data-h]").forEach((row) => {
      total += Number(row.getAttribute("data-h") || 0);
    });
    return total;
  }
  return 0;
}

const nativeRect = Element.prototype.getBoundingClientRect;

function stubLayout(): void {
  Element.prototype.getBoundingClientRect = function patched() {
    return rect(measureHeight(this));
  };
}

function fixture(rows: number): string {
  const bodies = Array.from({ length: rows }, (_unused, i) =>
    `<tr data-h="${ROW_HEIGHT}"><td>Role ${i + 1}</td></tr>`,
  ).join("");

  return `
    <main class="page" id="resume-flow">
      <header class="header" data-h="${HEADER_HEIGHT}"><span>Photo and name</span></header>
      <section class="section">
        <h2 class="section-title">Work Experience</h2>
        <table>
          <thead data-h="${HEAD_HEIGHT}"><tr><th>Company</th></tr></thead>
          <tbody>${bodies}</tbody>
        </table>
      </section>
      <footer class="footer"><span>SkillsTrader</span></footer>
    </main>
    <div id="resume-book"></div>
    <div id="resume-measure"></div>
  `;
}

function makeSheet(): HTMLElement {
  const sheet = document.createElement("section");
  sheet.className = "sheet";
  sheet.style.height = "auto";
  const footer = document.createElement("footer");
  footer.className = "footer";
  const brand = document.createElement("span");
  brand.textContent = "SkillsTrader";
  const number = document.createElement("span");
  number.className = "page-number";
  footer.appendChild(brand);
  footer.appendChild(number);
  sheet.appendChild(footer);
  return sheet;
}

function measureSheet(sheet: HTMLElement): number {
  const rig = document.getElementById("resume-measure") as HTMLElement;
  rig.appendChild(sheet);
  const height = measureHeight(sheet);
  rig.removeChild(sheet);
  return height;
}

afterEach(() => {
  Element.prototype.getBoundingClientRect = nativeRect;
  vi.useRealTimers();
  document.body.innerHTML = "";
  delete (window as { print?: unknown }).print;
  delete (window as { __resumePrinted?: unknown }).__resumePrinted;
});

describe("collectResumeAtoms", () => {
  it("splits a table at its rows and skips the flow footer", () => {
    document.body.innerHTML = fixture(9);
    const atoms = collectResumeAtoms(document.getElementById("resume-flow") as HTMLElement);

    // header (1 unsplittable block) + 9 rows; the footer is chrome, not content.
    expect(atoms).toHaveLength(10);
    expect(atoms[0].host).toBeNull();
    expect(atoms[1].host?.tagName).toBe("TBODY");
    expect(atoms.map((atom) => atom.groupKey)).toEqual([0, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("treats a block with a single line as unsplittable rather than inventing a break", () => {
    document.body.innerHTML = `<main id="resume-flow"><div class="paragraph-block">
      <div class="para-line" data-h="${ROW_HEIGHT}">Only one line</div></div></main>`;
    const atoms = collectResumeAtoms(document.getElementById("resume-flow") as HTMLElement);

    expect(atoms).toHaveLength(1);
    expect(atoms[0].host).toBeNull();
  });
});

describe("packResumeSheets", () => {
  function pack(rows: number) {
    document.body.innerHTML = fixture(rows);
    const atoms = collectResumeAtoms(document.getElementById("resume-flow") as HTMLElement);
    return packResumeSheets(atoms, {
      pageHeight: PAGE_HEIGHT,
      measure: measureSheet,
      createSheet: makeSheet,
    });
  }

  it("never emits a row twice when a section skeleton is reused", () => {
    const sheets = pack(9);
    const cells = sheets
      .flatMap((sheet) => Array.from(sheet.querySelectorAll("tbody > tr")))
      .map((row) => row.textContent?.trim());

    // The clone of a section arrives with the original rows still inside it; if the packer forgot to
    // empty it, page 1 would print all 9 rows and pages 2-3 would print them again.
    expect(cells).toHaveLength(9);
    expect(new Set(cells).size).toBe(9);
  });

  it("carries every row onto some sheet and keeps the source order", () => {
    const sheets = pack(9);
    const order = sheets
      .flatMap((sheet) => Array.from(sheet.querySelectorAll("tbody > tr")))
      .map((row) => Number(/Role (\d+)/.exec(row.textContent || "")?.[1]));

    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("repeats the table header and marks the section as continued past the first page", () => {
    const sheets = pack(9);

    expect(sheets.length).toBeGreaterThan(1);
    expect(sheets[0].querySelector(".section-title")?.textContent).toBe("Work Experience");
    expect(sheets[1].querySelector(".section-title")?.textContent).toBe(
      "Work Experience (continued)",
    );
    sheets.forEach((sheet) => {
      expect(sheet.querySelector("thead")).not.toBeNull();
    });
    expect(sheets[0].querySelector(".header")).not.toBeNull();
    expect(sheets[1].querySelector(".header")).toBeNull();
  });

  it("gives an over-tall unsplittable block its own sheet instead of pushing the rest down", () => {
    document.body.innerHTML = `
      <main class="page" id="resume-flow">
        <header class="header" data-h="${PAGE_HEIGHT + 500}"><span>Taller than a page</span></header>
        <section class="section">
          <h2 class="section-title">Work Experience</h2>
          <table><thead data-h="${HEAD_HEIGHT}"></thead><tbody>
            <tr data-h="${ROW_HEIGHT}"><td>Role 1</td></tr>
          </tbody></table>
        </section>
        <footer class="footer"></footer>
      </main>
      <div id="resume-book"></div><div id="resume-measure"></div>`;
    const atoms = collectResumeAtoms(document.getElementById("resume-flow") as HTMLElement);
    const sheets = packResumeSheets(atoms, {
      pageHeight: PAGE_HEIGHT,
      measure: measureSheet,
      createSheet: makeSheet,
    });

    expect(sheets).toHaveLength(2);
    expect(sheets[0].querySelector("tbody > tr")).toBeNull();
    expect(sheets[1].querySelector("tbody > tr")).not.toBeNull();
  });

  it("leaves every sheet within one page height", () => {
    const sheets = pack(20);
    sheets.forEach((sheet) => {
      const rows = sheet.querySelectorAll("tbody > tr").length;
      const hasHeader = sheet.querySelector(".header") !== null;
      const expected = HEAD_HEIGHT * (rows > 0 ? 1 : 0) + rows * ROW_HEIGHT + (hasHeader ? HEADER_HEIGHT : 0);
      expect(expected).toBeLessThanOrEqual(PAGE_HEIGHT);
    });
  });
});

describe("labelResumeSheets", () => {
  it("stamps the brand and the true page count on every sheet", () => {
    const sheets = [makeSheet(), makeSheet(), makeSheet()];
    labelResumeSheets(sheets);

    expect(sheets.map((sheet) => sheet.querySelector(".page-number")?.textContent)).toEqual([
      "Page 1 / 3",
      "Page 2 / 3",
      "Page 3 / 3",
    ]);
    expect(sheets[0].querySelector(".footer > span")?.textContent).toBe("SkillsTrader");
  });
});

describe("the embedded print script", () => {
  const script = resumePaginationScript({ brand: "SkillsTrader", printGraceMs: 1200 });

  it("embeds the real source of every collaborator", () => {
    // Guards against a refactor renaming a function out of the bundle while the popup still expects
    // the body that used to be there.
    expect(script).toContain(collectResumeAtoms.toString());
    expect(script).toContain(packResumeSheets.toString());
    expect(script).toContain(labelResumeSheets.toString());
    expect(script).toContain(runResumePrintBootstrap.toString());
    expect(script).toContain('"SkillsTrader"');
  });

  it("paginates when evaluated with no module scope around it", () => {
    // Running the string is the point: an embedded body that closed over a module constant would
    // throw here, and the popup would fall back to an unpaged document instead of a paginated one.
    document.body.innerHTML = fixture(9);
    stubLayout();
    const print = vi.fn();
    vi.useFakeTimers();
    (window as { print?: unknown }).print = print;

    new Function(script)();

    const book = document.getElementById("resume-book") as HTMLElement;
    const sheets = Array.from(book.querySelectorAll(".sheet"));
    expect(sheets.length).toBeGreaterThan(1);
    expect(sheets.map((s) => s.querySelector(".page-number")?.textContent)).toEqual([
      "Page 1 / 3",
      "Page 2 / 3",
      "Page 3 / 3",
    ]);
    expect(book.querySelectorAll("tbody > tr")).toHaveLength(9);
    expect((document.getElementById("resume-flow") as HTMLElement).style.display).toBe("none");
    expect(print).toHaveBeenCalledTimes(1);

    // The grace timer must not open a second dialog for a document that already printed.
    vi.advanceTimersByTime(3000);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("still prints an unpaged document when layout is unavailable", () => {
    document.body.innerHTML = fixture(9);
    // No stub: every height reads 0, so the pacer must bail rather than emit empty sheets.
    const print = vi.fn();
    vi.useFakeTimers();
    (window as { print?: unknown }).print = print;

    new Function(script)();

    const book = document.getElementById("resume-book") as HTMLElement;
    expect(book.querySelectorAll(".sheet")).toHaveLength(0);
    expect((document.getElementById("resume-flow") as HTMLElement).style.display).toBe("");
    expect(print).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1500);
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("resumePaginationScript wiring", () => {
  it("reaches every collaborator through a positional slot, not a name", () => {
    // Minification renames declarations but cannot rename a name that was only ever reached through
    // an array slot, so positional wiring is the only form that survives the production bundle.
    const body = runResumePrintBootstrap.toString();
    expect(body).toContain("fns[0]");
    expect(body).toContain("fns[1]");
    expect(body).toContain("fns[2]");
  });
});

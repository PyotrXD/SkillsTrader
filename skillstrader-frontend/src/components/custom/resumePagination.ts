/**
 * Page-breaking for the printed candidate resume.
 *
 * Chrome cannot do this job declaratively. `counter(page)` and `counter(pages)` resolve only inside
 * `@page` margin boxes (CSS Paged Media Module Level 3), and Blink does not implement margin boxes,
 * so a CSS-only footer silently ships nothing in the browser this export actually uses. A
 * `position: fixed` footer IS repainted on every printed page, but it is one DOM node and therefore
 * cannot carry a different number per page. So the generator owns pagination: it lays the resume out
 * into fixed A4 sheets and stamps each sheet's own footer.
 *
 * The functions below are serialized with Function.prototype.toString() by resumePaginationScript()
 * and embedded verbatim into the print document, which is written with document.write() into a popup
 * that has no bundle, no module scope and no import map. Two rules follow from that and must hold:
 *
 *   1. Every embedded body is self-contained -- no imports, no shared constants, no helper defined
 *      outside the function.
 *   2. Embedded functions never call each other by name. Minification renames declarations but cannot
 *      rename a name that was only ever reached through an array slot, so collaborators are passed
 *      positionally (fns[0], fns[1], fns[2]) and aliased to locals inside the callee.
 *
 * resumePagination.test.ts enforces both: it evaluates the built script inside jsdom against a stubbed
 * layout, so a closure over module scope or a reordered fns array fails a test instead of blanking a
 * recruiter's PDF.
 */

export type ResumeAtom = {
  /** The splittable unit: a table row, an info row or one paragraph line. */
  node: Element;
  /** The top-level block the unit came from; cloned to rebuild a section on a new sheet. */
  block: HTMLElement;
  /** The element that holds the units, or null when the block has no usable split point. */
  host: Element | null;
  groupKey: number;
};

export type ResumePackOptions = {
  /** Outer height of one A4 sheet, in the same px the measure callback returns. */
  pageHeight: number;
  measure: (sheet: HTMLElement) => number;
  createSheet: () => HTMLElement;
};

/*
 * Attribute names are inlined at every use site rather than hoisted into constants. These bodies are
 * re-hosted inside a document that has no module scope, so a shared constant here becomes a
 * ReferenceError in the popup -- and the only reason it would surface as a blank resume, not a test
 * failure, is that the test evaluates the built script in a scope where the constant is invisible.
 */

/**
 * Flattens the resume into the units a page break may fall between. A block with a table body, an
 * info grid or a paragraph block splits at its children; anything else (the photo header, a lone
 * paragraph line) is one unsplittable unit and stays whole. The flow's own footer is not content.
 */
export function collectResumeAtoms(flow: HTMLElement): ResumeAtom[] {
  const atoms: ResumeAtom[] = [];
  const blocks: HTMLElement[] = [];
  const children = flow.children;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i] as HTMLElement;
    if (child.classList.contains('footer')) continue;
    blocks.push(child);
  }

  blocks.forEach(function (block, index) {
    const host =
      block.querySelector('tbody') ||
      block.querySelector('.info-grid') ||
      block.querySelector('.paragraph-block');
    if (!host || host.children.length < 2) {
      atoms.push({ node: block, block: block, host: null, groupKey: index });
      return;
    }
    host.setAttribute('data-resume-host', '1');
    for (let r = 0; r < host.children.length; r += 1) {
      const row = host.children[r];
      row.setAttribute('data-resume-atom', '1');
      atoms.push({ node: row, block: block, host: host, groupKey: index });
    }
  });

  return atoms;
}

/**
 * Greedy first-fit down a single column of atoms. Each atom is placed, then the whole sheet is
 * measured; if it no longer fits, the atom is taken back and starts the next sheet. Measuring the
 * sheet rather than summing row heights is deliberate: it is the browser's own layout number, so
 * wrapped text, borders and row padding cannot drift the break point.
 */
export function packResumeSheets(
  atoms: ResumeAtom[],
  options: ResumePackOptions,
): HTMLElement[] {
  const pageHeight = options.pageHeight;
  const measure = options.measure;
  const createSheet = options.createSheet;

  const groupsOn = function (sheet: HTMLElement): number[] {
    const keys: number[] = [];
    const live = sheet.querySelectorAll('[data-resume-live]');
    for (let i = 0; i < live.length; i += 1) {
      const raw = live[i].getAttribute('data-resume-live');
      const key = Number(raw);
      if (keys.indexOf(key) === -1) keys.push(key);
    }
    return keys;
  };

  const place = function (sheet: HTMLElement, atom: ResumeAtom, continued: number[]): void {
    const footer = sheet.querySelector('.footer');
    if (!atom.host) {
      const unit = atom.block.cloneNode(true) as HTMLElement;
      unit.setAttribute('data-resume-live', String(atom.groupKey));
      sheet.insertBefore(unit, footer);
      return;
    }

    let skeleton = sheet.querySelector(
      '[data-resume-live="' + atom.groupKey + '"]',
    ) as HTMLElement | null;
    if (!skeleton) {
      skeleton = atom.block.cloneNode(true) as HTMLElement;
      const skeletonHost = skeleton.querySelector('[data-resume-host]');
      // The clone arrives with the original rows still inside it; the packer feeds it one row at a
      // time, so leaving them would double-print every row on the first sheet.
      if (skeletonHost) skeletonHost.textContent = '';
      skeleton.setAttribute('data-resume-live', String(atom.groupKey));
      if (continued.indexOf(atom.groupKey) !== -1) {
        const title = skeleton.querySelector('.section-title');
        if (title && title.textContent && title.textContent.indexOf('(continued)') === -1) {
          title.textContent = title.textContent + ' (continued)';
        }
      }
      sheet.insertBefore(skeleton, footer);
    }

    const target = skeleton.querySelector('[data-resume-host]') || skeleton;
    target.appendChild(atom.node.cloneNode(true));
  };

  const undo = function (sheet: HTMLElement, atom: ResumeAtom): void {
    const skeleton = sheet.querySelector('[data-resume-live="' + atom.groupKey + '"]');
    if (!skeleton) return;
    if (!atom.host) {
      sheet.removeChild(skeleton);
      return;
    }
    const skeletonHost = skeleton.querySelector('[data-resume-host]');
    if (skeletonHost && skeletonHost.lastElementChild) {
      skeletonHost.removeChild(skeletonHost.lastElementChild);
    }
    if (!skeletonHost || skeletonHost.children.length === 0) {
      sheet.removeChild(skeleton);
    }
  };

  const sheets: HTMLElement[] = [];
  const continued: number[] = [];
  let sheet = createSheet();
  let placed = 0;

  const closeSheet = function (): void {
    const keys = groupsOn(sheet);
    for (let k = 0; k < keys.length; k += 1) {
      if (continued.indexOf(keys[k]) === -1) continued.push(keys[k]);
    }
    sheets.push(sheet);
    sheet = createSheet();
    placed = 0;
  };

  for (let i = 0; i < atoms.length; i += 1) {
    const atom = atoms[i];
    place(sheet, atom, continued);
    placed += 1;

    if (measure(sheet) <= pageHeight) continue;

    // No finer split point exists for this atom and it alone exceeds a page. Give it a sheet of its
    // own rather than pushing the rest of the resume along; it may still spill onto a second printed
    // page, which is the one case where the stamped total can read one short.
    if (placed === 1) {
      closeSheet();
      continue;
    }

    undo(sheet, atom);
    placed -= 1;
    closeSheet();
    place(sheet, atom, continued);
  }

  if (placed > 0 || sheets.length === 0) sheets.push(sheet);

  return sheets;
}

/** Writes "Page i / N" into each sheet's footer, once the true page count is known. */
export function labelResumeSheets(sheets: HTMLElement[]): void {
  for (let i = 0; i < sheets.length; i += 1) {
    const slot = sheets[i].querySelector('.page-number');
    if (slot) slot.textContent = 'Page ' + (i + 1) + ' / ' + sheets.length;
  }
}

/**
 * Runs inside the print popup, where the resume stylesheet is live and therefore layout is real.
 * `fns` is positional on purpose: [collectResumeAtoms, packResumeSheets, labelResumeSheets].
 */
export function runResumePrintBootstrap(
  fns: unknown[],
  options: { brand: string; onPrint: () => void },
): void {
  const collect = fns[0] as (flow: HTMLElement) => ResumeAtom[];
  const pack = fns[1] as (atoms: ResumeAtom[], options: ResumePackOptions) => HTMLElement[];
  const label = fns[2] as (sheets: HTMLElement[]) => void;

  const flow = document.getElementById('resume-flow');
  const book = document.getElementById('resume-book');
  const rig = document.getElementById('resume-measure');
  if (!flow || !book || !rig) return;

  // Sheet heights are compared against a real A4 height in the popup's own px, measured rather than
  // assumed: 96px/inch is only true at 100% zoom, and the sheet is sized in millimetres.
  const probe = document.createElement('section');
  probe.className = 'sheet';
  probe.style.height = '100mm';
  rig.appendChild(probe);
  const pxPerMm = probe.getBoundingClientRect().height / 100;
  rig.removeChild(probe);
  if (!pxPerMm) return;

  const atoms = collect(flow);
  if (atoms.length === 0) return;

  const createSheet = function (): HTMLElement {
    const sheet = document.createElement('section');
    sheet.className = 'sheet';
    sheet.style.height = 'auto';
    const footer = document.createElement('footer');
    footer.className = 'footer';
    const brand = document.createElement('span');
    brand.textContent = options.brand;
    const number = document.createElement('span');
    number.className = 'page-number';
    footer.appendChild(brand);
    footer.appendChild(number);
    sheet.appendChild(footer);
    return sheet;
  };

  const measure = function (sheet: HTMLElement): number {
    rig.appendChild(sheet);
    const height = sheet.getBoundingClientRect().height;
    rig.removeChild(sheet);
    return height;
  };

  const sheets = pack(atoms, { pageHeight: 297 * pxPerMm, measure: measure, createSheet: createSheet });
  label(sheets);
  for (let i = 0; i < sheets.length; i += 1) {
    // Release the auto height used for measuring so the stylesheet's fixed sheet height applies.
    sheets[i].style.height = '';
    book.appendChild(sheets[i]);
  }
  flow.style.display = 'none';
  book.style.display = 'block';
  options.onPrint();
}

/**
 * The inline script written into the print document. Kept as a pure string builder so the whole
 * mechanism can be evaluated in a test, and so the embedded source of every collaborator is visible
 * in one place.
 */
export function resumePaginationScript(options: { brand: string; printGraceMs?: number }): string {
  const fns = [collectResumeAtoms, packResumeSheets, labelResumeSheets];
  const grace = options.printGraceMs === undefined ? 1200 : options.printGraceMs;

  return (
    '(function () {' +
    'var fns=[' +
    fns.map(function (fn) {
      return fn.toString();
    }).join(',') +
    '];' +
    'var done=false;' +
    'var printNow=function(){' +
    'if(done){return;}' +
    'done=true;' +
    'window.__resumePrinted=true;' +
    'try{window.print();}catch(e){/* print blocked: the popup stays open for a manual Ctrl+P */}' +
    '};' +
    'try{' +
    '(' + runResumePrintBootstrap.toString() + ')(fns,{brand:' + JSON.stringify(options.brand) + ',onPrint:printNow});' +
    '}catch(e){/* unpaged fallback: the flow document below is already printable */}' +
    'setTimeout(printNow,' + grace + ');' +
    '})();'
  );
}

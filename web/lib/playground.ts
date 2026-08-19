/**
 * Playground pattern definitions.
 *
 * Each APG pattern gets a keyboard walkthrough (neutral instructions, no
 * verdicts) and a set of live readout rows. The rows are pure functions over a
 * Document: they read ARIA attributes and visibility and compare them with what
 * the APG expects. The verdict colouring comes only from what the DOM shows at
 * that moment, never from stored findings, which is what lets one definition
 * serve every library: a library that gets it right shows green.
 *
 * These are companions to the scored checks, not replacements. Browser
 * JavaScript cannot read the real accessibility tree, so exposure is
 * approximated from attributes and visibility. The scored runs stay
 * Playwright-measured with replayable traces. Every playground page says so.
 */

export interface StepChip {
  /** Key to press, empty string for an observation with no keystroke. */
  key: string;
  text: string;
}

export interface RowReading {
  value: string;
  ok: boolean;
}

export interface RowSpec {
  label: string;
  expected: string;
  read: (doc: Document) => RowReading;
}

export interface PatternDef {
  title: string;
  /** One line for the index card: what your keyboard is about to do. */
  blurb: string;
  steps: StepChip[];
  rows: RowSpec[];
}

/* ------------------------------------------------------------------ */
/* shared readers                                                      */
/* ------------------------------------------------------------------ */

function describeActive(doc: Document): string {
  const el = doc.activeElement;
  if (!el || el === doc.body) return "<body> (nothing focused)";
  const text = (el.textContent || (el as HTMLInputElement).placeholder || "").trim().slice(0, 22);
  return `<${el.tagName.toLowerCase()}> "${text}"`;
}

function visible(el: Element | null): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.offsetParent !== null || getComputedStyle(h).position === "fixed";
}

/** Approximates "exposed to assistive technology": rendered and not aria-hidden. */
function exposed(el: Element | null): boolean {
  if (!el || !visible(el)) return false;
  let n: Element | null = el;
  while (n) {
    if (n.getAttribute?.("aria-hidden") === "true" || (n as HTMLElement).inert) return false;
    n = n.parentElement;
  }
  return true;
}

function attr(doc: Document, selector: string, name: string): string | null {
  return doc.querySelector(selector)?.getAttribute(name) ?? null;
}

const absent = (v: string | null): RowReading => ({ value: v ?? "absent", ok: v !== null });

/* ------------------------------------------------------------------ */
/* patterns                                                            */
/* ------------------------------------------------------------------ */

const menu: PatternDef = {
  title: "Menu button",
  blurb: "Open with Enter or Down Arrow, walk the items, watch aria-expanded flip in the readout.",
  steps: [
    { key: "Tab", text: "reach the trigger" },
    { key: "↓", text: "should open with the first item active" },
    { key: "Enter", text: "should open with the first item active" },
    { key: "↓ / ↑", text: "should move between items" },
    { key: "Esc", text: "should close and return focus to the trigger" },
  ],
  rows: [
    {
      label: "trigger aria-haspopup",
      expected: '"menu"',
      read: (doc) => {
        const v = attr(doc, '[data-testid="hr-trigger"]', "aria-haspopup");
        return { value: v ?? "absent", ok: v === "menu" || v === "true" };
      },
    },
    {
      label: "trigger aria-expanded",
      expected: '"false", then "true" while open',
      read: (doc) => absent(attr(doc, '[data-testid="hr-trigger"]', "aria-expanded")),
    },
    {
      label: "menu visible",
      expected: "opens on click, Enter, Down Arrow",
      read: (doc) => ({ value: visible(doc.querySelector('[role="menu"]')) ? "yes" : "no", ok: true }),
    },
    {
      label: "active item",
      expected: "DOM focus on an item, or aria-activedescendant",
      read: (doc) => {
        const m = doc.querySelector('[role="menu"]');
        if (!visible(m)) return { value: "menu closed", ok: true };
        const desc = m?.getAttribute("aria-activedescendant");
        const focusIn = !!m && !!doc.activeElement && m.contains(doc.activeElement);
        return { value: desc ? `activedescendant=${desc}` : focusIn ? "DOM focus inside menu" : "none", ok: !!desc || focusIn };
      },
    },
    {
      label: "document.activeElement",
      expected: "a menu item while the menu is open",
      read: (doc) => {
        const m = doc.querySelector('[role="menu"]');
        const focusIn = !!m && !!doc.activeElement && m.contains(doc.activeElement);
        return { value: describeActive(doc), ok: !visible(m) || focusIn };
      },
    },
  ],
};

const accordion: PatternDef = {
  title: "Accordion",
  blurb: "Headers, headings and aria-controls, with Enter and Space both doing their job.",
  steps: [
    { key: "Tab", text: "reach the first header" },
    { key: "Enter", text: "should toggle the section" },
    { key: "Space", text: "should toggle it too" },
    { key: "Tab", text: "should reach the next header" },
  ],
  rows: [
    {
      label: "header inside a heading",
      expected: "each header inside h1-h6 or role=heading",
      read: (doc) => {
        const h = doc.querySelector('[data-testid="hr-header-1"]');
        if (!h) return { value: "no header found", ok: false };
        return { value: h.closest('h1,h2,h3,h4,h5,h6,[role="heading"]') ? "yes" : "no", ok: !!h.closest('h1,h2,h3,h4,h5,h6,[role="heading"]') };
      },
    },
    {
      label: "header aria-controls",
      expected: "references the panel, at least while open",
      read: (doc) => {
        // Some libraries only render the reference while the panel exists:
        // aria-controls pointing at nothing would itself be invalid. Absent
        // while collapsed is a fact, not a failure; the scored check expands
        // the section before asserting, and so should the reader.
        const controls = attr(doc, '[data-testid="hr-header-1"]', "aria-controls");
        const expanded = attr(doc, '[data-testid="hr-header-1"]', "aria-expanded");
        if (controls) return { value: controls, ok: true };
        if (expanded !== "true") return { value: "absent while collapsed, open it", ok: true };
        return { value: "absent while open", ok: false };
      },
    },
    {
      label: "first header aria-expanded",
      expected: 'toggles between "false" and "true"',
      read: (doc) => absent(attr(doc, '[data-testid="hr-header-1"]', "aria-expanded")),
    },
    {
      label: "document.activeElement",
      expected: "the focused header while testing keys",
      read: (doc) => ({ value: describeActive(doc), ok: true }),
    },
  ],
};

const dialog: PatternDef = {
  title: "Dialog (modal)",
  blurb: "Tab cycles inside, Escape hands focus back, and the background disappears from AT.",
  steps: [
    { key: "Tab", text: "reach the trigger" },
    { key: "Enter", text: "should open with focus inside" },
    { key: "Tab", text: "repeatedly: should cycle inside the dialog only" },
    { key: "Esc", text: "should close and return focus to the trigger" },
  ],
  rows: [
    {
      label: "dialog open",
      expected: "open it to observe the rows below",
      read: (doc) => ({ value: visible(doc.querySelector('[role="dialog"]')) ? "yes" : "no", ok: true }),
    },
    {
      label: "document.activeElement",
      expected: "never <body> while the dialog is open",
      read: (doc) => {
        const open = visible(doc.querySelector('[role="dialog"]'));
        const v = describeActive(doc);
        return { value: v, ok: !open || v.indexOf("<body>") === -1 };
      },
    },
    {
      label: "background hidden from AT",
      expected: "aria-hidden or inert while the dialog is open",
      read: (doc) => {
        const open = visible(doc.querySelector('[role="dialog"]'));
        const outside = doc.querySelector('[data-testid="hr-outside-content"]');
        if (!open) return { value: "dialog closed", ok: true };
        if (!outside) return { value: "no outside probe", ok: true };
        return { value: exposed(outside) ? "no" : "yes", ok: !exposed(outside) };
      },
    },
  ],
};

const tabs: PatternDef = {
  title: "Tabs",
  blurb: "One tab stop for the list, arrows between tabs, each panel labelled by its tab.",
  steps: [
    { key: "Tab", text: "reach the selected tab in one stop" },
    { key: "→ / ←", text: "should move between tabs" },
    { key: "Tab", text: "should leave the tablist for the panel" },
  ],
  rows: [
    {
      label: "tablist role",
      expected: "one element with role=tablist",
      read: (doc) => ({ value: doc.querySelector('[role="tablist"]') ? "present" : "absent", ok: !!doc.querySelector('[role="tablist"]') }),
    },
    {
      label: "selected tab",
      expected: 'exactly one tab with aria-selected="true"',
      read: (doc) => {
        const sel = doc.querySelectorAll('[role="tab"][aria-selected="true"]');
        return { value: String(sel.length), ok: sel.length === 1 };
      },
    },
    {
      label: "panel labelled by its tab",
      expected: "visible tabpanel has aria-labelledby",
      read: (doc) => {
        const panels = Array.from(doc.querySelectorAll('[role="tabpanel"]')).filter(visible);
        if (panels.length === 0) return { value: "no visible panel", ok: false };
        return { value: panels[0].getAttribute("aria-labelledby") ? "yes" : "no", ok: !!panels[0].getAttribute("aria-labelledby") };
      },
    },
    {
      label: "document.activeElement",
      expected: "the selected tab while arrowing",
      read: (doc) => ({ value: describeActive(doc), ok: true }),
    },
  ],
};

const combobox: PatternDef = {
  title: "Combobox",
  blurb: "Down Arrow opens the list without typing, and every option is exposed or counted.",
  steps: [
    { key: "Tab", text: "reach the input" },
    { key: "↓", text: "should open the list, no typing needed" },
    { key: "↓ / ↑", text: "should move through the options" },
    { key: "Esc", text: "should close the list" },
  ],
  rows: [
    {
      label: "combobox aria-expanded",
      expected: '"true" while the list is open',
      read: (doc) => absent(attr(doc, '[role="combobox"]', "aria-expanded")),
    },
    {
      label: "exposed options",
      expected: "every option, or aria-setsize describing the set",
      read: (doc) => {
        const opts = Array.from(doc.querySelectorAll('[role="option"]')).filter(exposed);
        return { value: String(opts.length), ok: opts.length > 0 };
      },
    },
    {
      label: "first option aria-setsize",
      expected: "the full count, if only a window is rendered",
      read: (doc) => {
        const opts = Array.from(doc.querySelectorAll('[role="option"]')).filter(exposed);
        if (opts.length === 0) return { value: "list closed", ok: true };
        return { value: opts[0].getAttribute("aria-setsize") ?? "absent", ok: true };
      },
    },
    {
      label: "active option",
      expected: "aria-activedescendant or DOM focus on an option",
      read: (doc) => {
        const combo = doc.querySelector('[role="combobox"]');
        const desc = combo?.getAttribute("aria-activedescendant");
        return { value: desc ? `activedescendant=${desc}` : "none", ok: true };
      },
    },
  ],
};

export const PATTERNS: Record<string, PatternDef> = { menu, accordion, dialog, tabs, combobox };

/**
 * Adapters whose static mount bundle is wired into the site build. An adapter
 * earns its entry by adding a build:playground script and being added to
 * scripts/build-mounts.mjs; listing it here without the bundle would ship
 * pages with empty iframes.
 */
export const MOUNT_READY = new Set(["radix"]);

/**
 * Which playground pages exist. Pure so it can be tested directly: only
 * released targets, only mount-ready targets, only components with a
 * publishable, applicable run. The disclosure gate reaches the playground
 * through this function and nothing else.
 */
export function playgroundParams(site: {
  released: Array<{ id: string }>;
  results: Map<string, Map<string, { assertions: Array<{ status: string }> }>>;
}): Array<{ target: string; component: string }> {
  const params: Array<{ target: string; component: string }> = [];
  for (const t of site.released) {
    if (!MOUNT_READY.has(t.id)) continue;
    const runs = site.results.get(t.id);
    if (!runs) continue;
    for (const [component, run] of runs) {
      if (!(component in PATTERNS)) continue;
      if (run.assertions.every((a) => a.status === "not-applicable")) continue;
      params.push({ target: t.id, component });
    }
  }
  return params;
}

/** The sentence every playground surface carries. Not optional, not removable. */
export const PLAYGROUND_DISCLAIMER =
  "Self-run companion check, approximated in-browser from ARIA attributes and visibility. " +
  "Official scores are measured by the runner with replayable Playwright traces.";

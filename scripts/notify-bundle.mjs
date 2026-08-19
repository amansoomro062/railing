#!/usr/bin/env node
/**
 * Builds the private report each maintainer receives before anything is published.
 *
 * Decision 004 gives them fourteen days, their full results, and the adapter
 * source so they can tell us we measured them wrongly. That last part is the
 * point: the report is written to be argued with, not admired. It leads with
 * how to disagree, and it includes the code we ran so disagreeing is cheap.
 *
 *   node scripts/notify-bundle.mjs            all libraries
 *   node scripts/notify-bundle.mjs mui        one library
 *
 * Output lands in notifications/, which is untracked. These are findings that
 * nobody has seen yet.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const resultsDir = join(root, "results");
const outRoot = join(root, "notifications");
const htmlRoot = join(outRoot, "html");
// The report is the first thing a maintainer sees. It should not look like a
// lesser artefact than the page their score eventually appears on, so it uses
// the site's own stylesheet rather than a copy that will drift from it.
const CSS = readFileSync(join(root, "web", "app", "globals.css"), "utf8")
  // The font is served from the site; a report read off disk has no such path.
  .replace(/@font-face \{[\s\S]*?\n\}\n/, "");

const SITE = "https://railing.dev";
const REPO = "https://github.com/amansoomro062/railing";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * The HTML report, rendered from the same data as the Markdown one.
 *
 * Not a Markdown conversion: a maintainer opening this should get a document
 * that reads like the index their score will appear on, with the findings
 * legible at a glance and the adapter source folded away until wanted.
 */
function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="robots" content="noindex, nofollow">
<style>
/* Inter travels with the report, so it reads the same off disk as on the site. */
@font-face {
  font-family: "InterVar";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("./inter-latin-var.woff2") format("woff2");
}
${CSS}
body { padding: 0; }
.rep { max-width: 900px; margin: 0 auto; padding: 40px var(--gutter) 90px; }
.rep h1 { font-size: clamp(30px, 4.4vw, 52px); }
/* Both sides restored: the global reset zeroes heading margins, and a heading
   with no bottom margin reads as glued to its first line. */
.rep h2 { margin: 3rem 0 0.9rem; font-size: clamp(22px, 2.4vw, 32px); }
.rep > p { max-width: 68ch; color: var(--ink-2); margin-bottom: 1rem; }
.rep .lede { color: var(--ink-2); font-size: 19px; max-width: 60ch; margin: 16px 0 28px; }
.rep ul.clean { list-style: none; padding: 0; margin: 0 0 1rem; display: grid; gap: 10px; }
.rep ul.clean li { max-width: 74ch; color: var(--ink-2); padding-left: 18px; position: relative; }
.rep ul.clean li::before {
  content: ""; position: absolute; left: 0; top: 10px; width: 7px; height: 7px;
  border-radius: 2px; background: linear-gradient(135deg, var(--amber), var(--rust));
}
.rep ul.clean li strong { color: var(--ink); }

/* A finding, as a card on the page ground. */
.finding {
  border: 1px solid var(--line); border-left: 5px solid var(--fail);
  background: var(--surface); border-radius: 20px; padding: 22px 24px; margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(18,28,34,0.04);
}
.finding h3, .finding h4 { font-size: 18px; margin: 0 0 14px; line-height: 1.3; }
.finding dl { display: grid; grid-template-columns: 9rem 1fr; gap: 9px 16px; margin: 0; font-size: 15px; }
.finding dt {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3); padding-top: 4px;
}
.finding dd { margin: 0; color: var(--ink-2); }
@media (max-width: 620px) { .finding dl { grid-template-columns: 1fr; gap: 2px; } .finding dt { padding-top: 10px; } }

/* A group of findings sharing one cause. */
.cause { margin: 2.2rem 0 2.6rem; padding: 0 0 0 1.2rem; border-left: 2px solid var(--line); }
.cause h3 { margin: 0 0 0.2rem; font-size: 20px; }
.cause__count {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3); margin: 0 0 0.7rem;
}
.cause > p { margin-bottom: 1.1rem; color: var(--ink-2); max-width: 70ch; }

/* The panels: same material as the site. */
.banner {
  border-radius: 26px; padding: 26px 28px; margin: 1.6rem 0; color: #fff;
}
.banner p { color: rgba(255,255,255,0.82); max-width: 68ch; }
.banner p:last-child { margin-bottom: 0; }
.banner .note__t { color: rgba(255,255,255,0.78); }
.banner--paper {
  background: var(--surface); border: 1px solid var(--line); border-left: 5px solid var(--amber);
  color: var(--ink); border-radius: 20px;
}
.banner--paper p { color: var(--ink-2); }
.banner--paper .note__t { color: var(--ink-3); }

details {
  border: 1px solid var(--line); border-radius: 16px; margin-bottom: 8px; background: var(--surface);
}
summary { cursor: pointer; padding: 12px 16px; font-family: var(--mono); font-size: 13px; }
details pre { margin: 0; border-radius: 0 0 15px 15px; }
</style>
</head>
<body>
<main class="rep">
${body}
</main>
</body>
</html>`;
}

const PORTS = {
  radix: 5180,
  "react-spectrum": 5181,
  mui: 5182,
  headlessui: 5183,
  chakra: 5184,
  antd: 5185,
  shadcn: 5186,
};

const SEVERITY_MEANING = {
  blocker: "the task cannot be completed by that input method at all",
  serious: "the task is completable but confusing, or state is not communicated",
  moderate: "behaviour departs from the specified pattern; users are inconvenienced",
  minor: "technically non-conforming, low practical impact",
};

if (!existsSync(resultsDir)) {
  console.error("  No results/ directory. Run the specs first.");
  process.exit(1);
}

// The report narratives (adapterCorrections, causes) describe findings, so
// they live in results/notify-notes.json, untracked with the results
// themselves, rather than in the public targets.json. A registry entry says a
// library exists and where its clock stands; it must never say what we found.
const notesPath = join(resultsDir, "notify-notes.json");
const privateNotes = existsSync(notesPath) ? JSON.parse(readFileSync(notesPath, "utf8")) : {};
const targets = JSON.parse(readFileSync(join(root, "targets.json"), "utf8")).targets.map((t) => ({
  ...t,
  ...(privateNotes[t.id] ?? {}),
}));
const only = process.argv[2];

const byTarget = new Map();
for (const file of readdirSync(resultsDir).filter((f) => f.endsWith(".json"))) {
  if (file === "notify-notes.json") continue; // the narrative overlay, not a run
  const r = JSON.parse(readFileSync(join(resultsDir, file), "utf8"));
  if (r.target.id === "_fixture-broken") continue;
  if (!byTarget.has(r.target.id)) byTarget.set(r.target.id, []);
  byTarget.get(r.target.id).push(r);
}

const score = (r) => {
  const w = { blocker: 10, serious: 5, moderate: 2, minor: 1 };
  let got = 0;
  let total = 0;
  for (const a of r.assertions) {
    if (a.status !== "pass" && a.status !== "fail") continue;
    total += w[a.severity];
    if (a.status === "pass") got += w[a.severity];
  }
  return total === 0 ? null : (got / total) * 100;
};
const show = (v) => (v === null ? "n/a" : `${v === 100 ? 100 : Math.floor(v)}%`);

function adapterSource(targetId) {
  const dir = join(root, "adapters", targetId, "src", "harnesses");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => ({ name: f, code: readFileSync(join(dir, f), "utf8") }));
}

/**
 * Splits findings into the causes declared for the target, plus whatever is
 * left over.
 *
 * The groupings are authored in targets.json rather than inferred. Causation is
 * a claim about someone else's code, and guessing at it would put a second kind
 * of false accusation into a report that already asks to be trusted. A stale
 * grouping is reported here rather than quietly dropped, because a cause that
 * no longer matches the results means the report and the run disagree.
 */
const warned = new Set(); // Three renderers group the same findings; warn once.

function groupByCause(target, failing) {
  const byId = new Map(failing.map((a) => [a.id, a]));
  const claimed = new Set();
  const groups = [];

  for (const cause of target.causes ?? []) {
    const present = cause.assertions.filter((id) => byId.has(id));
    for (const id of cause.assertions.filter((x) => !byId.has(x))) {
      const key = `${target.id}:${id}`;
      if (warned.has(key)) continue;
      warned.add(key);
      console.warn(`  ${target.id}: cause "${cause.summary}" lists ${id}, which is not failing`);
    }
    // One finding is not a group. Leave it in the list rather than give it a
    // heading that says the same thing twice.
    if (present.length < 2) continue;
    for (const id of present) claimed.add(id);
    groups.push({ cause, findings: present.map((id) => byId.get(id)) });
  }

  const loose = failing.filter((a) => !claimed.has(a.id));

  // A grouping bug that dropped a finding would quietly withhold a defect from
  // the one person who can fix it. Cheaper to stop than to send.
  const kept = groups.reduce((n, g) => n + g.findings.length, 0) + loose.length;
  if (kept !== failing.length) {
    throw new Error(
      `${target.id}: grouping produced ${kept} findings from ${failing.length}. Refusing to write a report that omits one.`,
    );
  }

  return { groups, loose };
}

/**
 * "12 findings. 5 of them come from 2 underlying causes, grouped below."
 *
 * Says what the grouping actually achieves rather than quoting a total cause
 * count. Twelve findings across nine causes is technically fewer causes than
 * findings and tells a maintainer almost nothing; which five collapse into
 * which two is the useful part.
 */
function causeSummary(groups, loose) {
  if (groups.length === 0) return null;
  const inGroups = groups.reduce((n, g) => n + g.findings.length, 0);
  const total = inGroups + loose.length;
  const n = groups.length;
  return (
    `${total} findings. ${inGroups} of them come from ${n} underlying ` +
    `${n === 1 ? "cause" : "causes"}, grouped below.`
  );
}

function report(target, results) {
  const failing = results.flatMap((r) =>
    r.assertions.filter((a) => a.status === "fail").map((a) => ({ ...a, component: r.component })),
  );
  const versions = [...new Set(results.flatMap((r) => Object.entries(r.target.versions).map(([n, v]) => `${n}@${v}`)))];
  const env = results[0]?.environment;
  const port = PORTS[target.id] ?? 5180;

  const out = [];
  out.push(`# Accessibility conformance results for ${target.name}`);
  out.push("");
  out.push(
    "You are hearing this before we publish anything. No score for " +
      `${target.name} is on our index, and none will be for at least fourteen days, ` +
      "whatever this report says.",
  );
  out.push("");
  out.push(
    "Railing runs component libraries against the W3C ARIA Authoring Practices Guide and " +
      "publishes the results. Every check cites the clause it measures, every score names an " +
      "exact version, and every result is run repeatedly and discarded if the answer changes.",
  );
  out.push("");
  out.push("## The short version");
  out.push("");
  out.push("| Component | Score | Failing checks |");
  out.push("| --- | --- | --- |");
  for (const r of [...results].sort((a, b) => a.component.localeCompare(b.component))) {
    const f = r.assertions.filter((a) => a.status === "fail").length;
    out.push(`| ${r.component} | ${show(score(r))} | ${f === 0 ? "none" : f} |`);
  }
  out.push("");

  const notes = results[0]?.target?.notes;
  if (failing.length > 0 && notes) {
    out.push("## Read this before the findings");
    out.push("");
    out.push(`We mounted your components like this: ${notes}`);
    out.push("");
    out.push(
      "If that choice is the disagreement rather than the findings themselves, say so and we " +
        "will publish your reasoning beside the score. It is a judgement call, not a measurement, " +
        "and you are better placed to argue it than we are.",
    );
    out.push("");
  }

  if (failing.length === 0) {
    out.push(
      `We found nothing to report. ${target.name} passes every check we run. ` +
        "We are telling you anyway, because you should hear about a public score from us rather " +
        "than find it, and because you may still think we measured something wrongly.",
    );
    out.push("");
  } else {
    const { groups, loose } = groupByCause(target, failing);
    const grouped = groups.length > 0;

    out.push(`## The ${failing.length} finding${failing.length === 1 ? "" : "s"}`);
    out.push("");
    const summary = causeSummary(groups, loose);
    if (summary) {
      out.push(summary);
      out.push("");
    }

    // One heading level deeper once causes are carrying a heading of their own.
    const h = grouped ? "####" : "###";
    const finding = (a) => {
      out.push(`${h} ${a.detail ?? a.title}`);
      out.push("");
      out.push(`- **Check:** \`${a.id}\`, "${a.title}"`);
      out.push(`- **Component:** ${a.component}`);
      out.push(`- **Severity:** ${a.severity}, meaning ${SEVERITY_MEANING[a.severity] ?? ""}`);
      if (a.rationale) out.push(`- **Why it matters:** ${a.rationale}`);
      out.push(`- **Expected:** ${a.expected ?? "n/a"}`);
      out.push(`- **We measured:** ${a.actual ?? "n/a"}`);
      const refs = [];
      if (a.refs?.apg) refs.push(`[APG pattern](${a.refs.apg})`);
      if (a.refs?.wcag) refs.push(a.refs.wcagUrl ? `[WCAG ${a.refs.wcag}](${a.refs.wcagUrl})` : `WCAG ${a.refs.wcag}`);
      if (refs.length) out.push(`- **Measured against:** ${refs.join(" · ")}`);
      out.push(`- **Reproduce:** \`pnpm railing run --target ${target.id} --component ${a.component} --only ${a.id} --base-url http://localhost:${port}\``);
      out.push("");
    };

    for (const g of groups) {
      out.push(`### ${g.cause.summary}`);
      out.push("");
      out.push(`_${g.findings.length} findings, one cause._ ${g.cause.detail}`);
      out.push("");
      for (const a of g.findings) finding(a);
    }
    if (loose.length > 0) {
      if (grouped) {
        out.push(`### ${loose.length === 1 ? "One finding on its own" : "The rest, each on its own"}`);
        out.push("");
        out.push("Not related to the above, or to each other.");
        out.push("");
      }
      for (const a of loose) finding(a);
    }
  }

  out.push("## How we tested it");
  out.push("");
  out.push(`- **Versions:** ${versions.join(", ") || "not recorded"}`);
  if (env) out.push(`- **Browser:** ${env.browser} ${env.browserVersion}`);
  out.push(
    "- **Configuration:** default. We use only what the library exports and never hand-write ARIA, " +
      "even where the documentation instructs the developer to. If we did, the score would measure " +
      "how carefully we copied your docs rather than what ships in the box.",
  );
  if (results.every((r) => r.trace)) {
    out.push(
      "- **Traces:** every run above has a replayable Playwright trace, captured from exactly the " +
        "run that was scored. Ask and we will send them, or regenerate them with the command below.",
    );
  }
  out.push("");
  out.push("Reproduce any of it from a clone of the repository:");
  out.push("");
  out.push("```bash");
  out.push(`pnpm --filter @railing-dev/adapter-${target.id} run dev`);
  out.push(`pnpm railing run --target ${target.id} --component <component> \\`);
  out.push(`  --base-url http://localhost:${port} --repeat 3`);
  out.push("```");
  out.push("");

  out.push("## Where we might be wrong");
  out.push("");
  out.push("The most likely cause of a wrong result is our adapter, not your library.");
  out.push("");
  if (target.adapterCorrections) {
    out.push(`It has already happened to you. ${target.adapterCorrections}`);
  } else {
    out.push(
      "We have got this wrong repeatedly. One library's first run scored 27% and almost all of it " +
        "was a selector of ours. Another was reported as having a broken focus trap when the trap " +
        "worked and our test was reading focus too early.",
    );
  }
  out.push("");
  out.push("So the adapter source is included below. Please tell us if we mounted your component in a way you would not recommend, or if a check misreads the specification. We will correct it and, if it has already been published, correct that too.");
  out.push("");

  out.push("## Where to check us");
  out.push("");
  out.push(`- [How the measurement works](${SITE}/method), including why the runner never learns which library it is testing.`);
  out.push(`- [How scoring works](${SITE}/scoring), with every weighting and what is deliberately left out.`);
  out.push(`- [Our disclosure policy](${SITE}/disclosure), covering notice, right of reply, and conflicts of interest.`);
  out.push(`- [The decision log](${SITE}/decisions), which is largely a record of results we got wrong and corrected.`);
  out.push(`- [The source](${REPO}). Every adapter, spec and score, and the code that produced this report.`);
  out.push("");
  out.push("## What happens next");
  out.push("");
  out.push("- You have **fourteen days** before anything about this library is published.");
  out.push("- If you reply, your response is published beside the score, in full and unedited.");
  out.push("- **If you ship a fix in that window, we publish the fixed score.** A finding that gets fixed before publication is the best outcome this project has, not a story we lost.");
  out.push("- If fourteen days is not enough for your release process, ask for more and you will get it.");
  out.push("");

  const sources = adapterSource(target.id);
  if (sources.length) {
    out.push("## The adapter we used");
    out.push("");
    out.push("This is the whole of the library-specific code. There is nothing else.");
    out.push("");
    for (const s of sources) {
      out.push(`<details><summary><code>${s.name}</code></summary>`);
      out.push("");
      out.push("```tsx");
      out.push(s.code.trimEnd());
      out.push("```");
      out.push("");
      out.push("</details>");
      out.push("");
    }
  }
  return out.join("\n");
}

function concentration(results) {
  const counts = results
    .map((r) => ({ component: r.component, n: r.assertions.filter((a) => a.status === "fail").length }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n);
  if (counts.length === 0) return "";
  const total = counts.reduce((s, c) => s + c.n, 0);
  // "1 issue, all in accordion" reads oddly. There is nothing to gather.
  if (counts.length === 1) return total === 1 ? `, in ${counts[0].component}` : `, all in ${counts[0].component}`;
  if (counts[0].n / total >= 0.5) return `, ${counts[0].n} of them in ${counts[0].component}`;
  return `, across ${counts.length} components`;
}

function reportHtml(target, results) {
  const failing = results.flatMap((r) =>
    r.assertions.filter((a) => a.status === "fail").map((a) => ({ ...a, component: r.component })),
  );
  const versions = [...new Set(results.flatMap((r) => Object.entries(r.target.versions).map(([n, v]) => `${n}@${v}`)))];
  const env = results[0]?.environment;
  const notes = results[0]?.target?.notes;
  const port = PORTS[target.id] ?? 5180;
  const o = [];

  o.push(`<p class="eyebrow eyebrow--ink">Private, unpublished</p>`);
  o.push(`<h1>Accessibility conformance results for ${esc(target.name)}</h1>`);
  o.push(`<p class="lede">You are hearing this before we publish anything. No score for ${esc(target.name)} is on our index, and none will be for at least fourteen days, whatever this report says.</p>`);
  o.push(`<p>Railing runs component libraries against the W3C ARIA Authoring Practices Guide and publishes the results. Every check cites the clause it measures, every score names an exact version, and every result is run repeatedly and discarded if the answer changes.</p>`);

  o.push("<h2>The short version</h2>");
  o.push('<div class="tablewrap"><table><caption class="visually-hidden">One row per component.</caption><thead><tr><th scope="col">Component</th><th scope="col">Score</th><th scope="col">Failing checks</th></tr></thead><tbody>');
  for (const r of [...results].sort((a, b) => a.component.localeCompare(b.component))) {
    const f = r.assertions.filter((a) => a.status === "fail").length;
    const chip = f === 0
      ? '<span class="chip chip--pass"><span class="chip__dot"></span>none</span>'
      : `<span class="chip chip--fail"><span class="chip__dot"></span>${f}</span>`;
    o.push(`<tr><th scope="row">${esc(r.component)}</th><td>${show(score(r))}</td><td>${chip}</td></tr>`);
  }
  o.push("</tbody></table></div>");

  if (failing.length > 0 && notes) {
    o.push('<div class="banner banner--paper"><p class="note__t">Read this before the findings</p>');
    o.push(`<p>We mounted your components like this: ${esc(notes)}</p>`);
    o.push("<p>If that choice is the disagreement rather than the findings themselves, say so and we will publish your reasoning beside the score. It is a judgement call, not a measurement, and you are better placed to argue it than we are.</p></div>");
  }

  if (failing.length === 0) {
    o.push(`<div class="banner field"><p>We found nothing to report. ${esc(target.name)} passes every check we run. We are telling you anyway, because you should hear about a public score from us rather than find it, and because you may still think we measured something wrongly.</p></div>`);
  } else {
    const { groups, loose } = groupByCause(target, failing);
    const grouped = groups.length > 0;

    o.push(`<h2>The ${failing.length} finding${failing.length === 1 ? "" : "s"}</h2>`);
    const summary = causeSummary(groups, loose);
    if (summary) o.push(`<p class="lede">${esc(summary)}</p>`);

    // One heading level deeper once causes are carrying a heading of their own,
    // so the document never skips a level.
    const hn = grouped ? 4 : 3;
    const finding = (a) => {
      const refs = [];
      if (a.refs?.apg) refs.push(`<a href="${esc(a.refs.apg)}">APG pattern</a>`);
      if (a.refs?.wcag) refs.push(a.refs.wcagUrl ? `<a href="${esc(a.refs.wcagUrl)}">WCAG ${esc(a.refs.wcag)}</a>` : `WCAG ${esc(a.refs.wcag)}`);
      o.push('<div class="finding">');
      o.push(`<h${hn}>${esc(a.detail ?? a.title)}</h${hn}><dl>`);
      // The code chip carries its own padding, so a comma after it reads as a
      // stray space. Break the line rather than punctuate across it.
      o.push(`<dt>Check</dt><dd><code>${esc(a.id)}</code><br>"${esc(a.title)}"</dd>`);
      o.push(`<dt>Component</dt><dd>${esc(a.component)}</dd>`);
      o.push(`<dt>Severity</dt><dd>${esc(a.severity)}, meaning ${esc(SEVERITY_MEANING[a.severity] ?? "")}</dd>`);
      if (a.rationale) o.push(`<dt>Why it matters</dt><dd>${esc(a.rationale)}</dd>`);
      o.push(`<dt>Expected</dt><dd>${esc(a.expected ?? "n/a")}</dd>`);
      o.push(`<dt>We measured</dt><dd>${esc(a.actual ?? "n/a")}</dd>`);
      if (refs.length) o.push(`<dt>Measured against</dt><dd>${refs.join(" &middot; ")}</dd>`);
      o.push(`<dt>Reproduce</dt><dd><code>pnpm railing run --target ${esc(target.id)} --component ${esc(a.component)} --only ${esc(a.id)} --base-url http://localhost:${port}</code></dd>`);
      o.push("</dl></div>");
    };

    for (const g of groups) {
      o.push('<section class="cause">');
      o.push(`<h3>${esc(g.cause.summary)}</h3>`);
      o.push(`<p class="cause__count">${g.findings.length} findings, one cause</p>`);
      o.push(`<p>${esc(g.cause.detail)}</p>`);
      for (const a of g.findings) finding(a);
      o.push("</section>");
    }
    if (loose.length > 0) {
      if (grouped) {
        o.push('<section class="cause">');
        o.push(`<h3>${loose.length === 1 ? "One finding on its own" : "The rest, each on its own"}</h3>`);
        o.push("<p>Not related to the above, or to each other.</p>");
      }
      for (const a of loose) finding(a);
      if (grouped) o.push("</section>");
    }
  }

  o.push("<h2>How we tested it</h2><ul class=\"clean\">");
  o.push(`<li><strong>Versions:</strong> ${esc(versions.join(", ") || "not recorded")}</li>`);
  if (env) o.push(`<li><strong>Browser:</strong> ${esc(env.browser)} ${esc(env.browserVersion)}</li>`);
  o.push("<li><strong>Configuration:</strong> default. We use only what the library exports and never hand-write ARIA, even where the documentation instructs the developer to. If we did, the score would measure how carefully we copied your docs rather than what ships in the box.</li>");
  if (results.every((r) => r.trace)) {
    o.push("<li><strong>Traces:</strong> every run above has a replayable Playwright trace, captured from exactly the run that was scored. Ask and we will send them, or regenerate them with the command below.</li>");
  }
  o.push("</ul>");
  o.push("<p>Reproduce any of it from a clone of the repository:</p>");
  o.push(`<pre><code>pnpm --filter @railing-dev/adapter-${esc(target.id)} run dev
pnpm railing run --target ${esc(target.id)} --component &lt;component&gt; \\
  --base-url http://localhost:${port} --repeat 3</code></pre>`);

  o.push("<h2>Where we might be wrong</h2>");
  o.push("<p>The most likely cause of a wrong result is our adapter, not your library.</p>");
  o.push(
    target.adapterCorrections
      ? `<div class="banner field"><p>It has already happened to you. ${esc(target.adapterCorrections)}</p></div>`
      : "<p>We have got this wrong repeatedly. One library's first run scored 27% and almost all of it was a selector of ours. Another was reported as having a broken focus trap when the trap worked and our test was reading focus too early.</p>",
  );
  o.push("<p>So the adapter source is included below. Please tell us if we mounted your component in a way you would not recommend, or if a check misreads the specification. We will correct it and, if it has already been published, correct that too.</p>");

  o.push("<h2>Where to check us</h2>");
  o.push("<ul class=\"clean\">");
  o.push(`<li><strong><a href="${SITE}/method">How the measurement works</a></strong>, including why the runner never learns which library it is testing.</li>`);
  o.push(`<li><strong><a href="${SITE}/scoring">How scoring works</a></strong>, with every weighting and what is deliberately left out.</li>`);
  o.push(`<li><strong><a href="${SITE}/disclosure">Our disclosure policy</a></strong>, covering notice, right of reply, and conflicts of interest.</li>`);
  o.push(`<li><strong><a href="${SITE}/decisions">The decision log</a></strong>, which is largely a record of results we got wrong and corrected.</li>`);
  o.push(`<li><strong><a href="${REPO}">The source</a></strong>. Every adapter, spec and score, and the code that produced this report.</li>`);
  o.push("</ul>");
  o.push("<h2>What happens next</h2><ul class=\"clean\">");
  o.push("<li>You have <strong>fourteen days</strong> before anything about this library is published.</li>");
  o.push("<li>If you reply, your response is published beside the score, in full and unedited.</li>");
  o.push("<li><strong>If you ship a fix in that window, we publish the fixed score.</strong> A finding that gets fixed before publication is the best outcome this project has, not a story we lost.</li>");
  o.push("<li>If fourteen days is not enough for your release process, ask for more and you will get it.</li></ul>");

  const sources = adapterSource(target.id);
  if (sources.length) {
    o.push("<h2>The adapter we used</h2>");
    o.push("<p>This is the whole of the library-specific code. There is nothing else.</p>");
    for (const s of sources) {
      o.push(`<details><summary>${esc(s.name)}</summary><pre><code>${esc(s.code.trimEnd())}</code></pre></details>`);
    }
  }
  return page(`${target.name}: accessibility conformance results`, o.join("\n"));
}

/**
 * ", which come from three causes rather than twelve separate problems".
 *
 * A count on its own overstates the work. This is the first number a maintainer
 * reads, and it should not make the job look bigger than it is.
 */
function causeClause(target, results) {
  const failing = results.flatMap((r) =>
    r.assertions.filter((a) => a.status === "fail").map((a) => ({ ...a, component: r.component })),
  );
  const { groups } = groupByCause(target, failing);
  if (groups.length === 0) return "";
  const inGroups = groups.reduce((n, g) => n + g.findings.length, 0);
  const n = groups.length;
  // Its own sentence, and not another "of them": the clause before this one
  // already used that phrase to mean something else.
  const cause = n === 1 ? "a single underlying cause" : `${n} underlying causes`;
  return ` ${inGroups} share ${cause}, and the report groups them that way.`;
}

function covering(target, results) {
  const failing = results.reduce((n, r) => n + r.assertions.filter((a) => a.status === "fail").length, 0);
  return `Subject: Accessibility conformance results for ${target.name}, before we publish them

Hello,

This report contains accessibility conformance results from Railing, an open
source project that tests UI component libraries against the W3C ARIA Authoring
Practices Guide and publishes the results. ${target.name} is one of the
libraries measured.

${
  failing === 0
    ? `${target.name} passes every check. There is nothing to fix; this notice exists only because you should hear about a public score from us rather than come across it, and because you may still disagree with how we measured it.`
    : `We found ${failing} issue${failing === 1 ? "" : "s"}${concentration(results)}.${causeClause(target, results)} No score is on our index yet, and none will be for fourteen days.`
}

The attached report has every check, the specification clause behind it, and the
complete adapter source so you can see exactly how your components were mounted.
If we got something wrong, that is the likeliest explanation and we would rather
hear it now than publish it. ${failing > 0 ? "If you ship a fix before we publish, we publish the fixed score." : ""}

Happy to give you longer than fourteen days if that helps.

Thanks for your time, and for the library.
`;
}

let made = 0;
const written = [];
for (const target of targets) {
  if (target.status === "planned") continue;
  if (only && target.id !== only) continue;
  const results = byTarget.get(target.id);
  if (!results || results.length === 0) {
    console.log(`  ${target.name}: no results, skipped`);
    continue;
  }
  const dir = join(outRoot, target.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "report.md"), `${report(target, results)}\n`, "utf8");
  writeFileSync(join(dir, "covering-message.txt"), covering(target, results), "utf8");
  mkdirSync(htmlRoot, { recursive: true });
  copyFileSync(join(root, "web", "public", "fonts", "inter-latin-var.woff2"), join(htmlRoot, "inter-latin-var.woff2"));
  writeFileSync(join(htmlRoot, `${target.id}.html`), reportHtml(target, results), "utf8");
  written.push({ target, results });
  const failing = results.reduce((n, r) => n + r.assertions.filter((a) => a.status === "fail").length, 0);
  console.log(`  ${target.name.padEnd(16)} ${String(failing).padStart(2)} finding(s)  ->  notifications/${target.id}/`);
  made++;
}

if (written.length > 0) {
  const rows = written
    .sort((a, b) => {
      const f = (x) => x.results.reduce((n, r) => n + r.assertions.filter((a) => a.status === "fail").length, 0);
      return f(a) - f(b);
    })
    .map(({ target, results }) => {
      const f = results.reduce((n, r) => n + r.assertions.filter((a) => a.status === "fail").length, 0);
      const chip = f === 0
        ? '<span class="chip chip--pass"><span class="chip__dot"></span>none</span>'
        : `<span class="chip chip--fail"><span class="chip__dot"></span>${f}</span>`;
      return `<tr><th scope="row"><a href="./${target.id}.html">${esc(target.name)}</a></th><td>${chip}</td><td>${target.notifiedOn ? esc(target.notifiedOn) : "not yet"}</td></tr>`;
    })
    .join("\n");
  writeFileSync(
    join(htmlRoot, "index.html"),
    page(
      "Maintainer reports",
      `<p class="eyebrow">Private, unpublished</p>
<h1>Maintainer reports</h1>
<p class="lede">One report per library, to be sent before anything is published. Fewest findings first, because those are the easiest conversations to start with.</p>
<div class="tablewrap"><table><caption class="visually-hidden">Every measured library.</caption>
<thead><tr><th scope="col">Library</th><th scope="col">Findings</th><th scope="col">Notified</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<div class="banner banner--paper"><p class="note__t">Before sending</p><p>Record the date each one goes out in <code>targets.json</code> as <code>notifiedOn</code>. That date is what releases the results: the site generator and <code>pnpm restore:docs</code> both refuse to publish a library until it is set and fourteen days have passed.</p></div>`,
    ),
    "utf8",
  );
}

console.log("");
console.log(`  ${made} bundle(s) written to notifications/ (untracked)`);
console.log("  HTML in notifications/html/, open index.html");
console.log("  Record the date you send each one in targets.json as notifiedOn.");
console.log("");

# Playground

_Drafted 19 Aug 2026, out of the antd #58980 thread. The report survives scrutiny;
the sandbox creates belief. The playground makes the belief layer a permanent,
self-service part of railing.dev._

## The vision

A visitor to railing.dev/playground can pick a library, pick a pattern, get the
exact mount the score was measured on, walk the checks themselves with their own
keyboard, and come away with their own report. Temporary by default, exportable
by choice.

## Design decisions (settled)

1. **Temporary = the URL.** No accounts, no backend, no stored data. Run state
   lives compressed in the link. Close the tab and it is gone; copy the link and
   it is shared; export writes Markdown or JSON.
2. **"Your run" is never "our score."** Browser JavaScript cannot read the real
   accessibility tree, so playground checks approximate it from ARIA attributes
   and visibility heuristics. Official scores remain Playwright-measured with
   replayable traces. Every playground page and every export carries one
   sentence: _self-run companion check, approximated in-browser; official scores
   are trace-backed._ This sentence is not optional and not removable.
3. **The disclosure gate extends to the picker.** A library appears in the
   playground only once `releasable()` (web/lib/data.ts) passes for it. The
   playground must never become a machine for reproducing findings whose
   maintainers have not had their fourteen days. Same function, same tests, no
   parallel logic.
4. **Mounts are the adapters, verbatim.** The playground never invents its own
   mount. If the adapter changes, the playground page changes with it. One
   source of truth for "how we mounted it."
5. **Credit what passes.** Walkthrough steps are colour-coded pass/fail/neutral
   (proven format: notifications/antd/repro-sandbox-App.tsx). Green rows are as
   prominent as red ones. The instrument measures; it does not campaign.

## Phase A — observation playground (NOW)

Pick library (released only) → pick pattern → exact mount + colour-coded
keyboard walkthrough + live DOM readout rows (150ms read-only poll).

- Route: railing.dev/playground, one page per target × component.
- Mount delivery: each adapter harness built as a static bundle, loaded in a
  same-origin iframe; the readout overlay lives in the parent page and polls the
  iframe document. Exact adapter reuse, no library code bundled into the site.
- Launch page: radix (releasable 19 Aug, all-pass) — the playground debuts as a
  measurement instrument showing green, not a wall of shame.
- Targets appear automatically as their clocks end (23 Aug, 27 Aug).

## Phase B — guided check-runner + report builder

_B.1 landed 19 Aug, same day as Phase A: the editable pane. Each detail page
carries a Sandpack editor seeded with the harness source (workspace imports
rewritten to a shim generated from @railing-dev/spec at build time) and the
library pinned at the scored version. Stated on-page: it runs on CodeSandbox's
bundler and is an experiment space, not the measurement. Remaining B items
below._

The page runs the checks on the visitor: "press Down Arrow now" → observes the
DOM → marks the check pass/fail live, check by check, until the visitor has
personally executed the audit.

- Per-check in-browser "observe" variants of the spec assertions (attribute
  checks are direct reads; interaction checks are guided user actions with
  observed outcomes).
- Report builder: assembles the run (checks, outcomes, evidence strings,
  library + version, timestamp) into a shareable URL-state report; export as
  Markdown / JSON with the self-run disclaimer baked in.
- Why it matters: any developer filing an a11y issue against any library can
  paste a Railing-formatted, check-cited report. Every one is a Railing artifact
  in someone else's repo. The antd-thread effect, replicated by strangers.

## Phase C — the horizon (not now)

- Version picker: load other library versions via CDN (esm.sh) and re-run.
- Bring-your-own-component: paste or point at your own component and walk the
  same APG checks against it. This is the step that turns the playground from
  "check their libraries" into "check MY code," and the reason phases A and B
  should keep the check-runner clean of library-specific assumptions.

## Non-goals

- No scoring in the browser. Scores come from the runner, with traces, or not
  at all.
- No findings for gated targets, ever, through any playground path.
- No accounts, no tracking, no stored user data.

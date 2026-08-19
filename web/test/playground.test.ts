/**
 * The playground obeys the publication gate.
 *
 * Decision 004 reaches the playground through playgroundParams and nothing
 * else: pages exist only for released, mount-ready targets with an applicable
 * run. A playground page for a withheld library would publish its findings
 * interactively, which is the same breach as publishing the score.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { playgroundParams, PATTERNS, MOUNT_READY, PLAYGROUND_DISCLAIMER } from "../lib/playground.js";

const run = (statuses: string[]) => ({ assertions: statuses.map((s) => ({ status: s })) });

const site = (releasedIds: string[], resultEntries: Array<[string, string, string[]]>) => {
  const results = new Map<string, Map<string, { assertions: Array<{ status: string }> }>>();
  for (const [t, c, statuses] of resultEntries) {
    if (!results.has(t)) results.set(t, new Map());
    results.get(t)!.set(c, run(statuses));
  }
  return { released: releasedIds.map((id) => ({ id })), results };
};

test("a withheld library has no playground page", () => {
  const s = site([], [["radix", "menu", ["pass"]]]);
  assert.deepEqual(playgroundParams(s), []);
});

test("a released, mount-ready library gets pages for its applicable components", () => {
  const s = site(
    ["radix"],
    [
      ["radix", "menu", ["pass", "pass"]],
      ["radix", "dialog", ["pass"]],
    ],
  );
  assert.deepEqual(
    playgroundParams(s).sort((a, b) => a.component.localeCompare(b.component)),
    [
      { target: "radix", component: "dialog" },
      { target: "radix", component: "menu" },
    ],
  );
});

test("a not-applicable component has no page", () => {
  const s = site(["radix"], [["radix", "combobox", ["not-applicable", "not-applicable"]]]);
  assert.deepEqual(playgroundParams(s), []);
});

test("a released library without a mount bundle has no page", () => {
  const s = site(["mui"], [["mui", "menu", ["pass"]]]);
  assert.deepEqual(playgroundParams(s), []);
});

test("a component without a pattern definition has no page", () => {
  const s = site(["radix"], [["radix", "carousel", ["pass"]]]);
  assert.deepEqual(playgroundParams(s), []);
});

test("every mount-ready target is a real adapter id", () => {
  // Guards against a typo shipping pages with empty iframes.
  for (const id of MOUNT_READY) {
    assert.match(id, /^[a-z-]+$/);
  }
});

test("every pattern has steps and readout rows", () => {
  for (const [id, p] of Object.entries(PATTERNS)) {
    assert.ok(p.steps.length > 0, `${id} has steps`);
    assert.ok(p.rows.length > 0, `${id} has rows`);
    for (const row of p.rows) {
      assert.ok(row.label && row.expected, `${id} row is labelled`);
    }
  }
});

test("the self-run disclaimer says what it must", () => {
  assert.match(PLAYGROUND_DISCLAIMER, /approximated in-browser/);
  assert.match(PLAYGROUND_DISCLAIMER, /Playwright traces/);
});

test("example styling is cosmetic and selected on semantics only", async () => {
  const { POLISH_CSS } = await import("../lib/polish.js");
  // Cosmetic only: the sheet must never hide content or suppress events —
  // either would change what the walkthrough observes.
  assert.doesNotMatch(POLISH_CSS, /display:\s*none/);
  assert.doesNotMatch(POLISH_CSS, /visibility:\s*hidden/);
  assert.doesNotMatch(POLISH_CSS, /pointer-events/);
  // And selected on what the library announced, never on harness plumbing.
  assert.doesNotMatch(POLISH_CSS, /data-testid/);
  // No class selectors: a class is library-internal, not announced semantics.
  assert.doesNotMatch(POLISH_CSS, /\n\.[a-zA-Z]/);
});

/**
 * The publication gate.
 *
 * Decision 004: nobody learns about a finding from a public page. This is the
 * single rule the project cannot recover from breaking, so it is tested
 * directly rather than left to the build to get right.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { releasable, NOTICE_DAYS, type Target } from "../lib/data.js";

const target = (notifiedOn: string | null): Target => ({
  id: "x",
  name: "X",
  role: "subject",
  status: "published",
  notifiedOn,
});

const NOW = Date.parse("2026-08-04T00:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

test("a library nobody has been told about is never releasable", () => {
  const verdict = releasable(target(null), NOW);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /not been notified/);
});

test("the day the maintainer is notified is not the day we publish", () => {
  assert.equal(releasable(target(daysAgo(0)), NOW).ok, false);
});

test("thirteen days is not fourteen", () => {
  const verdict = releasable(target(daysAgo(NOTICE_DAYS - 1)), NOW);
  assert.equal(verdict.ok, false);
  assert.match(verdict.reason, /13 of 14/);
});

test("fourteen days releases it", () => {
  assert.equal(releasable(target(daysAgo(NOTICE_DAYS)), NOW).ok, true);
});

test("a date in the future does not release it", () => {
  // A typo in targets.json must fail closed, never open.
  assert.equal(releasable(target(daysAgo(-30)), NOW).ok, false);
});

test("an unparseable date does not release it", () => {
  assert.equal(releasable(target("not a date"), NOW).ok, false);
});

test("exactly the expected libraries are releasable right now", async () => {
  // A standing assertion about real data: when this fails, either a clock
  // genuinely ran out (add the library here, deliberately, as part of its
  // release) or something set a date that should not have been set.
  //
  // Every window has closed: Radix 19 Aug, Headless UI, Chakra, MUI and React
  // Spectrum 23 Aug, Ant Design 27 Aug, shadcn/ui 2 Sept 2026. All seven were
  // released together on 5 Sept 2026.
  const expected = [
    "React Spectrum",
    "Radix UI",
    "shadcn/ui",
    "MUI",
    "Chakra UI",
    "Ant Design",
    "Headless UI",
  ];
  const { loadTargets } = await import("../lib/data.js");
  const targets = await loadTargets();
  const open = targets.filter((t) => releasable(t).ok).map((t) => t.name);
  assert.deepEqual(open.sort(), expected.sort(), `releasable now: ${open.join(", ")}`);
});

test("a component the registry marks unverified is held back whatever is on disk", async () => {
  // shadcn/ui's combobox is measured and its file may well be present locally,
  // but targets.json says its pattern match is unsettled. The loader, not the
  // checkout, decides.
  const { loadTargets, loadResults } = await import("../lib/data.js");
  const targets = await loadTargets();
  const results = await loadResults();
  for (const t of targets) {
    for (const component of Object.keys(t.unverified ?? {})) {
      assert.equal(
        results.get(t.id)?.has(component) ?? false,
        false,
        `${t.name} ${component} is marked unverified but loaded`,
      );
    }
  }
  const shadcn = targets.find((t) => t.id === "shadcn");
  assert.ok(shadcn?.unverified?.combobox, "the fixture this test relies on has changed; re-check it");
});

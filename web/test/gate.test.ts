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
  // Radix UI: notified 5 Aug 2026, fourteen-day window ended 19 Aug 2026.
  // Next clocks: headlessui, chakra, mui, react-spectrum on 23 Aug; antd on
  // 27 Aug; shadcn has not been notified.
  const expected = ["Radix UI"];
  const { loadTargets } = await import("../lib/data.js");
  const targets = await loadTargets();
  const open = targets.filter((t) => releasable(t).ok).map((t) => t.name);
  assert.deepEqual(open.sort(), expected.sort(), `releasable now: ${open.join(", ")}`);
});

#!/usr/bin/env node
/**
 * Writes the machine-readable half of the site into public/ before the build.
 *
 *   api/index.json              every released library and component
 *   api/results/<t>.<c>.json    the raw run, exactly as the runner wrote it
 *   api/badge/<t>/<c>.json      a shields.io endpoint
 *
 * Static export has no route handlers, so these are files. That is the right
 * shape anyway: a score anybody can fetch, diff and recompute is the whole
 * argument for trusting the index.
 *
 * The gate is applied here as well as in the pages. A result reachable at a
 * URL is published, whatever the page above it says.
 */

import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const out = join(here, "..", "public", "api");

const NOTICE_DAYS = 14;

function releasable(target) {
  if (!target.notifiedOn) return false;
  const notified = Date.parse(target.notifiedOn);
  if (Number.isNaN(notified)) return false;
  return (Date.now() - notified) / 86_400_000 >= NOTICE_DAYS;
}

const WEIGHT = { blocker: 10, serious: 5, moderate: 2, minor: 1 };

function score(assertions) {
  let got = 0;
  let total = 0;
  let fail = 0;
  let blockersFailed = 0;
  let na = 0;
  for (const a of assertions) {
    if (a.status === "not-applicable") { na += 1; continue; }
    if (a.status !== "pass" && a.status !== "fail") continue;
    total += WEIGHT[a.severity] ?? 1;
    if (a.status === "pass") got += WEIGHT[a.severity] ?? 1;
    else {
      fail += 1;
      if (a.severity === "blocker") blockersFailed += 1;
    }
  }
  return {
    value: total === 0 ? null : (got / total) * 100,
    passed: assertions.filter((a) => a.status === "pass").length,
    failed: fail,
    notApplicable: na,
    blockersFailed,
  };
}

await rm(out, { recursive: true, force: true });
await mkdir(join(out, "results"), { recursive: true });
await mkdir(join(out, "badge"), { recursive: true });
await mkdir(join(out, "traces"), { recursive: true });

const targets = JSON.parse(await readFile(join(root, "targets.json"), "utf8")).targets;
const resultsDir = join(root, "results");
const runs = [];

if (existsSync(resultsDir)) {
  for (const file of (await readdir(resultsDir)).filter((f) => f.endsWith(".json"))) {
    const run = JSON.parse(await readFile(join(resultsDir, file), "utf8"));
    // notify-notes.json (private report narratives) lives here too; anything
    // without a target is not a run.
    if (!run?.target?.id) continue;
    if (run.target.id === "_fixture-broken") continue;
    if (run.harnessError) continue;
    if (run.assertions.some((a) => a.status === "error")) continue;
    runs.push(run);
  }
}

const index = { generated: new Date().toISOString().slice(0, 10), targets: [] };
let files = 0;
let withheld = 0;

for (const target of targets) {
  const mine = runs.filter((r) => r.target.id === target.id);
  if (mine.length === 0) continue;
  if (!releasable(target) || target.status !== "published") {
    withheld += mine.length;
    continue;
  }

  const components = [];
  for (const run of mine) {
    const s = score(run.assertions);
    await writeFile(
      join(out, "results", `${target.id}.${run.component}.json`),
      `${JSON.stringify(run, null, 2)}\n`,
      "utf8",
    );
    // The replayable trace ships beside the result it replays, and only once
    // the result itself is released. Same artefact, same gate.
    if (run.trace) {
      const src = join(resultsDir, run.trace);
      if (existsSync(src)) {
        await copyFile(src, join(out, "traces", `${target.id}.${run.component}.zip`));
        files += 1;
      }
    }
    await mkdir(join(out, "badge", target.id), { recursive: true });
    const shown = s.value === null ? "n/a" : `${Math.floor(s.value)}%`;
    await writeFile(
      join(out, "badge", target.id, `${run.component}.json`),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          label: `a11y ${run.component}`,
          message: shown,
          // A green badge over a failed blocker would be a lie in a README.
          color: s.value === null ? "lightgrey" : s.blockersFailed > 0 || s.failed > 0 ? "red" : "brightgreen",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    files += 2;
    components.push({
      component: run.component,
      score: s.value,
      blockersFailed: s.blockersFailed,
      passed: s.passed,
      failed: s.failed,
      notApplicable: s.notApplicable,
      versions: run.target.versions,
      result: `api/results/${target.id}.${run.component}.json`,
      badge: `api/badge/${target.id}/${run.component}.json`,
    });
  }

  index.targets.push({ id: target.id, name: target.name, status: target.status, role: target.role, components });
}

await writeFile(join(out, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(`  api/index.json written, ${index.targets.length} released target(s), ${files} file(s)`);
if (withheld > 0) console.log(`  ${withheld} run(s) withheld pending maintainer notice`);

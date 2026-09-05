/**
 * Reads results and targets at build time, and decides what may be published.
 *
 * Three rules are enforced here rather than trusted to whoever runs the build,
 * because they are easier to keep in code than in a reviewer's head:
 *
 *  1. Nothing about a library is published until its maintainer has been
 *     notified and fourteen days have passed. Decision 004.
 *  2. A run that is not publishable, meaning a harness error or any errored
 *     assertion, is skipped entirely and reported to stdout.
 *  3. A target whose status is not `published` never appears in the index.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isPublishable, scoreRun, type RunResult } from "@railing-dev/report";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Days a maintainer has with their results before anything is published. */
export const NOTICE_DAYS = 14;

export const CEILING =
  "A high score means no violations were detected by automated testing. It does not mean the " +
  "component is accessible. Automated tests cannot judge whether a label is meaningful, whether " +
  "a reading order makes sense, or whether the experience is usable with a screen reader. Those " +
  "need human judgement and disabled users. This is a floor, not a ceiling.";

export const COMPONENT_ORDER = ["dialog", "combobox", "menu", "tabs", "accordion"];

export interface Target {
  id: string;
  name: string;
  vendor?: string;
  homepage?: string;
  role: string;
  status: string;
  notes?: string;
  /** ISO date the maintainer received their results privately, or null. */
  notifiedOn?: string | null;
  /** Components measured but not confirmed by hand, keyed by component id. */
  unverified?: Record<string, string>;
  /** Where the maintainer received their findings, and what they said on the record. */
  disclosure?: Disclosure;
}

/**
 * The public record of one library's notice period. Decision 004 promises that a
 * maintainer's reply is published beside the score in full, so this is data, not
 * prose: each reply is quoted verbatim with its author, date and permalink.
 */
export interface Disclosure {
  /** The issue or discussion where the findings were delivered. */
  url: string;
  /** Verbatim maintainer replies inside the window, oldest first. Empty means silence. */
  replies: DisclosureReply[];
  /** Anything else on the record that is not a reply: a conversion, a closure, a fix PR. */
  note?: string;
}

export interface DisclosureReply {
  date: string;
  by: string;
  url: string;
  text: string;
}

export interface Release {
  ok: boolean;
  reason: string;
}

/**
 * May this library's results go on the site yet?
 *
 * The cost of getting this wrong is the one thing the project cannot buy back,
 * so it is a pure function of the recorded date and is tested directly.
 */
export function releasable(target: Target, now = Date.now()): Release {
  if (!target.notifiedOn) return { ok: false, reason: "maintainer has not been notified" };

  const notified = Date.parse(target.notifiedOn);
  // A date we cannot read must fail closed. Every numeric comparison against
  // NaN is false, so without this an unreadable date would fall past the
  // window check and publish the library.
  if (Number.isNaN(notified)) {
    return { ok: false, reason: `notifiedOn "${target.notifiedOn}" is not a date` };
  }

  const days = (now - notified) / 86_400_000;
  if (!(days >= NOTICE_DAYS)) {
    return { ok: false, reason: `notified ${Math.floor(days)} of ${NOTICE_DAYS} days ago` };
  }
  return { ok: true, reason: "" };
}

export async function loadTargets(): Promise<Target[]> {
  const raw = await readFile(join(ROOT, "targets.json"), "utf8");
  return (JSON.parse(raw) as { targets: Target[] }).targets;
}

export async function loadDoc(name: string): Promise<string> {
  return readFile(join(ROOT, "docs", name), "utf8");
}

/** Every publishable run, keyed by target then component. */
export async function loadResults(): Promise<Map<string, Map<string, RunResult>>> {
  const dir = join(ROOT, "results");
  const byTarget = new Map<string, Map<string, RunResult>>();
  if (!existsSync(dir)) return byTarget;

  // A component the registry marks unverified is held back whatever is on disk,
  // so the gate does not depend on which result files happen to be checked out.
  const held = new Map<string, Set<string>>();
  for (const t of await loadTargets()) {
    if (t.unverified) held.set(t.id, new Set(Object.keys(t.unverified)));
  }

  const skipped: string[] = [];
  for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
    const result = JSON.parse(await readFile(join(dir, file), "utf8")) as RunResult;
    // Not every JSON in results/ is a run: notify-notes.json holds the private
    // report narratives. Anything without a target is not a result.
    if (!result?.target?.id) continue;
    // The fixture exists to test the runner. It is never a library.
    if (result.target.id === "_fixture-broken") continue;
    const verdict = isPublishable(result);
    if (!verdict.ok) {
      skipped.push(`${file}: ${verdict.reason}`);
      continue;
    }
    if (held.get(result.target.id)?.has(result.component)) {
      skipped.push(`${file}: marked unverified in targets.json`);
      continue;
    }
    if (!byTarget.has(result.target.id)) byTarget.set(result.target.id, new Map());
    byTarget.get(result.target.id)!.set(result.component, result);
  }
  if (skipped.length > 0) {
    console.log("\n  Skipped as not publishable:");
    for (const s of skipped) console.log(`    ${s}`);
  }
  return byTarget;
}

export interface SiteData {
  targets: Target[];
  /** Targets whose results may be shown. */
  released: Target[];
  /** Measured, but withheld pending maintainer notice. A registry fact. */
  withheld: Array<Target & { reason: string }>;
  results: Map<string, Map<string, RunResult>>;
}

export async function loadSite(): Promise<SiteData> {
  const targets = await loadTargets();
  const results = await loadResults();
  const released = targets.filter((t) => t.status === "published" && releasable(t).ok);
  const withheld = targets
    .filter((t) => t.status !== "planned" && !releasable(t).ok)
    .map((t) => ({ ...t, reason: releasable(t).reason }));
  return { targets, released, withheld, results };
}

export { scoreRun };
export type { RunResult };

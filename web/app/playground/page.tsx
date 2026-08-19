import type { Metadata } from "next";
import Link from "next/link";
import { loadSite, NOTICE_DAYS } from "@/lib/data";
import { playgroundParams, PATTERNS, PLAYGROUND_DISCLAIMER } from "@/lib/playground";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Walk the accessibility checks yourself: the exact mount each score was measured on, your keyboard, and a live readout of what assistive technology is told.",
};

/**
 * The playground index.
 *
 * Reports survive scrutiny; a component under your own fingers creates belief.
 * Each page here is the exact mount the score was measured on, a keyboard
 * walkthrough, and a live readout of the DOM. The publication gate applies in
 * full: a library appears here when its results are released, and not before.
 */
export default async function Playground() {
  const site = await loadSite();
  const params = playgroundParams(site);
  const byTarget = new Map<string, string[]>();
  for (const p of params) {
    if (!byTarget.has(p.target)) byTarget.set(p.target, []);
    byTarget.get(p.target)!.push(p.component);
  }

  return (
    <>
      <div className="pagehead">
        <p className="eyebrow eyebrow--ink">Playground</p>
        <h1>Try the measurement yourself</h1>
        <p className="lede">
          The exact mount each score was measured on, your keyboard, and a live readout of what the
          DOM tells assistive technology. No devtools needed.
        </p>
      </div>

      {byTarget.size === 0 ? (
        <div className="note">
          <p className="note__t">Why there is nothing to try yet</p>
          <p>
            Playground pages follow the same rule as scores: every maintainer gets their results
            privately, {NOTICE_DAYS} days before anything is published. A library appears here when
            its results are released, and not before.
          </p>
        </div>
      ) : (
        [...byTarget.entries()].map(([target, components]) => {
          const t = site.targets.find((x) => x.id === target);
          return (
            <section key={target} style={{ marginTop: 28 }}>
              <h2>{t?.name ?? target}</h2>
              <ul className="pg-list">
                {components.map((c) => (
                  <li key={c}>
                    <Link href={`/playground/${target}/${c}/`}>
                      {PATTERNS[c]?.title ?? c}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <p className="pg-disclaimer" style={{ marginTop: 36 }}>
        {PLAYGROUND_DISCLAIMER}
      </p>
    </>
  );
}
